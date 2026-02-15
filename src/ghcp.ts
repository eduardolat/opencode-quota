import type { Credentials } from "./creds";
import { formatTimeUntil } from "./helpers";

export interface ghcpQuota {
  accountEmail: string;
  accountType: string;
  premiumRequestsTotal: number;
  premiumRequestsUsed: number;
  premiumRequestsUsedPercent: number;
  premiumRequestsRemaining: number;
  premiumRequestsRemainingPercent: number;
  resetAt: string;
  resetIn: string;
}

interface ghcpQuotaRawResponse {
  login: string;
  access_type_sku: string;
  analytics_tracking_id: string;
  assigned_date: string;
  can_signup_for_limited: boolean;
  chat_enabled: boolean;
  copilotignore_enabled: boolean;
  copilot_plan: string;
  organization_login_list: Array<unknown>;
  organization_list: Array<unknown>;
  restricted_telemetry: boolean;
  endpoints: {
    api: string;
    "origin-tracker": string;
    proxy: string;
    telemetry: string;
  };
  quota_reset_date: string;
  quota_snapshots: {
    chat: {
      entitlement: number;
      overage_count: number;
      overage_permitted: boolean;
      percent_remaining: number;
      quota_id: string;
      quota_remaining: number;
      remaining: number;
      unlimited: boolean;
      timestamp_utc: string;
    };
    completions: {
      entitlement: number;
      overage_count: number;
      overage_permitted: boolean;
      percent_remaining: number;
      quota_id: string;
      quota_remaining: number;
      remaining: number;
      unlimited: boolean;
      timestamp_utc: string;
    };
    premium_interactions: {
      entitlement: number;
      overage_count: number;
      overage_permitted: boolean;
      percent_remaining: number;
      quota_id: string;
      quota_remaining: number;
      remaining: number;
      unlimited: boolean;
      timestamp_utc: string;
    };
  };
  quota_reset_date_utc: string;
}

export async function getGhcpQuota(creds: Credentials): Promise<ghcpQuota> {
  const headers = new Headers();
  headers.append("Authorization", `token ${creds.ghcpApiKey}`);
  headers.append("Accept", "application/json");
  headers.append("Content-Type", "application/json");
  headers.append("User-Agent", "GitHubCopilotChat/0.35.0");
  headers.append("Editor-Version", "vscode/1.107.0");
  headers.append("Editor-Plugin-Version", "copilot-chat/0.35.0");
  headers.append("Copilot-Integration-Id", "vscode-chat");

  const response = await fetch("https://api.github.com/copilot_internal/user", {
    method: "GET",
    headers: headers,
    redirect: "follow",
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch GitHub Copilot quota. Status: ${response.status}, Response: ${errorText}`,
    );
  }

  const result = (await response.json()) as ghcpQuotaRawResponse;

  const pi = result.quota_snapshots.premium_interactions;
  const prTotal = pi.entitlement;
  const prRemaining = pi.remaining;
  const prUsed = Math.max(0, prTotal - prRemaining);
  const prRemainingPercent = pi.percent_remaining;
  const prUsedPercent = Math.max(0, 100 - prRemainingPercent);

  return {
    accountEmail: result.login,
    accountType: result.access_type_sku,
    premiumRequestsTotal: prTotal,
    premiumRequestsUsed: prUsed,
    premiumRequestsUsedPercent: prUsedPercent,
    premiumRequestsRemaining: prRemaining,
    premiumRequestsRemainingPercent: prRemainingPercent,
    resetAt: result.quota_reset_date_utc,
    resetIn: formatTimeUntil(result.quota_reset_date_utc),
  };
}
