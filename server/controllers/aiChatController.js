import { z } from "zod";
import { OpenRouterError, requestOpenRouterChat } from "../services/openRouterService.js";
import { buildAiDataContext } from "../services/aiDataContextService.js";
import { audit } from "../lib/utils.js";

const chatRequestSchema = z.object({
  locale: z.enum(["en", "fr"]).default("fr"),
  sessionId: z.string().trim().min(8).max(120),
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(2_000),
  })).min(1).max(12),
}).refine(value => value.messages.at(-1)?.role === "user", {
  message: "The last message must come from the user",
  path: ["messages"],
});

export async function createAiChatCompletion(req, res, next) {
  const parsed = chatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0]?.message || "Invalid chat request" });
  }

  try {
    const applicationContext = await buildAiDataContext(req.user);
    const result = await requestOpenRouterChat({ ...parsed.data, applicationContext });
    await audit(req, "ai.context.read", "AiConversation", parsed.data.sessionId, {
      role: applicationContext.access.role,
      authenticated: applicationContext.access.authenticated,
    });
    res.json({ ...result, access: applicationContext.access });
  } catch (error) {
    if (error instanceof OpenRouterError) return res.status(error.status).json({ error: error.message });
    next(error);
  }
}
