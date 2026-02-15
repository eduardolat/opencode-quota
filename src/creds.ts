import { homedir } from "node:os";
import { join } from "node:path";

interface Credentials {
  ghcpApiKey?: string;
  zaiApiKey?: string;
  openaiApiKey?: string;
  openaiAccountId?: string;
}

/**
 * Reads API keys and account information from the OpenCode auth.json file located in the user's home directory.
 * @returns An object containing the retrieved credentials.
 */
export async function getCredentials(): Promise<Credentials> {
  const authFilePath = join(homedir(), ".local/share/opencode/auth.json");
  const creds: Credentials = {};

  try {
    const file = Bun.file(authFilePath);
    const text = await file.text();
    const config = JSON.parse(text);

    creds.zaiApiKey = config?.["zai-coding-plan"]?.key ?? undefined;
    creds.ghcpApiKey = config?.["github-copilot"]?.access ?? undefined;
    creds.openaiApiKey = config?.openai?.access ?? undefined;
    creds.openaiAccountId = config?.openai?.accountId ?? undefined;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Error reading auth file: ", message);
    throw new Error(
      `Failed to read auth file. Please ensure it exists and is properly formatted. Error details: ${message}`,
    );
  }

  return creds;
}
