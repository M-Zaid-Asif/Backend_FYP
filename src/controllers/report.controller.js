import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { sendDisasterAlert } from "../service/notificationService.js";
import { validateFloodReport } from "../service/floodValidationService.js";
import prisma from "../constants/prisma.js";

// Function for Broadcasting Alerts.
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
        }
    } catch (error) {
        console.error("Broadcast background error:", error.message);
    }
}

// 1. Creating a Report
const createReport = asyncHandler(async (req, res) => {
    const { title, description, type, latitude, longitude, locationName } = req.body;

    // Report Validation
    if ([title, description, type].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "Title, description, and disaster type are required");
    }

    if (latitude === undefined || longitude === undefined) {
        throw new ApiError(400, "Latitude and longitude coordinates are required");
    }

    // Create the report in DB
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

    // Calling broadcastAlert Function
    // broadcastAlert(report, type);

    // Trigger Background Validation
    const typeUpper = type?.toString().toUpperCase() || "";
    const isFlood = typeUpper.includes("FLOOD");
    const isEarthquake = typeUpper.includes("EARTHQUAKE");

    if (isFlood) {
        validateFloodReport(report.id).catch((err) => {
            console.error("Flood Validation Error:", err.message);
        });
    } else if (isEarthquake) {
        validateFloodReport(report.id).catch((err) => {
            console.error("Earthquake Validation Error:", err.message);
        });
    }

    // 5. Return response immediately
    return res
        .status(201)
        .json(new ApiResponse(201, report, "Report submitted and alerts are being broadcasted."));
});

// 2. Get a Report
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

// 3. Get All Reports
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

    // Background validation for legacy/unvalidated reports
    reports.forEach((report) => {
        // 1. Handle Floods
        if (report.type === "FLOOD" && !report.validationResult) {
            validateFloodReport(report.id).catch(() => { });
        }

        // 2. Handle Earthquakes
        if (report.type === "EARTHQUAKE" && !report.validationResult) {
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
            upvotesCount: Math.max(0, report.upvotesCount || 0),
            downvotesCount: Math.max(0, report.downvotesCount || 0)
        };
    });

    return res.status(200).json(
        new ApiResponse(200, reportsWithUserVote, "All reports retrieved")
    );
});

// 4. Updating a Report
const updateReport = asyncHandler(async (req, res) => {
    if (!req.body) {
        throw new ApiError(400, "Request body is missing");
    }

    // Extract report ID from URL and data from body
    const { reportId } = req.params;
    const { title, description, type, latitude, longitude, locationName } = req.body;

    // Find the existing report first to check ownership
    const existingReport = await prisma.report.findUnique({
        where: { id: reportId }
    });

    if (!existingReport) {
        throw new ApiError(404, "Report not found");
    }

    // Authorization Check: Only the creator (or an Admin) can edit the report
    if (existingReport.userId !== req.user.id) {
        throw new ApiError(403, "You do not have permission to update this report");
    }

    // Prepare Dynamic Update Object
    const updateData = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (type) updateData.type = type; // DisasterType Enum
    if (locationName) updateData.locationName = locationName;

    // Handle coordinates separately to ensure they are Floats
    if (latitude !== undefined) updateData.latitude = parseFloat(latitude);
    if (longitude !== undefined) updateData.longitude = parseFloat(longitude);

    // Update in Database
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

// 5. Deleting a Report
const deleteReport = asyncHandler(async (req, res) => {
    // Extract the reportId from the URL params
    const { reportId } = req.params;

    // Find the report to check ownership
    const report = await prisma.report.findUnique({
        where: { id: reportId }
    });

    // Check if report exists
    if (!report) {
        throw new ApiError(404, "Report not found");
    }

    // Authorization: Only the owner or an Admin can delete
    // Note: req.user.id and req.user.role come from your verifyJWT middleware
    if (report.userId !== req.user.id) {
        throw new ApiError(403, "You do not have permission to delete this report");
    }

    // Delete the report
    // Because of our 'onDelete: Cascade' in Prisma, 
    // this will also remove associated comments/votes.
    await prisma.report.delete({
        where: { id: reportId }
    });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Report deleted successfully"));
});

// 6. Adding Resource
const addResource = asyncHandler(async (req, res) => {
    // Authorization: Only NGOs can manage inventory
    if (req.user.role !== "NGO") {
        throw new ApiError(403, "Access denied. Only NGOs can populate resources.");
    }

    // Destructure fields from body
    const { category, itemName, quantity, unit, description } = req.body;

    // Validation: Mandatory fields
    if (!category || !itemName || quantity === undefined) {
        throw new ApiError(400, "Category, Item Name, and Quantity are mandatory.");
    }

    // Create Resource in Prisma
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

    // Success Response
    return res
        .status(201)
        .json(new ApiResponse(201, resource, "Resource added to inventory successfully"));
});

// 7. NGO Resources Retrieval
const getMyResources = asyncHandler(async (req, res) => {
    const resources = await prisma.resource.findMany({
        where: { ownerId: req.user.id },
        orderBy: { createdAt: 'desc' }
    });

    return res
        .status(200)
        .json(new ApiResponse(200, resources, "NGO inventory retrieved"));
});

// 8. Updating Resources
const updateResource = asyncHandler(async (req, res) => {
    const { resourceId } = req.params;
    const { category, itemName, quantity, unit, description } = req.body;

    // Find the resource to check if it exists and who owns it
    const resource = await prisma.resource.findUnique({
        where: { id: resourceId }
    });

    if (!resource) {
        throw new ApiError(404, "Resource not found");
    }

    // Authorization: Check if the logged-in user owns this resource
    if (resource.ownerId !== req.user.id) {
        throw new ApiError(403, "You do not have permission to update this resource");
    }

    // Prepare data for update (Optional fields handling)
    const updateData = {};
    if (category) updateData.category = category;
    if (itemName) updateData.itemName = itemName;
    if (quantity !== undefined) updateData.quantity = parseInt(quantity);
    if (unit !== undefined) updateData.unit = unit;
    if (description !== undefined) updateData.description = description;

    // Update in Database
    const updatedResource = await prisma.resource.update({
        where: { id: resourceId },
        data: updateData
    });

    return res
        .status(200)
        .json(new ApiResponse(200, updatedResource, "Resource updated successfully"));
});

// 9. Deleting Resources
const deleteResource = asyncHandler(async (req, res) => {
    const { resourceId } = req.params;

    // Find the resource
    const resource = await prisma.resource.findUnique({
        where: { id: resourceId }
    });

    if (!resource) {
        throw new ApiError(404, "Resource not found");
    }

    // Authorization: Only the owner can delete
    if (resource.ownerId !== req.user.id) {
        throw new ApiError(403, "You do not have permission to delete this resource");
    }

    // Delete from DB
    await prisma.resource.delete({
        where: { id: resourceId }
    });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Resource removed from inventory"));
});

// 10. Outbound Dispatch Shipment Execution (Deduct Stock & Log Output)
const dispatchResource = asyncHandler(async (req, res) => {
    if (req.user.role !== "NGO") {
        throw new ApiError(403, "Access denied. Only NGOs can dispatch supplies.");
    }

    const { resourceId, quantitySent, dispatchedTo } = req.body;

    // Strict validation check
    if (!resourceId || !quantitySent || !dispatchedTo) {
        throw new ApiError(400, "Resource ID, Quantity Sent, and Destination parameters are required.");
    }

    const parseQty = parseInt(quantitySent);
    if (isNaN(parseQty) || parseQty <= 0) {
        throw new ApiError(400, "Dispatch quantity must be a valid positive integer number.");
    }

    // Execute inside an isolated transaction boundary to preserve stock balances safely
    const dispatchTransactionResult = await prisma.$transaction(async (tx) => {
        // Step A: Fetch base row to check availability and verify owner identity
        const existingResource = await tx.resource.findUnique({
            where: { id: resourceId }
        });

        if (!existingResource) {
            throw new ApiError(404, "Target resource asset not found in database registry.");
        }

        if (existingResource.ownerId !== req.user.id) {
            throw new ApiError(403, "Permission Denied. You do not own this warehouse inventory row.");
        }

        // Step B: Business Rule validation check
        if (existingResource.quantity < parseQty) {
            throw new ApiError(400, `Insufficient stock quantities. Allocation request failed. Available balance: ${existingResource.quantity} ${existingResource.unit}`);
        }

        // Step C: Update current warehouse inventory count balance
        const updatedResource = await tx.resource.update({
            where: { id: resourceId },
            data: {
                quantity: existingResource.quantity - parseQty
            }
        });

        // Step D: Append a permanent entry row inside the DispatchLog model history block
        const dispatchRecord = await tx.dispatchLog.create({
            data: {
                resourceId,
                quantitySent: parseQty,
                dispatchedTo
            }
        });

        return { updatedResource, dispatchRecord };
    });

    return res
        .status(200)
        .json(new ApiResponse(200, dispatchTransactionResult, "Resource supplies dispatched and logged successfully"));
});

// 11. Retrieve Complete Dispatch History Log (Filter by specific NGO Identity)
const getMyDispatchHistory = asyncHandler(async (req, res) => {
    if (req.user.role !== "NGO") {
        throw new ApiError(403, "Access denied.");
    }

    // Pull dispatch rows where the child resource belongs exclusively to the logged-in NGO user
    const auditLogs = await prisma.dispatchLog.findMany({
        where: {
            resource: {
                ownerId: req.user.id
            }
        },
        include: {
            resource: {
                select: {
                    itemName: true,
                    category: true,
                    unit: true
                }
            }
        },
        orderBy: {
            dispatchedAt: "desc" // Latest shipments render at the top
        }
    });

    return res
        .status(200)
        .json(new ApiResponse(200, auditLogs, "NGO outbound shipment history logs retrieved successfully"));
});

// 12. Toggle Vote
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
    const reportType = report.type.toUpperCase();

    if (reportType.includes("FLOOD")) {
        validateFloodReport(reportId).catch((err) =>
            console.error("Flood Validation failed:", err.message)
        );
    } else if (reportType.includes("EARTHQUAKE")) {
        validateFloodReport(reportId).catch((err) =>
            console.error("Earthquake Validation failed:", err.message)
        );
    }

    return res.status(200).json(
        new ApiResponse(200, { currentVote: finalValue }, message)
    );
});

export {
    createReport, updateReport, deleteReport, getReports, getAllReports, addResource, getMyResources, updateResource, deleteResource, toggleVote, getMyDispatchHistory, dispatchResource
};