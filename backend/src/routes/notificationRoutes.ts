import { Router } from "express";
import { authMiddleware } from "../controllers/middlewares/authMiddleware.js";

import {
  listNotifications,
  readNotification,
  readAllNotifications,
} from "../controllers/notificationControllers.js";

const router = Router();

router.use(authMiddleware);

router.get("/", listNotifications);
router.patch("/read-all", readAllNotifications);
router.patch("/:id/read", readNotification);

export default router;