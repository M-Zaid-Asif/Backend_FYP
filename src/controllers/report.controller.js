import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import prisma from "../constants/prisma.js";

const createReport = asyncHandler(async (req, res) => {
    // 1. Destructure from req.body
    const { title, description, type, latitude, longitude, locationName } = req.body;

    // 2. Validation
    if ([title, description, type].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "Title, description, and disaster type are required");
    }

    if (latitude === undefined || longitude === undefined) {
        throw new ApiError(400, "Latitude and longitude coordinates are required");
    }

    // 3. Create the Report in Prisma
    const report = await prisma.report.create({
        data: {
            title,
            description, // FLOOD AND EARTHQUAKE
            type, // Prisma handles the DisasterType ENUM automatically
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            locationName: locationName || "Unknown Location",
            userId: req.user.id, // Linking the report to the logged-in user
            // status defaults to PENDING, votesCount defaults to 0 as per your model
        },
        include: {
            user: {
                select: {
                    name: true,
                    email: true
                }
            }
        }
    });

    // 4. Send response
    return res
        .status(201)
        .json(new ApiResponse(201, report, "Disaster report submitted successfully"));
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



export { createReport, updateReport };