import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import prisma from "../constants/prisma.js";

const getKnowledgeChatResponse = asyncHandler(async (req, res) => {
    const { message } = req.body;

    if (!message) {
        throw new ApiError(400, "Please enter an emergency condition or disaster type.");
    }

    // 1. Search the Condition table using fuzzy matching [cite: 3, 15, 27]
    const localData = await prisma.condition.findFirst({
        where: {
            OR: [
                { title: { contains: message, mode: 'insensitive' } },
                { description: { contains: message, mode: 'insensitive' } }
            ]
        }
    });

    // 2. Handle Case: Condition Found [cite: 3]
    if (localData) {
        return res.status(200).json(
            new ApiResponse(200, {
                title: localData.title, // e.g., "Drowning" [cite: 4]
                recoveryPosition: localData.recoveryPosition, // [cite: 5]
                steps: localData.steps, // [cite: 8]
                precautions: localData.precautions, // [cite: 13]
                verified: true
            }, "Verified rescue instructions retrieved.")
        );
    }

    // 3. Handle Case: Condition Not Found
    // Since we are not using Gemini, we provide a helpful fallback message.
    return res.status(404).json(
        new ApiResponse(404, {
            reply: "I'm sorry, I couldn't find specific instructions for that in our database. Please contact emergency services immediately.",
            verified: false
        }, "No local data found.")
    );
});

export { getKnowledgeChatResponse };