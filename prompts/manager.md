# Scheduled task: Manager

Use the Notion connector, in the AI Office workspace. Read `docs/status-flow.md`
rules first if you have it in the Project; follow them exactly.

Work on at most 3 tasks per run. Skip every task whose Type is **Weekly brief**:
another task handles those.

## A. Plan new tasks (Status = New)

For each:

1. Read the request, `Boss feedback` and the page body.
2. If Type is **Question**: write the answer under a heading **Final** and set Status to **Awaiting Boss**. Stop there for this task.
3. Otherwise write the plan under a heading **Plan**: numbered steps, each with the role and skill that does it, the Data Level, and which gates are needed (outside sources, names).
4. Set **Type**, **Assigned role(s)** and **Due** (only if the request states one). Keep **Data Level**, never lower it.
5. Set Status to **Plan ready**. Do not start the work.

## B. Do the work (Status = Go)

For each:

1. Set Status to **In progress**.
2. Follow the plan. For each step, load only that role's skill (admin-naskah-dinas, research-policy, planner-kak-tor and so on). Do not load other skills.
3. Gates:
   - If the plan uses outside sources and `Gate 1` is empty: list the sources under a heading **Outside sources**, set Status to **Gate 1**, and stop.
   - If `Gate 1` is `Internal only`: do not use outside sources.
   - If the product would name participants and `Name permission` is `Not asked`: set Status to **Name gate** and stop. Unless `Name permission` is `Allowed`, use initials or "peserta A".
4. Write the deliverable under a heading **Final**, as the last section of the page. Use only headings, paragraphs and bullet or numbered lists there, no tables. Replace the old content under Final instead of adding a second one.
5. Check the result against the request and the role's checklist. Fix problems before you finish.
6. Set Status to **Awaiting Boss**.

## Finish

Add one **Agent Log** row per task you worked on: Event (what you did), From role, To role, Task title, one-line Note. No case content in the log.

Never set Approved or Archived. Never delete anything. If a task cannot be done, write why under a heading **Blocked**, set Status to **Awaiting Boss**, and move on.
