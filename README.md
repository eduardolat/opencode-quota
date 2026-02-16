# OpenCode Quota Plugin

Get your AI subscription usage directly inside OpenCode with a single `quota` tool.

## What it gives you

- GitHub Copilot quota (used, remaining, reset time)
- ChatGPT/Codex quota windows (primary, secondary, code review)
- Z.ai token + MCP quota usage
- Human-readable reset countdowns (`2d 4h`, `1h 20m`)

## Install

### 1. Install thee plugin

Add this to your `config.json`, [learn more here.](https://opencode.ai/docs/config/)

```json
{
  "plugin": ["opencode-quota-plugin"]
}
```

### 2. Add the command to trigger the plugin

Download the [quota.md](https://raw.githubusercontent.com/eduardolat/opencode-quota-plugin/refs/heads/main/quota.md) file and place in your opencode `commands` directory.

Learn more about the `commands` directory and it's path [here.](https://opencode.ai/docs/commands/)

### 3. Use the plugin

Open `OpenCode`, run `/quota` command and done!

## Notes

- Credentials are read from `~/.local/share/opencode/auth.json`
- Only configured providers are queried
- Output is returned as formatted JSON
