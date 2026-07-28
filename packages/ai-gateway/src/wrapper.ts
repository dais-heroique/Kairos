import { checkQuota, computeCostCents, isGlobalCapExceeded } from "./spend-guard";
import type { AIClient, QuotaReader, SpendRecorder } from "./types";

export type CallAIResult =
  | { status: "ok"; text: string; costCents: number }
  | { status: "quota_exceeded"; remaining: number }
  | { status: "global_cap_exceeded" };

export interface CallAIOptions {
  userId: string;
  feature: string;
  model: string;
  prompt: string;
}

export interface CallAIDeps {
  aiClient: AIClient;
  quotaReader: QuotaReader;
  spendRecorder: SpendRecorder;
  now?: () => Date;
}

/**
 * Seul point d'entrée pour tout appel IA (garde-fou §6.4 n°7) — aucun
 * appel ne peut contourner le log de dépense ni la vérification de
 * quota : quota puis plafond global puis appel puis log, dans cet ordre,
 * jamais après coup. Le dépassement de plafond global dégrade
 * proprement (le produit ralentit) au lieu de planter — la mise en file
 * d'attente elle-même relève de l'appelant (ex. Lot 6), ce wrapper se
 * contente de refuser l'appel immédiat.
 */
export async function callAI(options: CallAIOptions, deps: CallAIDeps): Promise<CallAIResult> {
  const { userId, feature, model, prompt } = options;
  const now = (deps.now ?? (() => new Date()))();
  const today = now.toISOString().slice(0, 10);

  const plan = await deps.quotaReader.getPlan(userId);
  const monthlyUsage = await deps.quotaReader.getMonthlyUsage(userId, feature);
  const quota = checkQuota(plan, monthlyUsage);
  if (!quota.allowed) {
    return { status: "quota_exceeded", remaining: quota.remaining };
  }

  const [dailySpend, cap] = await Promise.all([
    deps.quotaReader.getGlobalDailySpendCents(today),
    deps.quotaReader.getGlobalDailyCapCents(),
  ]);
  if (isGlobalCapExceeded(dailySpend, cap)) {
    return { status: "global_cap_exceeded" };
  }

  const response = await deps.aiClient.complete({ model, prompt });
  const costCents = computeCostCents(model, response.inputTokens, response.outputTokens);

  await deps.spendRecorder.recordSpend({
    date: today,
    feature,
    model,
    inputTokens: response.inputTokens,
    outputTokens: response.outputTokens,
    costCents,
    userId,
  });

  return { status: "ok", text: response.text, costCents };
}
