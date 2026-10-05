import { Router } from "express";
import { WebSocketServer } from "ws";
import { createEmergency, deleteEmergency, handleEmergencyStreamSocket, listEmergencies, readRecording, streamRecording, updateEmergencyStatus } from "../controllers/emergencyController.js";
import { operationalRoles, requireAuth, requireRole } from "../middleware/auth.js";
const router = Router();
router.post("/emergencies", createEmergency);
router.post("/emergencies/:session/stream", streamRecording);
router.patch("/emergencies/:id/status", requireRole(...operationalRoles), updateEmergencyStatus);
router.get("/emergencies", requireAuth, listEmergencies);
router.delete("/emergencies/:id", requireRole("admin", "dispatcher"), deleteEmergency);
router.get("/emergencies/:id/recording", readRecording);
export default router;

export function attachEmergencyStreamSocket(server) {
  const sockets = new WebSocketServer({ noServer: true });
  server.on("upgrade", (request, networkSocket, head) => {
    const pathname = new URL(request.url, "http://localhost").pathname;
    const match = pathname.match(/^\/api\/emergencies\/([^/]+)\/stream-socket$/);
    if (!match) return networkSocket.destroy();
    sockets.handleUpgrade(request, networkSocket, head, socket => {
      handleEmergencyStreamSocket(socket, decodeURIComponent(match[1]));
    });
  });
  return sockets;
}
