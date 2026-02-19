import { getUserRole } from "../middlewares/roleGuard.js";

/**
 * Resolves the AI config for a user by their ID.
 * Internally derives the user's role first, then fetches the matching config.
 *
 * This is the main function to call inside your controllers.
 *
 * @example
 * const aiConfig = await getAiConfigForUser(userId);
 * // aiConfig.modelName → "deepseek-chat" | "claude-sonnet-4-5" | ...
 * // aiConfig.provider  → "deepseek" | "anthropic" | ...
 */
export async function getAiModelNameForUser(userId: string): Promise<string> {
  if (!userId) {
    throw new Error("Ai Model For User: User Id is required");
  }

  const role = await getUserRole(userId);
  if (role === "pro" || role === "enterprise") {
    return process.env.OPENROUTER_MODEL_NAME_PRO as string;
  }

  return process.env.OPENROUTER_MODEL_NAME as string;
}

export async function getAiModelNameRevisionForUser(userId: string): Promise<string> {
  if (!userId) {
    throw new Error("Ai Model Revision: User Id is required");
  }

  const role = await getUserRole(userId);
  if (role === "pro" || role === "enterprise") {
    return process.env.OPENROUTER_MODEL_NAME_REVIEW_PRO as string;
  }

  return process.env.OPENROUTER_MODEL_NAME_REVIEW as string;
}