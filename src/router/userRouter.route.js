import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { registerUser, loginUser, logoutUser, updateAccountDetails, deleteAccount, refreshAccessToken, getCurrentUser, updateFcmToken } from "../controllers/user.controller.js"

import { createReport, updateReport, deleteReport, getReports, getAllReports, addResource, getMyResources, deleteResource, updateResource, toggleVote } from "../controllers/report.controller.js"

import { getKnowledgeChatResponse } from "../controllers/chatbot.controller.js";

import { getCurrentWeather, getMapConfig } from "../controllers/weather.controller.js";

import { addComment, getReportComments, deleteComment, updateComment } from "../controllers/comments.controller.js";

import { explainDecision } from "../controllers/ai.controller.js";

const router = Router();

// Router
router.route("/currentWeather").get(getCurrentWeather)
router.route("/getMapConfig").get(getMapConfig)

// User Routes
router.route("/register").post(registerUser);
router.route("/login").post(loginUser)
router.route("/refreshToken").post(refreshAccessToken)

router.route("/getUserProfile").get(verifyJWT, getCurrentUser)
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/update").patch(verifyJWT, updateAccountDetails)
router.route("/delete").delete(verifyJWT, deleteAccount)
router.route("/updatefcmToken").patch(verifyJWT, updateFcmToken)

// Chatbot
router.route("/ask").post(verifyJWT, getKnowledgeChatResponse)

// Report Routes
router.route("/createReport").post(verifyJWT, createReport);
router.route("/updateReport/:reportId").patch(verifyJWT, updateReport);
router.route("/deleteReport/:reportId").delete(verifyJWT, deleteReport);
router.route("/getReports").get(verifyJWT, getReports);
router.route("/getAllReports").get(verifyJWT, getAllReports)

router.route("/explainDecision").post(verifyJWT, explainDecision)

router.route("/addResources").post(verifyJWT, addResource)
router.route("/getResources").get(verifyJWT, getMyResources)
router.route("/deleteResource/:resourceId").delete(verifyJWT, deleteResource)
router.route("/updateResource/:resourceId").patch(verifyJWT, updateResource)


// Route for a specific report (Getting all comments or adding a new one)
router.route("/:reportId")
    .get(getReportComments)
    .post(verifyJWT, addComment);

// Route for a specific comment (Updating or Deleting)
router.route("/c/:commentId")
    .patch(verifyJWT, updateComment)
    .delete(verifyJWT, deleteComment);

// Vote
router.route("/v/:reportId").post(verifyJWT, toggleVote);



export default router