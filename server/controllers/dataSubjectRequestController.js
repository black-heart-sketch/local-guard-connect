import { DataSubjectRequest } from "../models/DataSubjectRequest.js";
import { Emergency } from "../models/Emergency.js";
import { Report } from "../models/Report.js";
import { CommunityPost } from "../models/CommunityPost.js";
import { publicUser } from "./userController.js";
import { audit } from "../lib/utils.js";

export async function createRequest(req, res, next) {
  try {
    const item = await DataSubjectRequest.create({ user: req.user._id, type: req.body.type, details: req.body.details });
    await audit(req, "privacy.request", "DataSubjectRequest", item.id, { type: item.type });
    res.status(201).json(item);
  } catch (error) { next(error); }
}
export async function listRequests(req, res, next) { try { res.json(await DataSubjectRequest.find(req.user.role === "admin" ? {} : { user: req.user._id }).populate("user", "fullName email phone").sort({ createdAt: -1 })); } catch (error) { next(error); } }
export async function updateRequest(req, res, next) { try { const item = await DataSubjectRequest.findByIdAndUpdate(req.params.id, { status: req.body.status, resolution: req.body.resolution, handledBy: req.user._id, completedAt: req.body.status === "completed" ? new Date() : undefined }, { returnDocument: "after" }); res.json(item); } catch (error) { next(error); } }
export async function exportMyData(req, res, next) {
  try {
    const [reports, emergencies, posts] = await Promise.all([Report.find({ reporter: req.user._id }), Emergency.find({ user: req.user._id }), CommunityPost.find({ author: req.user._id })]);
    await audit(req, "privacy.export", "User", req.user.id);
    res.setHeader("Content-Disposition", `attachment; filename=crimex-data-${req.user.id}.json`);
    res.json({ exportedAt: new Date().toISOString(), profile: publicUser(req.user), reports, emergencies, communityPosts: posts });
  } catch (error) { next(error); }
}
