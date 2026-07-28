import type { PlanSlug } from "@kairos/shared";

export interface AIClient {
  complete(params: {
    model: string;
    prompt: string;
  }): Promise<{ text: string; inputTokens: number; outputTokens: number }>;
}

export interface QuotaReader {
  getPlan(userId: string): Promise<PlanSlug>;
  getMonthlyUsage(userId: string, feature: string): Promise<number>;
  getGlobalDailySpendCents(date: string): Promise<number>;
  getGlobalDailyCapCents(): Promise<number>;
}

export interface SpendEntry {
  date: string;
  feature: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costCents: number;
  userId: string;
}

export interface SpendRecorder {
  recordSpend(entry: SpendEntry): Promise<void>;
}
