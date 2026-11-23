# prompts

One file per Claude scheduled task. Each file is the prompt you paste into the
task. They all follow `docs/status-flow.md`; read it first.

| File | Scheduled task | When (WIB) | Does |
| --- | --- | --- | --- |
| `inbox.md` | Inbox | 12:00 and 20:00 | Tags and summarizes new Inbox items |
| `manager.md` | Manager | 07:00, 12:00 and 16:00 | Plans new tasks, runs tasks marked Go |
| `weekly-brief.md` | Weekly brief | Thursday 13:00 | Drafts the Tulisan Feature |
| `revisions.md` | Revisions | 16:00 daily and 06:00 on Fridays | Applies your revise notes |

## How to set one up

1. In the Claude app, open the **AI Office** Project and make sure the Notion
   connector is on and your role skills are uploaded.
2. Create a scheduled task, set the time from the table, and paste the whole prompt.
3. Run it once by hand with a test item before trusting the schedule.

## Rules for editing a prompt

- Use the exact Status words and property names from `docs/notion-schema.md`.
- Keep a prompt under about one page. Put detail in a skill, not here.
- Change one thing at a time and test with invented data.
- Do not paste real names, case details or secrets into a prompt.
