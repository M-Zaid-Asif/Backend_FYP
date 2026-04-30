import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import prisma from "../constants/prisma.js";

// 1. Add a Comment
const addComment = asyncHandler(async (req, res) => {
    const { reportId } = req.params;
    const { content } = req.body;

    if (!content || content.trim() === "") {
        throw new ApiError(400, "Comment content cannot be empty");
    }

    // Check if report exists
    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new ApiError(404, "Report not found");

    const comment = await prisma.comment.create({
        data: {
            content,
            userId: req.user.id,
            reportId: reportId
        },
        include: {
            user: {
                select: { name: true, role: true }
            }
        }
    });

    return res.status(201).json(
        new ApiResponse(201, comment, "Comment added successfully")
    );
});

// 2. Get all comments for a specific report
const getReportComments = asyncHandler(async (req, res) => {
    const { reportId } = req.params;

    const comments = await prisma.comment.findMany({
        where: { reportId },
        include: {
            user: {
                select: { name: true, role: true }
            }
        },
        orderBy: { postedAt: "desc" } // Show newest comments first
    });

    return res.status(200).json(
        new ApiResponse(200, comments, "Comments retrieved successfully")
    );
});

// 3. Delete a Comment
const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    const comment = await prisma.comment.findUnique({
        where: { id: commentId }
    });

    if (!comment) throw new ApiError(404, "Comment not found");

    // Authorization: Only the owner of the comment can delete it
    if (comment.userId !== req.user.id) {
        throw new ApiError(403, "You are not authorized to delete this comment");
    }

    await prisma.comment.delete({
        where: { id: commentId }
    });

    return res.status(200).json(
        new ApiResponse(200, {}, "Comment deleted successfully")
    );
});

// 4. Update a Comment
const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;

    if (!content || content.trim() === "") {
        throw new ApiError(400, "Comment content cannot be empty");
    }

    // Find the comment first to check ownership
    const comment = await prisma.comment.findUnique({
        where: { id: commentId }
    });

    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    // Authorization: Only the owner of the comment can edit it
    if (comment.userId !== req.user.id) {
        throw new ApiError(403, "You do not have permission to edit this comment");
    }

    // Perform the update
    const updatedComment = await prisma.comment.update({
        where: { id: commentId },
        data: { content },
        include: {
            user: {
                select: { name: true, role: true }
            }
        }
    });

    return res.status(200).json(
        new ApiResponse(200, updatedComment, "Comment updated successfully")
    );
});

export { addComment, getReportComments, deleteComment, updateComment };