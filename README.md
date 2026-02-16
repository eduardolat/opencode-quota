# OpenCode Quota Plugin

Get your AI subscription usage directly inside OpenCode with a single `quota` tool.

## What it gives you

- GitHub Copilot quota (used, remaining, reset time)
- ChatGPT/Codex quota windows (primary, secondary, code review)
- Z.ai token + MCP quota usage
- Human-readable reset countdowns (`2d 4h`, `1h 20m`)

## Quick start

Change the quota command to meet your preferences.

```json
{
  "plugin": ["opencode-quota-plugin"],
  "command": {
    "quota": {
      "description": "Query AI quota usage",
      "template": "Use the `quota` tool to query AI quota usage. Return the result formatted for humans."
    }
  }
}
```

## Notes

- Credentials are read from `~/.local/share/opencode/auth.json`
- Only configured providers are queried
- Output is returned as formatted JSON
