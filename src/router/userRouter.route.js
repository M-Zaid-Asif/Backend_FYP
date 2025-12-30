import { Router } from "express"
import {count} from "../controllers/user.controller.js"

const router = Router();

router.route("/").get(count);

export default router