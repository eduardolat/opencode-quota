import type { Credentials } from "./creds";
import { formatTimeUntil } from "./helpers";

export interface openaiQuota {
  accountEmail: string;
  accountType: string;
  rateLimitPrimaryWindow: {
    usedPercent: number | null;
    remainingPercent: number | null;
    resetAt: string | null;
    resetIn: string | null;
  };
  rateLimitSecondaryWindow: {
    usedPercent: number | null;
    remainingPercent: number | null;
    resetAt: string | null;
    resetIn: string | null;
  };
  codeReviewPrimaryWindow: {
    usedPercent: number | null;
    remainingPercent: number | null;
    resetAt: string | null;
    resetIn: string | null;
  };
}

interface openaiQuotaRawResponse {
  user_id: string;
  account_id: string;
  email: string;
  plan_type: string;
  rate_limit: {
    allowed: boolean;
    limit_reached: boolean;
    primary_window: {
      used_percent: number;
      limit_window_seconds: number;
      reset_after_seconds: number;
      reset_at: number;
    };
    secondary_window: {
      used_percent: number;
      limit_window_seconds: number;
      reset_after_seconds: number;
      reset_at: number;
    } | null;
  };
  code_review_rate_limit: {
    allowed: boolean;
    limit_reached: boolean;
    primary_window: {
      used_percent: number;
      limit_window_seconds: number;
      reset_after_seconds: number;
      reset_at: number;
    };
  };
  additional_rate_limits: unknown;
  credits: unknown;
  promo: unknown;
}

export async function getOpenaiQuota(creds: Credentials): Promise<openaiQuota> {
  if (!creds.openaiApiKey) {
    throw new Error("Missing OpenAI API key in credentials.");
  }

  const headers = new Headers();
  headers.append("Authorization", `Bearer ${creds.openaiApiKey}`);
  headers.append("User-Agent", "OpenCode-Quota-Plugin/1.0");
  if (creds.openaiAccountId) {
    headers.append("ChatGPT-Account-Id", creds.openaiAccountId);
  }

  const response = await fetch("https://chatgpt.com/backend-api/wham/usage", {
    method: "GET",
    headers,
    redirect: "follow",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch OpenAI quota. Status: ${response.status}, Response: ${errorText}`,
    );
  }

  const result = (await response.json()) as openaiQuotaRawResponse;

  const finalResult: openaiQuota = {
    accountEmail: result.email,
    accountType: result.plan_type,
    rateLimitPrimaryWindow: {
      usedPercent: null,
      remainingPercent: null,
      resetAt: null,
      resetIn: null,
    },
    rateLimitSecondaryWindow: {
      usedPercent: null,
      remainingPercent: null,
      resetAt: null,
      resetIn: null,
    },
    codeReviewPrimaryWindow: {
      usedPercent: null,
      remainingPercent: null,
      resetAt: null,
      resetIn: null,
    },
  };

  const primary = result.rate_limit.primary_window;
  if (primary) {
    const quota = {} as openaiQuota["rateLimitPrimaryWindow"];
    quota.usedPercent = clampPercent(primary.used_percent);
    quota.remainingPercent = clampPercent(100 - quota.usedPercent);
    quota.resetAt = unixSecondsToIso(primary.reset_at);
    quota.resetIn = formatTimeUntil(quota.resetAt);
    finalResult.rateLimitPrimaryWindow = quota;
  }

  const secondary = result.rate_limit.secondary_window;
  if (secondary) {
    const quota = {} as openaiQuota["rateLimitSecondaryWindow"];
    quota.usedPercent = clampPercent(secondary.used_percent);
    quota.remainingPercent = clampPercent(100 - quota.usedPercent);
    quota.resetAt = unixSecondsToIso(secondary.reset_at);
    quota.resetIn = formatTimeUntil(quota.resetAt);
    finalResult.rateLimitSecondaryWindow = quota;
  }

  const codeReview = result.code_review_rate_limit.primary_window;
  if (codeReview) {
    const quota = {} as openaiQuota["codeReviewPrimaryWindow"];
    quota.usedPercent = clampPercent(codeReview.used_percent);
    quota.remainingPercent = clampPercent(100 - quota.usedPercent);
    quota.resetAt = unixSecondsToIso(codeReview.reset_at);
    quota.resetIn = formatTimeUntil(quota.resetAt);
    finalResult.codeReviewPrimaryWindow = quota;
  }

  return finalResult;
}

function unixSecondsToIso(value: number): string {
  if (!Number.isFinite(value)) {
    return "unknown";
  }

  const date = new Date(value * 1000);
  if (Number.isNaN(date.getTime())) {
    return "unknown";
  }

  return date.toISOString();
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round(value * 100) / 100));
}
