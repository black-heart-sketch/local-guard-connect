import { Router } from "express";
import { avatar, deactivateUser, listUsers, login, logout, me, register, updateProfile, updateUser, uploadAvatar } from "../controllers/userController.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { upload, uploadKind } from "../middleware/upload.js";

const router = Router();
router.post("/auth/register", register);
router.post("/auth/login", login);
router.post("/auth/logout", logout);
router.get("/auth/me", requireAuth, me);
router.patch("/profile", requireAuth, updateProfile);
router.post("/profile/avatar", requireAuth, uploadKind("avatars"), upload.single("avatar"), uploadAvatar);
router.get("/files/avatar/:name", avatar);
router.get("/users", requireRole("admin", "dispatcher", "police", "gendarmerie"), listUsers);
router.patch("/users/:id", requireRole("admin"), updateUser);
router.delete("/users/:id", requireRole("admin"), deactivateUser);
export default router;
