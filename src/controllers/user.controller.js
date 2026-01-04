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

const getCurrentUser = asyncHandler(async (req, res) => {
  // 1. Fetch user from DB using ID from the auth middleware
  const user = await prisma.user.findUnique({
    where: {
      id: req.user.id
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
      // We EXCLUDE password and refreshToken for security
    }
  });

  // 2. Return the data
  return res
    .status(200)
    .json(new ApiResponse(200, user, "User profile fetched successfully"));
});

const registerUser = asyncHandler(async (req, res) => {
  // 1. Get user details from frontend
  // Note: Adjusted fields to match our Prisma schema (name, email, password, number)
  const { name, email, password, number, role } = req.body;

  // 2. Validation - not empty
  if ([name, email, password].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "Name, Email, and Password are required");
  }

  const validatePakistaniNumber = (number) => {
    // Regex: Starts with 03, then exactly 9 digits (0-9)
    const regex = /^03\d{9}$/;
    return regex.test(number);
  };

  // Inside your registerUser or updateAccountDetails controller:
  if (number && !validatePakistaniNumber(number)) {
    throw new ApiError(400, "Please provide a valid Pakistani mobile number (11 digits starting with 03)");
  }

  // 3. Check if user already exists (Prisma findFirst with OR)
  const existedUser = await prisma.user.findFirst({
    where: {
      email: email
    }
  });

  if (existedUser) {
    throw new ApiError(409, "User with this email already exists");
  }

  // 4. Hash the password
  // (Mongoose usually does this in a pre-save hook, but in Prisma we do it here)
  if (password.length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters long");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // 5. Create user object in DB
  const user = await prisma.user.create({
    data: {
      name,
      email,
      role,
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
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
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

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { name, email, number, password } = req.body;

  // 1. Validation: Ensure at least one field is provided
  if (!name && !email && !number && !password) {
    throw new ApiError(400, "At least one field is required to update");
  }

  const validatePakistaniNumber = (number) => {
    // Regex: Starts with 03, then exactly 9 digits (0-9)
    const regex = /^03\d{9}$/;
    return regex.test(number);
  };

  // Inside your registerUser or updateAccountDetails controller:
  if (number && !validatePakistaniNumber(number)) {
    throw new ApiError(400, "Please provide a valid Pakistani mobile number (11 digits starting with 03)");
  }

  const updateData = {};

  // 2. Handle Name Update (Sync with Frontend Regex)
  if (name) {
    // Regex allows letters, spaces, hyphens, and apostrophes
    const nameRegex = /^[a-zA-Z\s\-']+$/;
    if (!nameRegex.test(name)) {
      throw new ApiError(400, "Name contains invalid characters. Use only letters, spaces, or hyphens.");
    }
    updateData.name = name;
  }

  // 3. Handle Email Update (Check for duplicates)
  if (email) {
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    // If email exists and belongs to a DIFFERENT user, throw error
    if (existingUser && existingUser.id !== req.user.id) {
      throw new ApiError(409, "A user with this email already exists");
    }
    updateData.email = email;
  }

  // 4. Handle Phone Number
  if (number !== undefined) {
    updateData.number = number;
  }

  // 5. Handle Password Update (Hash before saving)
  if (password) {
    if (password.length < 6) {
      throw new ApiError(400, "Password must be at least 6 characters long");
    }
    updateData.password = await bcrypt.hash(password, 10);
  }

  // 6. Update in Database
  // req.user.id is populated by your verifyJWT middleware
  const updatedUser = await prisma.user.update({
    where: {
      id: req.user.id
    },
    data: updateData,
    select: {
      id: true,
      name: true,
      email: true,
      number: true,
      role: true,
      updatedAt: true
    }
  });

  // 7. Return Response
  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "Account details updated successfully"));
});

const deleteAccount = asyncHandler(async (req, res) => {
  // 1. Identify the user (from verifyJWT middleware)
  const userId = req.user.id;

  // 2. Check if user exists (Optional but good for safety)
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // 3. Delete the user from the database
  // Note: If you have Reports linked to this user, 
  // you must handle 'OnDelete: Cascade' in your Prisma Schema
  await prisma.user.delete({
    where: {
      id: userId
    }
  });

  // 4. Clear the cookies after deletion
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production"
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "Account deleted successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  // 1. Get the refresh token from cookies (or body as fallback)
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request: No refresh token found");
  }

  try {
    // 2. Verify the token using the Refresh Secret
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    // 3. Find the user in the database
    const user = await prisma.user.findUnique({
      where: { id: decodedToken?.id }
    });

    if (!user) {
      throw new ApiError(401, "Invalid refresh token: User not found");
    }

    // 4. Security Check: Compare the incoming token with the one stored in DB
    // This prevents old/stolen tokens from being used
    if (incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    // 5. Generate NEW tokens (reuse your helper function)
    const { accessToken, refreshToken: newRefreshToken } = await generateAccessAndRefreshTokens(user.id);

    // 6. Set updated cookies
    const options = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production"
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed successfully"
        )
      );

  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

export { getCurrentUser, registerUser, loginUser, logoutUser, updateAccountDetails, deleteAccount, refreshAccessToken };
