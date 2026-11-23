# Status flow

The Tasks database **Status** is the only way the relay and Claude talk to each
other. Each status has exactly one owner.

```
New --(Manager)--> Plan ready --(Boss: Go)--> Go --(Manager)--> Awaiting Boss
                       ^  (Boss: Edit -> New)      |   ^              |
                       |                           |   |   (Boss: Approve) -> Approved -> Archived
                       |        Gate 1 / Name gate-+   |        (relay publishes the Google Doc)
                       |        (Boss decides -> Go)   |
                       |                                (Boss: Revise) -> Revise --(Claude)--> Awaiting Boss
```

| Status | Set by | Meaning | What happens next |
| --- | --- | --- | --- |
| New | Relay (`/task`, `/ask`, `/brief`) or Boss (Edit) | Request waiting for a plan | Manager plans it at the next run |
| Plan ready | Manager | A plan is written on the page | Relay sends **Go / Edit** |
| Go | Relay, after the Boss taps Go, Include, Internal only, Allow names or Use codes | Cleared to work | Manager does the next step |
| In progress | Manager | Work started in this run | Manager sets the next status before the run ends |
| Gate 1 | Manager | Outside sources are listed on the page | Relay sends **Include / Internal only**, then sets `Gate 1` and status Go |
| Name gate | Manager | The product would name participants | Relay sends **Allow names / Use codes**, then sets `Name permission` and status Go |
| Awaiting Boss | Manager | The deliverable is under the "Final" heading | Relay sends **Approve / Revise** |
| Revise | Relay, after the Boss sends a revise note | Note saved in `Boss feedback` and in the page body | Claude applies it at the next revision run |
| Approved | Relay | Boss approved | Relay publishes, then sets Archived |
| Archived | Relay | Google Doc made, Archive row created | Done |

If publishing fails, the relay puts the task back to **Awaiting Boss** and sends
the buttons again.

## Rules Claude must follow

1. Only change Status along the arrows above. Never set Approved or Archived.
2. Put the deliverable under a heading that starts with **Final**, as the last
   section of the page. Replace its content on every revision. Use only headings,
   paragraphs and bullet or numbered lists there. No tables.
3. Keep the plan under a heading **Plan**, outside "Final".
4. Never lower `Data Level`. Never write participant names unless `Name permission`
   is `Allowed`; use initials or "peserta A" instead.
5. If `Gate 1` is `Internal only`, do not use outside sources.
6. Add one line to the Agent Log for each task you finish a step on. No case content in it.

## Property values the relay writes

| Property | Values |
| --- | --- |
| Gate 1 | Include, Internal only |
| Name permission | Not asked, Allowed, Use codes |
| Lessons > Status | Proposed (by relay), Approved or Rejected (Boss taps) |
