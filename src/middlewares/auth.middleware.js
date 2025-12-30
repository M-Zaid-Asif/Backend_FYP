import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken"
import prisma from "../constants/prisma.js";

// This will verify that user is logged in or not
export const verifyJWT = asyncHandler(async (req, _, next) => {
    try {
        const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")

        if (!token) {
            throw new ApiError(401, "Unauthorized request")
        }

        // token is valid or not and what info it is holding
        const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

        const user = await prisma.user.findUnique({
            where: {
                id: decodedToken?.id, // Ensure this matches the key in your token
            },
            select: {
                id: true,
                name: true,
                email: true,
                number: true,
                role: true,
                isVerified: true,
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!user) {
            throw new ApiError(401, "Invalid access token")
        }

        // mean our present user has whole requested user injected in it.
        req.user = user;

        next()

    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token")
    }
})