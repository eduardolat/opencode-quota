import type { Credentials } from "./creds";
import { formatTimeUntil } from "./helpers";

export interface zaiQuota {
  accountType: string;
  limits: {
    type: string;
    total: number;
    used: number;
    usedPercent: number;
    remaining: number;
    remainingPercent: number;
    resetAt: string;
    resetIn: string;
  }[];
  resetAt: string;
  resetIn: string;
}

interface zaiQuotaRawResponse {
  code: number;
  msg: string;
  data: {
    limits: Array<{
      type: string;
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

  const limits = result.data.limits.map(mapLimit);
  const nextResetTs = getEarliestResetTimestamp(result.data.limits);
  const resetAt = Number.isFinite(nextResetTs)
    ? new Date(nextResetTs).toISOString()
    : "unknown";

  return {
    accountType: result.data.level,
    limits,
    resetAt,
    resetIn: formatTimeUntil(resetAt),
  };
}

function mapLimit(
  limit: zaiQuotaRawResponse["data"]["limits"][number],
): zaiQuota["limits"][number] {
  const usedPercent = clampPercent(limit.percentage ?? 0);
  const total = deriveTotal(limit);
  const used = deriveUsed(limit, total, usedPercent);
  const remaining = deriveRemaining(limit, total, used);
  const remainingPercent = clampPercent(100 - usedPercent);
  const resetAt = toIsoOrUnknown(limit.nextResetTime);

  return {
    type: limit.type,
    total,
    used,
    usedPercent,
    remaining,
    remainingPercent,
    resetAt,
    resetIn: formatTimeUntil(resetAt),
  };
}

function deriveTotal(
  limit: zaiQuotaRawResponse["data"]["limits"][number],
): number {
  if (typeof limit.usage === "number") {
    return Math.max(0, limit.usage);
  }

  if (typeof limit.currentValue === "number" && limit.percentage > 0) {
    return Math.max(0, round2(limit.currentValue / (limit.percentage / 100)));
  }

  if (typeof limit.remaining === "number" && limit.percentage < 100) {
    return Math.max(0, round2(limit.remaining / (1 - limit.percentage / 100)));
  }

  return 0;
}

function deriveUsed(
  limit: zaiQuotaRawResponse["data"]["limits"][number],
  total: number,
  usedPercent: number,
): number {
  if (typeof limit.currentValue === "number") {
    return Math.max(0, limit.currentValue);
  }

  if (typeof limit.remaining === "number" && total > 0) {
    return Math.max(0, round2(total - limit.remaining));
  }

  if (total > 0) {
    return Math.max(0, round2(total * (usedPercent / 100)));
  }

  return 0;
}

function deriveRemaining(
  limit: zaiQuotaRawResponse["data"]["limits"][number],
  total: number,
  used: number,
): number {
  if (typeof limit.remaining === "number") {
    return Math.max(0, limit.remaining);
  }

  if (total > 0) {
    return Math.max(0, round2(total - used));
  }

  return 0;
}

function getEarliestResetTimestamp(
  limits: zaiQuotaRawResponse["data"]["limits"],
): number {
  const timestamps = limits
    .map((limit) => limit.nextResetTime)
    .filter((ts) => Number.isFinite(ts) && ts > Date.now());

  if (timestamps.length === 0) {
    return Number.NaN;
  }

  return Math.min(...timestamps);
}

function toIsoOrUnknown(timestampMs: number): string {
  if (!Number.isFinite(timestampMs)) {
    return "unknown";
  }

  const date = new Date(timestampMs);
  if (Number.isNaN(date.getTime())) {
    return "unknown";
  }

  return date.toISOString();
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(100, Math.max(0, round2(value)));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
