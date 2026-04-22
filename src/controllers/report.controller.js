import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { sendDisasterAlert } from "../service/notificationService.js";
import { validateFloodReport } from "../service/floodValidationService.js";
import prisma from "../constants/prisma.js";

async function broadcastAlert(report, type) {
    try {
        // Fetch all tokens
        const allTokens = await prisma.fcmToken.findMany({ 
            select: { token: true } 
        });

        if (allTokens.length > 0) {
            const alertTitle = `🚨 NEW REPORT: ${type}`;
            const alertBody = `${report.user.name} reported a ${type} at ${report.locationName}.`;

            // Fire all alerts in parallel
            const alertPromises = allTokens.map(t => 
                sendDisasterAlert(t.token, alertTitle, alertBody)
            );
            
            await Promise.all(alertPromises);
            console.log(`--- Test Alerts sent successfully to ${allTokens.length} devices ---`);
        }
    } catch (error) {
        console.error("Broadcast background error:", error.message);
    }
}

const createReport = asyncHandler(async (req, res) => {
    const { title, description, type, latitude, longitude, locationName } = req.body;

    // 1. Validation
    if ([title, description, type].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "Title, description, and disaster type are required");
    }

    if (latitude === undefined || longitude === undefined) {
        throw new ApiError(400, "Latitude and longitude coordinates are required");
    }

    // 2. Create the report in DB
    const report = await prisma.report.create({
        data: {
            title,
            description,
            type,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            locationName: locationName || "Unknown Location",
            userId: req.user.id,
        },
        include: {
            user: { select: { name: true, email: true } }
        }
    });

    // 3. TRIGGER IMMEDIATE BROADCAST (Testing Phase)
    // We do NOT use 'await' here because we want the response to be sent to the user 
    // immediately while the alerts happen in the background.
    broadcastAlert(report, type);

    // 4. Trigger Background Validation
    const isFlood = type && type.toString().toUpperCase().includes("FLOOD");
    if (isFlood) {
        validateFloodReport(report.id).catch((err) => {
            console.error("Validation Service Error:", err.message);
        });
    }

    // 5. Return response immediately
    return res
        .status(201)
        .json(new ApiResponse(201, report, "Report submitted and alerts are being broadcasted."));
});

const getReports = asyncHandler(async (req, res) => {
    const reports = await prisma.report.findMany({
        where: { userId: req.user.id },
        include: { validationResult: true },
        orderBy: { createdAt: 'desc' }
    });

    return res
        .status(200)
        .json(new ApiResponse(200, reports, "User's reports retrieved successfully"));
});

const getAllReports = asyncHandler(async (req, res) => {
    const userId = req.user?.id;

    const reports = await prisma.report.findMany({
        include: {
            user: { select: { name: true, role: true } },
            validationResult: true,
            votes: userId ? {
                where: { userId: userId },
                select: { value: true }
            } : false
        },
        orderBy: { createdAt: 'desc' }
    });

    // Background validation for legacy reports
    reports.forEach((report) => {
        if (report.type === "FLOOD" && !report.validationResult) {
            validateFloodReport(report.id).catch(() => { });
        }
    });

    const reportsWithUserVote = reports.map(report => {
        // Flatten user vote
        const userVoteValue = report.votes?.[0]?.value || 0;
        const { votes, ...rest } = report;

        return {
            ...rest,
            userVote: userVoteValue,
            // Sanitize counts so frontend never sees negative numbers
            upvotesCount: Math.max(0, report.upvotesCount || 0),
            downvotesCount: Math.max(0, report.downvotesCount || 0)
        };
    });

    return res.status(200).json(
        new ApiResponse(200, reportsWithUserVote, "All reports retrieved")
    );
});

const updateReport = asyncHandler(async (req, res) => {
    if (!req.body) {
        throw new ApiError(400, "Request body is missing");
    }

    // 1. Extract report ID from URL and data from body
    const { reportId } = req.params;
    const { title, description, type, latitude, longitude, locationName } = req.body;

    // 2. Find the existing report first to check ownership
    const existingReport = await prisma.report.findUnique({
        where: { id: reportId }
    });

    if (!existingReport) {
        throw new ApiError(404, "Report not found");
    }

    // 3. Authorization Check: Only the creator (or an Admin) can edit the report
    if (existingReport.userId !== req.user.id && req.user.role !== "ADMIN") {
        throw new ApiError(403, "You do not have permission to update this report");
    }

    // 4. Prepare Dynamic Update Object
    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (type) updateData.type = type; // DisasterType Enum
    if (locationName) updateData.locationName = locationName;

    // Handle coordinates separately to ensure they are Floats
    if (latitude !== undefined) updateData.latitude = parseFloat(latitude);
    if (longitude !== undefined) updateData.longitude = parseFloat(longitude);

    // 5. Update in Database
    const updatedReport = await prisma.report.update({
        where: { id: reportId },
        data: updateData,
        include: {
            user: {
                select: {
                    name: true,
                    email: true
                }
            }
        }
    });

    return res
        .status(200)
        .json(new ApiResponse(200, updatedReport, "Report updated successfully"));
});

const deleteReport = asyncHandler(async (req, res) => {
    // 1. Extract the reportId from the URL params
    const { reportId } = req.params;

    // 2. Find the report to check ownership
    const report = await prisma.report.findUnique({
        where: { id: reportId }
    });

    // 3. Check if report exists
    if (!report) {
        throw new ApiError(404, "Report not found");
    }

    // 4. Authorization: Only the owner or an Admin can delete
    // Note: req.user.id and req.user.role come from your verifyJWT middleware
    if (report.userId !== req.user.id && req.user.role !== "ADMIN") {
        throw new ApiError(403, "You do not have permission to delete this report");
    }

    // 5. Delete the report
    // Because of your 'onDelete: Cascade' in Prisma, 
    // this will also remove associated comments/votes if configured.
    await prisma.report.delete({
        where: { id: reportId }
    });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Report deleted successfully"));
});

const addResource = asyncHandler(async (req, res) => {
    // 1. Authorization: Only NGOs can manage inventory
    if (req.user.role !== "NGO") {
        throw new ApiError(403, "Access denied. Only NGOs can populate resources.");
    }

    // 2. Destructure fields from body
    const { category, itemName, quantity, unit, description } = req.body;

    // 3. Validation: Mandatory fields
    if (!category || !itemName || quantity === undefined) {
        throw new ApiError(400, "Category, Item Name, and Quantity are mandatory.");
    }

    // 4. Create Resource in Prisma
    // Note: unit and description are optional as per our schema
    const resource = await prisma.resource.create({
        data: {
            category,
            itemName,
            quantity: parseInt(quantity),
            unit: unit || "units",
            description: description || "units",
            owner: {
                connect: { id: req.user.id }
            } // Linking to the logged-in NGO
        },
        include: {
            owner: {
                select: {
                    name: true,
                    email: true
                }
            }
        }
    });

    // 5. Success Response
    return res
        .status(201)
        .json(new ApiResponse(201, resource, "Resource added to inventory successfully"));
});

const getMyResources = asyncHandler(async (req, res) => {
    const resources = await prisma.resource.findMany({
        where: { ownerId: req.user.id },
        orderBy: { createdAt: 'desc' }
    });

    return res
        .status(200)
        .json(new ApiResponse(200, resources, "NGO inventory retrieved"));
});

const updateResource = asyncHandler(async (req, res) => {
    const { resourceId } = req.params;
    const { category, itemName, quantity, unit, description } = req.body;

    // 1. Find the resource to check if it exists and who owns it
    const resource = await prisma.resource.findUnique({
        where: { id: resourceId }
    });

    if (!resource) {
        throw new ApiError(404, "Resource not found");
    }

    // 2. Authorization: Check if the logged-in user owns this resource
    if (resource.ownerId !== req.user.id) {
        throw new ApiError(403, "You do not have permission to update this resource");
    }

    // 3. Prepare data for update (Optional fields handling)
    const updateData = {};
    if (category) updateData.category = category;
    if (itemName) updateData.itemName = itemName;
    if (quantity !== undefined) updateData.quantity = parseInt(quantity);
    if (unit !== undefined) updateData.unit = unit;
    if (description !== undefined) updateData.description = description;

    // 4. Update in Database
    const updatedResource = await prisma.resource.update({
        where: { id: resourceId },
        data: updateData
    });

    return res
        .status(200)
        .json(new ApiResponse(200, updatedResource, "Resource updated successfully"));
});

const deleteResource = asyncHandler(async (req, res) => {
    const { resourceId } = req.params;

    // 1. Find the resource
    const resource = await prisma.resource.findUnique({
        where: { id: resourceId }
    });

    if (!resource) {
        throw new ApiError(404, "Resource not found");
    }

    // 2. Authorization: Only the owner can delete
    if (resource.ownerId !== req.user.id) {
        throw new ApiError(403, "You do not have permission to delete this resource");
    }

    // 3. Delete from DB
    await prisma.resource.delete({
        where: { id: resourceId }
    });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Resource removed from inventory"));
});

const toggleVote = asyncHandler(async (req, res) => {
    const { reportId } = req.params;
    const { value } = req.body; // 1 for Upvote, -1 for Downvote
    const userId = req.user.id;

    if (![1, -1].includes(value)) {
        throw new ApiError(400, "Vote value must be 1 or -1");
    }

    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new ApiError(404, "Report not found");

    const existingVote = await prisma.vote.findUnique({
        where: { userId_reportId: { userId, reportId } }
    });

    let message = "";
    let finalValue = value;

    await prisma.$transaction(async (tx) => {
        if (existingVote) {
            if (existingVote.value === value) {
                // --- SCENARIO A: UNDO VOTE ---
                await tx.vote.delete({ where: { id: existingVote.id } });

                await tx.report.update({
                    where: { id: reportId },
                    data: {
                        // Use atomic decrement: DB subtracts 1 from whatever the current value is
                        upvotesCount: value === 1 ? { decrement: 1 } : undefined,
                        downvotesCount: value === -1 ? { decrement: 1 } : undefined,
                    }
                });
                message = "Vote removed";
                finalValue = 0;
            } else {
                // --- SCENARIO B: SWITCH VOTE (e.g., Up to Down) ---
                await tx.vote.update({
                    where: { id: existingVote.id },
                    data: { value: value }
                });

                await tx.report.update({
                    where: { id: reportId },
                    data: {
                        // Moving TO Upvote: Increment Up, Decrement Down
                        upvotesCount: value === 1 ? { increment: 1 } : { decrement: 1 },
                        // Moving TO Downvote: Increment Down, Decrement Up
                        downvotesCount: value === -1 ? { increment: 1 } : { decrement: 1 },
                    }
                });
                message = "Vote switched";
            }
        } else {
            // --- SCENARIO C: NEW VOTE ---
            await tx.vote.create({ data: { userId, reportId, value } });

            await tx.report.update({
                where: { id: reportId },
                data: {
                    upvotesCount: value === 1 ? { increment: 1 } : undefined,
                    downvotesCount: value === -1 ? { increment: 1 } : undefined,
                }
            });
            message = "Vote recorded";
        }
    });

    // Trigger validation in the background
    if (report.type === "FLOOD") {
        validateFloodReport(reportId).catch((err) => console.error("Validation failed:", err.message));
    }

    return res.status(200).json(
        new ApiResponse(200, { currentVote: finalValue }, message)
    );
});

export {
    createReport, updateReport, deleteReport, getReports, getAllReports, addResource, getMyResources, updateResource, deleteResource, toggleVote
};