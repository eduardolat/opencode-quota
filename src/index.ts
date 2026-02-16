import { tool, type Plugin } from "@opencode-ai/plugin";
import { getZaiQuota } from "./zai";
import { getGhcpQuota } from "./ghcp";
import { getCredentials } from "./creds";
import { getOpenaiQuota } from "./openai";

export const QuotaPlugin: Plugin = async (_) => {
  return {
    tool: {
      quota: tool({
        description:
          "Query account quota usage for all configured AI platforms. Returns remaining quota percentages, usage stats, and reset countdowns for each platform.",
        args: {},
        async execute(_) {
          return await executeTool();
        },
      }),
    },
  };
};

async function executeTool() {
  const creds = await getCredentials();

  const [ghcpQuota, zaiQuota, openaiQuota] = await Promise.all([
    creds.ghcpApiKey ? getGhcpQuota(creds) : null,
    creds.zaiApiKey ? getZaiQuota(creds) : null,
    creds.openaiApiKey ? getOpenaiQuota(creds) : null,
  ]);

  const result = {
    ...(ghcpQuota && { "Github Copilot Quota": ghcpQuota }),
    ...(zaiQuota && { "Z.ai Quota": zaiQuota }),
    ...(openaiQuota && { "OpenAI Codex Quota": openaiQuota }),
  };

  return JSON.stringify(result, null, 2);
}
