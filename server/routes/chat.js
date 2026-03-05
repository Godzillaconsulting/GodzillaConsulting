import express from "express";
import { processChatMessage } from "../controllers/chatController.js";

const router = express.Router();

router.post("/", processChatMessage);

export default router;
