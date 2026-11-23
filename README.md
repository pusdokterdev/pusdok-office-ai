# pusdok-office-ai

The AI Agent Office: Notion is the memory, Telegram is the remote control,
Claude Team does the thinking, and a small free Google Apps Script relay
connects Telegram to Notion around the clock.

```
You (Telegram)  <->  Apps Script relay  <->  Notion  <->  Claude Team
                     (free, always on,                    (scheduled runs
                      no AI)                               + the app)
```

| Folder | What it holds |
| --- | --- |
| `apps-script/` | The relay code. Copy it into a Google Apps Script project. Start with its README. |
| `skills/` | The role skills (one `SKILL.md` per office role) that Claude loads. |
| `prompts/` | The instructions for each Claude scheduled task. |
| `docs/` | Notion database layout, status flow, data rules. |

## Rules for this repository

- **Never commit secrets.** Tokens, API keys and database IDs live in Apps Script
  *Script Properties*, never in a file here. `.gitignore` blocks the usual mistakes,
  but check before every commit.
- **Keep the repository private.** Skills and prompts describe how the agency works.
- **No real names or case details** in any file here, including examples. Use invented data.
- A change to `docs/status-flow.md` or `docs/notion-schema.md` usually needs a matching
  change in `apps-script/Config.gs` and in `prompts/`. Update all three together.

## Where to start

1. `apps-script/README.md`: build the relay (about 5 hours, once).
2. `docs/notion-schema.md`: create the six Notion databases.
3. `prompts/README.md`: create the Claude scheduled tasks.
4. `skills/README.md`: write the role skills, one at a time.
