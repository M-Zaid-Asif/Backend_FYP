import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { validateFloodReport } from "../service/floodValidationService.js";
import prisma from "../constants/prisma.js";


const createReport = asyncHandler(async (req, res) => {
    const { title, description, type, latitude, longitude, locationName } = req.body;

    if ([title, description, type].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "Title, description, and disaster type are required");
    }

    if (latitude === undefined || longitude === undefined) {
        throw new ApiError(400, "Latitude and longitude coordinates are required");
    }

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

    console.log("--- DEBUG: Report Created ---");
    console.log("Log 1: ID:", report.id);

    // FIX 2: More robust type checking
    // This ensures that even if "type" is a strict Enum object, we catch it.
    const isFlood = type && type.toString().toUpperCase().includes("FLOOD");

    if (isFlood) {
        console.log("Log 2: Triggering Validation Service...");
        
        // Background process
        validateFloodReport(report.id).catch((err) => {
            console.error("CRITICAL: Background Service Failed to Start:", err.message);
        });
    } else {
        console.log("Log 2: Validation skipped. Type received was:", type);
    }

    return res
        .status(201)
        .json(new ApiResponse(201, report, "Disaster report submitted and validation initiated."));
});

const getAllReports = asyncHandler(async (req, res) => {
    // 1. Fetch all reports with their relations
    const reports = await prisma.report.findMany({
        include: {
            user: {
                select: {
                    name: true,
                    role: true
                }
            },
            // Ensure lowercase 'v' to match your schema.prisma
            validationResult: true 
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    // 2. RETROACTIVE FIX: 
    // Loop through existing reports. If a FLOOD report is missing its 
    // validation result (common for old reports), trigger the service now.
    reports.forEach((report) => {
        if (report.type === "FLOOD" && !report.validationResult) {
            console.log(`[System] Retro-validating legacy report: ${report.id}`);
            
            // Fire-and-forget: validate in background
            validateFloodReport(report.id).catch((err) => {
                console.error(`[System] Failed to retro-validate ${report.id}:`, err.message);
            });
        }
    });

    // 3. Return the reports
    // Note: The first time this runs, the validationResult might still be null in the response
    // but because your frontend polls every 5s, the NEXT call will have the data.
    return res
        .status(200)
        .json(new ApiResponse(200, reports, "All disaster reports retrieved successfully"));
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
    const { value } = req.body; // Expecting +1 or -1
    const userId = req.user.id;

    if (![1, -1].includes(value)) {
        throw new ApiError(400, "Vote value must be 1 (Upvote) or -1 (Downvote)");
    }

    const report = await prisma.report.findUnique({
        where: { id: reportId }
    });

    if (!report) {
        throw new ApiError(404, "Report not found");
    }

    const existingVote = await prisma.vote.findUnique({
        where: {
            userId_reportId: { userId, reportId }
        }
    });

    let message = "";
    let finalValue = value;

    // 1. Database Transaction to update vote counts
    await prisma.$transaction(async (tx) => {
        if (existingVote) {
            if (existingVote.value === value) {
                // SCENARIO A: Remove Vote
                await tx.vote.delete({ where: { id: existingVote.id } });
                await tx.report.update({
                    where: { id: reportId },
                    data: { votesCount: { decrement: value } }
                });
                message = "Vote removed successfully";
                finalValue = 0;
            } else {
                // SCENARIO B: Switch Vote (+1 to -1 or vice versa)
                await tx.vote.update({
                    where: { id: existingVote.id },
                    data: { value: value }
                });
                await tx.report.update({
                    where: { id: reportId },
                    data: { votesCount: { increment: value * 2 } }
                });
                message = "Vote updated successfully";
            }
        } else {
            // SCENARIO C: New Vote
            await tx.vote.create({
                data: { userId, reportId, value }
            });
            await tx.report.update({
                where: { id: reportId },
                data: { votesCount: { increment: value } }
            });
            message = "Vote recorded successfully";
        }
    });

    // 2. IMPACT TRIGGER: Re-calculate authenticity score
    // Since the score now depends 25% on community votes, we trigger validation.
    if (report.type === "FLOOD") {
        console.log(`[Trust Engine] Re-validating report ${reportId} due to community interaction.`);
        
        // Background task (no await)
        validateFloodReport(reportId).catch((err) => {
            console.error("Failed to re-validate report on vote:", err.message);
        });
    }

    return res.status(200).json(
        new ApiResponse(200, { currentVote: finalValue }, message)
    );
});

export {
    createReport, updateReport, deleteReport, getReports, getAllReports, addResource, getMyResources, updateResource, deleteResource, toggleVote
};