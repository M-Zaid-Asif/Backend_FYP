import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js"
import prisma from "../constants/prisma.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import bcrypt from "bcrypt";

// Generating Access and Refresh Token
const generateAccessAndRefreshTokens = async (userId) => {
  try {

    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    // Generate Tokens
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

    // Save Refresh Token to Database
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

// Get Current User
const getCurrentUser = asyncHandler(async (req, res) => {
  
  // Fetch user from DB using ID from the auth middleware
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
    }
  });

  // Return the data
  return res
    .status(200)
    .json(new ApiResponse(200, user, "User profile fetched successfully"));
});

// Register User
const registerUser = asyncHandler(async (req, res) => {
  
  // Get user details from frontend
  const { name, email, password, number, role } = req.body;

  // Validation - not empty
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

  // Check if user already exists (Prisma findFirst with OR)
  const existedUser = await prisma.user.findFirst({
    where: {
      email: email
    }
  });

  if (existedUser) {
    throw new ApiError(409, "User with this email already exists");
  }

  // Hash the password
  if (password.length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters long");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user object in DB
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

  // Check for successful user creation
  if (!user) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  // Return response
  return res.status(201).json(
    new ApiResponse(201, user, "User registered successfully")
  );
});

// Log In User
const loginUser = asyncHandler(async (req, res) => {
  
  // Get data from req body (Added fcmToken and deviceType)
  const { email, password, fcmToken, deviceType } = req.body;

  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user.id);

  // --- NEW FCM LOGIC START ---
  // If the user provides an FCM token during login, save/update it
  if (fcmToken) {
    await prisma.fcmToken.upsert({
      where: { token: fcmToken },
      update: { 
        userId: user.id, // Ensure the token is linked to this specific user
        lastUsed: new Date() 
      },
      create: {
        token: fcmToken,
        userId: user.id,
        deviceType: deviceType || "web"
      }
    });
  }
  // --- NEW FCM LOGIC END ---

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

  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  };

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

// Logout User
const logoutUser = asyncHandler(async (req, res) => {
 
  // Update user in DB to remove the refresh token
  await prisma.user.update({
    where: { id: req.user.id },
    data: {
      refreshToken: null 
    }
  });

  // Cookie Options
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production"
  };

  // Clear cookies and send response
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

// Update Account Details
const updateAccountDetails = asyncHandler(async (req, res) => {
  const { name, email, number, password } = req.body;

  // Validation: Ensure at least one field is provided
  if (!name && !email && !number && !password) {
    throw new ApiError(400, "At least one field is required to update");
  }

  const validatePakistaniNumber = (number) => {
    // Regex: Starts with 03, then exactly 9 digits (0-9)
    const regex = /^03\d{9}$/;
    return regex.test(number);
  };

  
  if (number && !validatePakistaniNumber(number)) {
    throw new ApiError(400, "Please provide a valid Pakistani mobile number (11 digits starting with 03)");
  }

  const updateData = {};

  // Handle Name Update
  if (name) {
    // Regex allows letters, spaces, hyphens, and apostrophes
    const nameRegex = /^[a-zA-Z\s\-']+$/;
    if (!nameRegex.test(name)) {
      throw new ApiError(400, "Name contains invalid characters. Use only letters, spaces, or hyphens.");
    }
    updateData.name = name;
  }

  // Handle Email Update (Check for duplicates)
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

  // Handle Phone Number
  if (number !== undefined) {
    updateData.number = number;
  }

  // Handle Password Update (Hash before saving)
  if (password) {
    if (password.length < 6) {
      throw new ApiError(400, "Password must be at least 6 characters long");
    }
    updateData.password = await bcrypt.hash(password, 10);
  }

  // Update in Database
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

  // Return Response
  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "Account details updated successfully"));
});

// Delete Account
const deleteAccount = asyncHandler(async (req, res) => {
  
  // Identify the user
  const userId = req.user.id;

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Delete the user from the database
  await prisma.user.delete({
    where: {
      id: userId
    }
  });

  // Clear the cookies after deletion
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

// Refresh Token
const refreshAccessToken = asyncHandler(async (req, res) => {
  // Get the refresh token from cookies
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request: No refresh token found");
  }

  try {
    // Verify the token using the Refresh Secret
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    // Find the user in the database
    const user = await prisma.user.findUnique({
      where: { id: decodedToken?.id }
    });

    if (!user) {
      throw new ApiError(401, "Invalid refresh token: User not found");
    }

    // Security Check: Compare the incoming token with the one stored in DB
    if (incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    // Generate NEW tokens (reuse your helper function)
    const { accessToken, refreshToken: newRefreshToken } = await generateAccessAndRefreshTokens(user.id);

    // Set updated cookies
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

// FCM Token Update
const updateFcmToken = asyncHandler(async (req, res) => {
    const { fcmToken, deviceType } = req.body;

    if (!fcmToken) {
        throw new ApiError(400, "FCM Token is required");
    }

    // Upsert ensures we don't get duplicate tokens in the DB
    await prisma.fcmToken.upsert({
        where: { token: fcmToken },
        update: { 
            userId: req.user.id, // link to the logged-in user from auth middleware
            lastUsed: new Date() 
        },
        create: {
            token: fcmToken,
            userId: req.user.id,
            deviceType: deviceType || "web"
        }
    });

    return res
        .status(200)
        .json(new ApiResponse(200, {}, "FCM Token updated successfully"));
});

export { getCurrentUser, registerUser, loginUser, logoutUser, updateAccountDetails, deleteAccount, refreshAccessToken, updateFcmToken };
