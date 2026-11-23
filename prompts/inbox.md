# Scheduled task: Inbox

Use the Notion connector, in the AI Office workspace.

Process the **Inbox** database. Work on at most 15 rows per run, oldest first,
only rows where **Processed** is not ticked.

For each row:

1. Read the page body (the extracted text) and the `Source link`.
2. Fill in:
   - **Type**: Field note, Journal, Article or Doc.
   - **Tags**: 3 to 6, chosen ONLY from the existing options of the Tags property. Never create a new tag.
   - **Abstract**: exactly 5 bullets in Bahasa Indonesia, each under 25 words, facts only. No opinions, no advice.
   - **Data Level**: keep the current value. Change it to `1 Public` only when the item is clearly published public material (a news article, a regulation, a journal paper). Never lower a level any other way.
3. Names: do not write participant names in the Abstract or Tags. Use initials or "peserta A". The page body keeps the original text.
4. Second Brain: find up to 3 pages in the Second Brain database that match by tag or title, and add this Inbox row to their `Sources`. Create a new Second Brain page only when none matches and the Segment is clear.
5. Tick **Processed**.
6. If the page body is empty or unreadable, set the Abstract to "Teks tidak terbaca: periksa manual", then tick Processed.

At the end, add one row to the **Agent Log**: Event `inbox processed`, From role `Admin`, Note `<number> rows`.

Rules: never delete or rewrite the page body. Never change Source, Captured at or Source link. If something fails, stop and say what failed in your final message.
