import { Router } from "express"
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {registerUser, loginUser, logoutUser, updateAccountDetails, deleteAccount, refreshAccessToken, getCurrentUser} from "../controllers/user.controller.js"

import {createReport, updateReport, deleteReport, getReports, getAllReports, addResource, getMyResources, deleteResource, updateResource} from "../controllers/report.controller.js"

const router = Router();

// User Routes
router.route("/register").post(registerUser);
router.route("/login").post(loginUser)
router.route("/refreshToken").post(refreshAccessToken)

router.route("/getUserProfile").get(verifyJWT, getCurrentUser)
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/update").patch(verifyJWT, updateAccountDetails)
router.route("/delete").delete(verifyJWT, deleteAccount)

// Report Routes
router.route("/createReport").post(verifyJWT, createReport);
router.route("/updateReport/:reportId").patch(verifyJWT, updateReport);
router.route("/deleteReport/:reportId").delete(verifyJWT, deleteReport);
router.route("/getReports").get(verifyJWT, getReports);
router.route("/getAllReports").get(verifyJWT, getAllReports)

router.route("/addResources").post(verifyJWT, addResource)
router.route("/getResources").get(verifyJWT, getMyResources)
router.route("/deleteResource/:resourceId").delete(verifyJWT, deleteResource)
router.route("/updateResource/:resourceId").patch(verifyJWT, updateResource)

export default router