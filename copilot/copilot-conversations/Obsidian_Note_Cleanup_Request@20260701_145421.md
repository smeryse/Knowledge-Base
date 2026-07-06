---
epoch: 1782906861454
modelKey: "google/gemini-2.5-flash|openrouterai"
topic: "Obsidian Note Cleanup Request"



tags:
  - copilot-conversation
---

**user**: Clean up and organize this Obsidian note: fix spelling and grammar, remove repetition and filler, structure it logically using headings (##, ###), bullet points, and emphasis (bold, italics), and add [[wiki-links]] between related concepts where appropriate. Preserve the original meaning and tone — don't invent or omit important details. Output clean Markdown ready to paste into Obsidian.
[Context: Notes: 00-Inbox/Cursor Pro.md]
[Timestamp: 2026/07/01 14:54:21]

**ai**: ```markdown
---
tags:
  - ai
  - ide
---

# Cursor Pro

## Сброс настроек

Для сброса настроек Cursor Pro до значений по умолчанию используйте следующую команду:

```bash
rm -rf ~/.config/Cursor ~/.cursor ~/.cursor-viprc ~/Documents/.cursor-free-vip
```

## Сброс Machine ID

Для сброса Machine ID воспользуйтесь утилитой, выполнив следующие команды:

```bash
curl -fsSL https://raw.githubusercontent.com/yeongpin/cursor-free-vip/main/scripts/install.sh -o install.sh && chmod +x install.sh && ./install.sh
```
```
[Timestamp: 2026/07/01 14:54:22]

**user**: For {activeNote}, update only the "tags" property in the YAML frontmatter — add relevant tags in English. Do not modify, remove, or reformat any other existing properties (keep their exact values, order, and formatting).

Format tags strictly as a YAML list, one tag per line, each prefixed with "- " and indented under "tags:", like this:
tags:
  - example_one
  - example_two

Do not use inline/flow style (tags: a, b, c) — always use the block list style shown above.

Output the full YAML frontmatter block (all properties, with the updated tags) as plain text, starting with --- and ending with ---.

CRITICAL: Do not wrap the output in triple backticks (```) under any circumstances. Do not treat this as a code block. Your entire response must contain zero backtick characters. Just output the raw text starting directly with --- and nothing else — no preamble, no explanation, no markdown formatting of any kind.
[Context: Notes: 00-Inbox/Cursor Pro.md]
[Timestamp: 2026/07/01 14:54:48]

**ai**: ---
tags:
  - ai
  - ide
  - cursor
  - ide_settings
  - machine_id
  - cli
  - bash
---
[Timestamp: 2026/07/01 14:54:49]