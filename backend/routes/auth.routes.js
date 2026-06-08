import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";

const router = Router();

router.post("/send-otp", authController.sendOtp);
router.post("/verify-otp", authController.verifyOtp);
router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.get("/session", authController.session);

export default router;
