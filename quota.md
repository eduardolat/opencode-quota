---
description: Query quota usage for all AI accounts
---

Use the `quota` tool to query quota usage for all AI accounts.

Then transform the result into a compact, normalized, and consistency-checked quota summary.

## CRITICAL RULES

1. Completely omit failed accounts and any error messages.
2. Do NOT output raw tool output.
3. Do NOT print placeholders like “Not available”, “N/A”, or “NaN”. If data is missing, omit that field.
4. Do NOT guess values. Only compute values when unambiguous.
5. Providers return different formats. Normalize everything into one clean structure.
6. The output must be compact, space-efficient, and easy to scan.

## PERCENTAGE & AMOUNT SAFETY LOGIC (error-resistant)

7. Percentages must always be explicitly labeled as USED% or REMAINING%.
8. If the tool explicitly states “X% remaining”, treat it as REMAINING%.
9. If the tool shows “X% (a/b)”:
   - If a/b ≈ X% → X% is USED%.
   - If (b-a)/b ≈ X% → X% is REMAINING%.
     (Allow rounding tolerance up to 2 percentage points.)
   - If neither matches, omit percentages and only print amounts.
10. If only REMAINING% is known reliably → USED% = 100 - REMAINING%.
11. If only USED% is known reliably → REMAINING% = 100 - USED%.
12. If used and total are known (a/b), compute remaining = b - a.
13. If any numeric value is invalid (NaN/undefined), omit that field and do not derive from it.
14. If any inconsistency is detected (e.g., percentages don’t sum to 100, or used + remaining ≠ total), remove the inconsistent percentage lines.

UNIFIED QUOTA LINE FORMAT
For each quota window, print everything in ONE compact block:

- <Quota Name>
  Usage: <Used amount> / <Limit> | Used <USED%> | Remaining <REMAINING%>
  Reset: <countdown> | <YYYY-MM-DD>

Formatting rules for the unified lines:
• If only percentage is known → print only percentages.
• If only amount is known → print only amounts.
• If both are known → print both.
• If limit is unknown → omit “/ <Limit>”.
• If reset date cannot be reliably derived → print only countdown.
• Reset must always show countdown first, then date, on the same line when both exist.

## MULTIPLE QUOTAS

15. Providers may have multiple quota windows (5-hour, 7-day, monthly, premium, per-model, etc.).
    Each must appear as its own “- <Quota Name>” block.
16. Preserve model names or sub-accounts cleanly inside the quota name when necessary (e.g., “G3 Pro — Daily”).

# OUTPUT STRUCTURE (exact layout)

# AI QUOTA REPORT

Provider: <Provider Name>
Account: <Identifier as provided>

- <Quota Name>
  Usage: ...
  Reset: ...

- <Quota Name>
  Usage: ...
  Reset: ...

---

(repeat per provider)

## FINAL VALIDATION BEFORE OUTPUT

17. Ensure the report is compact, aligned, and free of redundant empty lines.
18. Ensure all percentages are clearly labeled.
19. Ensure no ambiguous interpretation of percentage meaning.
20. Return ONLY the normalized report.
