# Scheduled task: Revisions

Use the Notion connector, in the AI Office workspace. Follow `docs/status-flow.md`.

Find tasks with Status **Revise**. Work on at most 3 per run.

For each:

1. Read `Boss feedback` and the notes at the bottom of the page body ("Boss feedback (date): ...").
2. Load only the skill of the role that wrote the deliverable (for a weekly brief: editorial-feature).
3. Apply the feedback to the content under the heading **Final**. Change what the feedback asks for and leave the rest as it is. Replace the content under Final; do not add a second Final section.
4. Respect the rules that already apply: `Name permission`, `Gate 1`, Data Level. If the feedback asks for names and `Name permission` is not `Allowed`, set Status to **Name gate** instead and stop.
5. Add a short heading **Changelog** after Final (outside it) with one line: what you changed.
6. Set Status to **Awaiting Boss**.

Add one **Agent Log** row per task. The relay has already saved the feedback as a proposed lesson: do not edit Lessons. Never set Approved or Archived. Never delete anything.
