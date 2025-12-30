import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js"
import prisma from "../constants/prisma.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import bcrypt from "bcrypt";

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    // 1. Find the user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // 2. Generate Tokens
    const accessToken = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
    );

    // 3. Save Refresh Token to Database
    await prisma.user.update({
      where: { id: userId },
      data: {
        refreshToken: refreshToken
      }
    });

    return { accessToken, refreshToken };

  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating tokens");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  // 1. Get user details from frontend
  // Note: Adjusted fields to match our Prisma schema (name, email, password, number)
  const { name, email, password, number } = req.body;

  // 2. Validation - not empty
  if ([name, email, password].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "Name, Email, and Password are required");
  }

  // 3. Check if user already exists (Prisma findFirst with OR)
  const existedUser = await prisma.user.findFirst({
    where: {
      email: email
    }
  });

  if (existedUser) {
    throw new ApiError(409, "User with this email or phone number already exists");
  }

  // 4. Hash the password
  // (Mongoose usually does this in a pre-save hook, but in Prisma we do it here)
  const hashedPassword = await bcrypt.hash(password, 10);

  // 5. Create user object in DB
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      number,
      refreshToken: "" // Initialize as empty
    },

    // Using select here allows us to skip the second DB call!
    select: {
      id: true,
      name: true,
      email: true,
      number: true,
      role: true,
      isVerified: true,
      createdAt: true
    }
  });

  // 6. Check for successful user creation
  if (!user) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  // 7. Return response
  return res.status(201).json(
    new ApiResponse(201, user, "User registered successfully")
  );
});

const loginUser = asyncHandler(async (req, res) => {
  // 1. Get data from req body
  const { email, password } = req.body;

  // 2. Validation
  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  // 3. Find the user in Prisma
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  // 4. Check the password using bcrypt
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  // 5. Generate Access and Refresh tokens
  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user.id);

  // 6. Get user data without sensitive fields
  const loggedInUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isVerified: true
    }
  });

  // 7. Cookie Options
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production", // true only in production
    sameSite: "strict"
  };

  // 8. Send response
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken, refreshToken },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  // 1. Update user in DB to remove the refresh token
  // Note: req.user.id comes from your verifyJWT middleware
  await prisma.user.update({
    where: { id: req.user.id },
    data: {
      refreshToken: null // Equivalent to Mongoose $unset
    }
  });

  // 2. Cookie Options (Must match the ones used during login)
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production"
  };

  // 3. Clear cookies and send response
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

export { registerUser, loginUser, logoutUser };
