import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import prisma from "../constants/prisma.js";

const getKnowledgeChatResponse = asyncHandler(async (req, res) => {
    const { message } = req.body;

    if (!message) {
        throw new ApiError(400, "Please enter an emergency condition or disaster type.");
    }

    // Search the Condition table using fuzzy matching
    const localData = await prisma.condition.findFirst({
        where: {
            OR: [
                { title: { contains: message, mode: 'insensitive' } },
                { description: { contains: message, mode: 'insensitive' } }
            ]
        }
    });

    // Case 1: Condition Found
    if (localData) {
        return res.status(200).json(
            new ApiResponse(200, {
                title: localData.title, // e.g., "Drowning"
                recoveryPosition: localData.recoveryPosition,
                steps: localData.steps,
                precautions: localData.precautions,
                verified: true
            }, "Verified rescue instructions retrieved.")
        );
    }

    // Case 2: Condition Not Found
    return res.status(404).json(
        new ApiResponse(404, {
            reply: "I'm sorry, I couldn't find specific instructions for that in our database. Please contact emergency services immediately.",
            verified: false
        }, "No local data found.")
    );
});

export { getKnowledgeChatResponse };