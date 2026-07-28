import { describe, expect, it, vi } from "vitest";
import { callAI, type CallAIDeps } from "./wrapper";
import type { AIClient, QuotaReader, SpendEntry, SpendRecorder } from "./types";

function makeDeps(overrides: Partial<CallAIDeps> = {}): CallAIDeps {
  const aiClient: AIClient = {
    complete: vi.fn().mockResolvedValue({ text: "hello", inputTokens: 100, outputTokens: 200 }),
  };
  const quotaReader: QuotaReader = {
    getPlan: vi.fn().mockResolvedValue("creator"),
    getMonthlyUsage: vi.fn().mockResolvedValue(0),
    getGlobalDailySpendCents: vi.fn().mockResolvedValue(0),
    getGlobalDailyCapCents: vi.fn().mockResolvedValue(5000),
  };
  const spendRecorder: SpendRecorder = { recordSpend: vi.fn().mockResolvedValue(undefined) };
  return {
    aiClient,
    quotaReader,
    spendRecorder,
    now: () => new Date("2026-07-28T12:00:00.000Z"),
    ...overrides,
  };
}

const baseOptions = { userId: "u1", feature: "brief_generation", model: "claude-sonnet-5", prompt: "test" };

describe("callAI", () => {
  it("calls the AI client and records spend on success — the only path that can write ai_spend", async () => {
    const deps = makeDeps();

    const result = await callAI(baseOptions, deps);

    expect(result.status).toBe("ok");
    expect(deps.aiClient.complete).toHaveBeenCalledWith({ model: "claude-sonnet-5", prompt: "test" });
    expect(deps.spendRecorder.recordSpend).toHaveBeenCalledTimes(1);
    const recorded = (deps.spendRecorder.recordSpend as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as SpendEntry;
    expect(recorded.userId).toBe("u1");
    expect(recorded.date).toBe("2026-07-28");
    expect(recorded.costCents).toBeGreaterThan(0);
  });

  it("blocks the call before it happens when the monthly quota is exhausted", async () => {
    const deps = makeDeps({
      quotaReader: {
        getPlan: vi.fn().mockResolvedValue("radar"),
        getMonthlyUsage: vi.fn().mockResolvedValue(3),
        getGlobalDailySpendCents: vi.fn().mockResolvedValue(0),
        getGlobalDailyCapCents: vi.fn().mockResolvedValue(5000),
      },
    });

    const result = await callAI(baseOptions, deps);

    expect(result).toEqual({ status: "quota_exceeded", remaining: 0 });
    expect(deps.aiClient.complete).not.toHaveBeenCalled();
    expect(deps.spendRecorder.recordSpend).not.toHaveBeenCalled();
  });

  it("blocks the call before it happens when the global daily cap is exceeded", async () => {
    const deps = makeDeps({
      quotaReader: {
        getPlan: vi.fn().mockResolvedValue("pro"),
        getMonthlyUsage: vi.fn().mockResolvedValue(0),
        getGlobalDailySpendCents: vi.fn().mockResolvedValue(6000),
        getGlobalDailyCapCents: vi.fn().mockResolvedValue(5000),
      },
    });

    const result = await callAI(baseOptions, deps);

    expect(result).toEqual({ status: "global_cap_exceeded" });
    expect(deps.aiClient.complete).not.toHaveBeenCalled();
    expect(deps.spendRecorder.recordSpend).not.toHaveBeenCalled();
  });

  it("never calls the AI client without going through both guard checks first", async () => {
    const callOrder: string[] = [];
    const deps = makeDeps({
      quotaReader: {
        getPlan: vi.fn().mockResolvedValue("pro"),
        getMonthlyUsage: vi.fn().mockImplementation(async () => {
          callOrder.push("quota");
          return 0;
        }),
        getGlobalDailySpendCents: vi.fn().mockImplementation(async () => {
          callOrder.push("cap");
          return 0;
        }),
        getGlobalDailyCapCents: vi.fn().mockResolvedValue(5000),
      },
      aiClient: {
        complete: vi.fn().mockImplementation(async () => {
          callOrder.push("ai-call");
          return { text: "x", inputTokens: 1, outputTokens: 1 };
        }),
      },
    });

    await callAI(baseOptions, deps);

    expect(callOrder).toEqual(["quota", "cap", "ai-call"]);
  });
});
