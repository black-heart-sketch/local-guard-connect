import { CommunityPost } from "../models/CommunityPost.js";

function serializePost(post) {
  const p = post.toJSON ? post.toJSON() : post;
  const author = p.author && typeof p.author === "object" ? p.author : null;
  return { ...p, author_id: author?.id || p.author, created_at: p.createdAt, profiles: author ? { id: author.id, full_name: author.fullName, avatar_url: author.avatarUrl, role: author.role, verified: author.verified } : null };
}
export async function listPosts(_req, res, next) { try { const posts = await CommunityPost.find({ moderationStatus: "visible" }).populate("author", "fullName avatarUrl role verified").sort({ createdAt: -1 }); res.json(posts.map(serializePost)); } catch (error) { next(error); } }
export async function createPost(req, res, next) { try { const post = await CommunityPost.create({ ...req.body, author: req.user._id, jurisdiction: req.user.jurisdiction }); await post.populate("author", "fullName avatarUrl role verified"); res.status(201).json(serializePost(post)); } catch (error) { next(error); } }
export async function listComments(req, res, next) { try { const post = await CommunityPost.findById(req.params.id).populate("comments.author", "fullName avatarUrl role verified"); if (!post) return res.status(404).json({ error: "Post not found" }); res.json(post.comments.map(c => ({ ...c.toJSON(), post_id: post.id, author_id: c.author?.id, profiles: c.author ? { id: c.author.id, full_name: c.author.fullName, avatar_url: c.author.avatarUrl } : null, created_at: c.createdAt }))); } catch (error) { next(error); } }
export async function createComment(req, res, next) { try { const post = await CommunityPost.findByIdAndUpdate(req.params.id, { $push: { comments: { author: req.user._id, content: req.body.content } } }, { returnDocument: "after" }); if (!post) return res.status(404).json({ error: "Post not found" }); res.status(201).json(post.comments.at(-1)); } catch (error) { next(error); } }
export async function reportPost(req, res, next) { try { res.json(await CommunityPost.findByIdAndUpdate(req.params.id, { $inc: { reportsCount: 1 }, ...(req.body.reason ? { $set: { moderationStatus: "flagged" } } : {}) }, { returnDocument: "after" })); } catch (error) { next(error); } }
export async function moderationQueue(_req, res, next) { try { res.json(await CommunityPost.find({ $or: [{ moderationStatus: "flagged" }, { reportsCount: { $gt: 0 } }] }).populate("author", "fullName phone email").sort({ reportsCount: -1, createdAt: -1 })); } catch (error) { next(error); } }
export async function moderatePost(req, res, next) {
  try {
    const update = {};
    if (["visible", "flagged", "removed"].includes(req.body.moderationStatus)) update.moderationStatus = req.body.moderationStatus;
    if (["unconfirmed", "verified", "resolved", "false"].includes(req.body.verificationStatus)) update.verificationStatus = req.body.verificationStatus;
    if (!Object.keys(update).length) return res.status(400).json({ error: "Valid moderation or verification status required" });
    const post = await CommunityPost.findByIdAndUpdate(req.params.id, update, { returnDocument: "after", runValidators: true });
    if (!post) return res.status(404).json({ error: "Post not found" });
    res.json(post);
  } catch (error) { next(error); }
}
