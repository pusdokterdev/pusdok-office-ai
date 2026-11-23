# skills

One folder per office role. Each folder holds one `SKILL.md`: the instructions
Claude loads for that role.

| Folder | Role | Status |
| --- | --- | --- |
| `editorial-feature/` | Journalist+Editor | Write first (phase 4) |
| `admin-naskah-dinas/` | Admin | Phase 5 |
| `research-policy/` | Researcher | Phase 5 |
| `planner-kak-tor/` | Planner | Phase 5 |
| `manager-router/` | Manager | Phase 5 |
| `media-canva/` | Media | Phase 6 |
| `it-maintainer/` | IT Expert | Phase 6 |

Folders appear here as each skill is written. Start from `_template/SKILL.md`.

## How to write a skill

1. In Claude, use the **skill-creator** skill (from github.com/anthropics/skills).
   Give it two or three real examples you were happy with, with names removed.
2. Test it by hand in the AI Office Project until you would sign the output.
3. Upload it to Claude as a custom skill, then commit the folder here.
4. After a month, merge approved lessons into it (see below).

## Rules

- **One role per skill.** Keep each `SKILL.md` under about 150 lines. Long
  reference material goes in a second file in the same folder, linked from `SKILL.md`.
- **Examples use invented data only.** No real names, places or cases.
- **The description is the trigger.** Claude decides to load a skill from its
  one-line description, so say exactly when to use it.
- Skills never contain secrets, tokens or database IDs.

## Lessons loop

Every revise note becomes a proposed lesson in Notion. On Fridays you approve or
reject them in Telegram. Approved lessons are added to the role's `SKILL.md`
under `## Lessons`, one rule per line with the date, then the lesson's Notion
Status is set to Merged. When a skill nears 150 lines, merge overlapping lessons.
