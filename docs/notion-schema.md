# Notion schema

Six databases under one parent page, "AI Office". Share each with your Notion
integration (••• > Connections). Property names and types must match exactly:
`checkSetup` in the relay compares them and lists differences.

Select properties create new options automatically the first time the relay or
Claude writes a new value. Create the options marked **(create now)** by hand so
you can see them and set colours.

## Inbox

| Property | Type | Notes |
| --- | --- | --- |
| Title | Title | |
| Source | Select | Telegram, Upload, Web |
| Type | Select | Field note, Journal, Article, Doc |
| Data Level | Select | **(create now)** `1 Public`, `2 Internal`, `3 Restricted`. New items start at `3 Restricted`. |
| Name permission | Select | **(create now)** `Not asked`, `Allowed`, `Use codes` |
| Tags | Multi-select | Your fixed list of 20 to 30 tags. Claude may only choose from it. |
| Abstract | Text | 5 bullets, filled by Claude |
| Processed | Checkbox | Claude ticks it after tagging |
| Captured at | Date | Set by the relay |
| Source link | URL | The web page or the Drive file |

The extracted text of a note, page or file is in the page body, not in a property.

## Tasks

| Property | Type | Notes |
| --- | --- | --- |
| Task | Title | |
| Type | Select | Weekly brief, KAK-TOR, Policy brief, Nota Dinas, Feature, PPT, Question, Other |
| Assigned role(s) | Multi-select | Manager, Planner, Researcher, Admin, Journalist+Editor, Media, IT Expert |
| Status | **Select** | **(create now)** New, Plan ready, Go, In progress, Gate 1, Name gate, Awaiting Boss, Revise, Approved, Archived. Use a Select, not Notion's built-in Status type. |
| Due | Date | |
| Data Level | Select | Same options as Inbox |
| Output link | URL | The Google Doc, set by the relay on approval |
| Boss feedback | Text | Your latest revise note |
| Gate 1 | Select | **(create now)** `Include`, `Internal only` |
| Name permission | Select | Same options as Inbox |

Add a board view grouped by Status. That is your office view.

## Archive

| Property | Type |
| --- | --- |
| Title | Title |
| Document type | Select |
| Date | Date |
| Doc link | URL |
| Related task | URL |

## Lessons

| Property | Type | Notes |
| --- | --- | --- |
| Lesson | Title | One rule, in your words |
| Role | Select | Optional |
| Source task | URL | |
| Status | Select | **(create now)** Proposed, Approved, Rejected, Merged |
| Date | Date | |

## Agent Log

| Property | Type |
| --- | --- |
| Event | Title |
| Time | Date |
| From role | Text |
| To role | Text |
| Task | Text |
| Note | Text (one line, never case content) |

## Second Brain (wiki)

The relay does not touch this database. Claude does.

| Property | Type | Notes |
| --- | --- | --- |
| Topic | Title | |
| Segment | Select | Rehabilitasi, Reintegrasi, Kebijakan, Intel Lapangan, Kajian |
| Related | Relation | To this same database |
| Sources | Relation | To Inbox |
| Mind map | Text | Optional, Mermaid code |

## Locked page

"Kunci Kode": the key that maps codes back to names. Share it with nobody, and
do not share it with the Notion integration.
