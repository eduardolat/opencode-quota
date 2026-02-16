import type { Credentials } from "./creds";
import { formatTimeUntil } from "./helpers";

export interface zaiQuota {
  accountId: string;
  accountType: string;
  tokenQuota: {
    usedPercent: number;
    remainingPercent: number;
    resetAt: string;
    resetIn: string;
  };
  mcpQuota: {
    usedPercent: number;
    remainingPercent: number;
    resetAt: string;
    resetIn: string;
    details: Array<{
      modelCode: string;
      usage: number;
    }>;
  };
}

interface zaiQuotaRawResponse {
  code: number;
  msg: string;
  data: {
    limits: Array<{
      type: "TIME_LIMIT" | "TOKENS_LIMIT" | string;
      unit: number;
      number: number;
      usage?: number;
      currentValue?: number;
      remaining?: number;
      percentage: number;
      nextResetTime: number;
      usageDetails?: Array<{
        modelCode: string;
        usage: number;
      }>;
    }>;
    level: string;
  };
  success: boolean;
}

export async function getZaiQuota(creds: Credentials): Promise<zaiQuota> {
  if (!creds.zaiApiKey) {
    throw new Error("Missing Z.ai API key in credentials.");
  }

  const headers = new Headers();
  headers.append("Authorization", creds.zaiApiKey);
  headers.append("Content-Type", "application/json");
  headers.append("User-Agent", "OpenCode-Quota-Plugin/1.0");

  const response = await fetch(
    "https://api.z.ai/api/monitor/usage/quota/limit",
    {
      method: "GET",
      headers,
      redirect: "follow",
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch Z.ai quota. Status: ${response.status}, Response: ${errorText}`,
    );
  }

  const result = (await response.json()) as zaiQuotaRawResponse;
  if (!result.success || result.code !== 200) {
    throw new Error(
      `Failed to fetch Z.ai quota. Code: ${result.code}, Message: ${result.msg}`,
    );
  }

  const tokenLimit = result.data.limits.find(
    (limit) => limit.type === "TOKENS_LIMIT",
  );
  const timeLimit = result.data.limits.find(
    (limit) => limit.type === "TIME_LIMIT",
  );

  const tokenResetAt = toIsoOrUnknown(tokenLimit?.nextResetTime);
  const tokenUsedPercent = clampPercent(tokenLimit?.percentage ?? 0);

  const mcpResetAt = toIsoOrUnknown(timeLimit?.nextResetTime);
  const mcpUsedPercent = clampPercent(timeLimit?.percentage ?? 0);

  return {
    accountId: maskToken(creds.zaiApiKey),
    accountType: result.data.level,
    tokenQuota: {
      usedPercent: tokenUsedPercent,
      remainingPercent: clampPercent(100 - tokenUsedPercent),
      resetAt: tokenResetAt,
      resetIn: toReadableFuture(tokenResetAt),
    },
    mcpQuota: {
      usedPercent: mcpUsedPercent,
      remainingPercent: clampPercent(100 - mcpUsedPercent),
      resetAt: mcpResetAt,
      resetIn: toReadableFuture(mcpResetAt),
      details: (timeLimit?.usageDetails ?? []).map((item) => ({
        modelCode: item.modelCode,
        usage: item.usage,
      })),
    },
  };
}

function toIsoOrUnknown(timestampMs: number | undefined): string {
  if (typeof timestampMs !== "number" || !Number.isFinite(timestampMs)) {
    return "unknown";
  }

  const date = new Date(timestampMs);
  if (Number.isNaN(date.getTime())) {
    return "unknown";
  }

  return date.toISOString();
}

function toReadableFuture(resetAtIso: string): string {
  const base = formatTimeUntil(resetAtIso);
  if (base === "unknown" || base === "now") {
    return base;
  }

  return `in ${base}`;
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(value * 100) / 100));
}

function maskToken(token: string): string {
  if (token.length <= 8) {
    return "********";
  }

  const start = token.slice(0, 6);
  const end = token.slice(-4);
  return `${start}...${end}`;
}
