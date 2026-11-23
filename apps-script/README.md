# Apps Script relay (pusdok-relay)

A free, always-on bridge between Telegram and Notion. It runs in Google's cloud
under your Google account. **It does no AI work**: it saves what you send, shows
you buttons, and builds the final Google Doc. Claude reads and writes Notion
separately, on its own schedule.

## What it does

| You do | The relay does |
| --- | --- |
| Send text, `/note`, a link, a PDF, a photo | Saves it to the Notion Inbox (files go to Drive, text is extracted with Drive OCR) |
| Send a voice note | Saves the file to Drive. It is not transcribed. |
| `/task`, `/ask`, `/brief` | Creates a Task in Notion with status *New* |
| (nothing) | Every 5 minutes: sends buttons for tasks at *Plan ready*, *Gate 1*, *Name gate*, *Awaiting Boss* |
| Tap **Approve** | Copies the "Final" section into a Google Doc, archives it in Notion, sends you the link |
| Tap **Revise**, then send a note | Saves the note on the task, sets *Revise*, and adds a proposed lesson |
| Fridays | Sends the week's proposed lessons with Approve / Reject buttons |

Safety: it only answers your own Telegram chat ID, ignores any call without the
secret key, never sends secrets in alerts, and skips updates it has already seen.

## Files

| File | Purpose |
| --- | --- |
| `appsscript.json` | Project settings (time zone, Drive advanced service, web app access) |
| `Config.gs` | Statuses, buttons, Notion property names, expected columns |
| `Code.gs` | Entry points, commands, button handling, the two triggers |
| `Telegram.gs` | Telegram API calls |
| `Notion.gs` | Notion API calls |
| `Files.gs` | Web pages, Drive, OCR |
| `Publish.gs` | Approved task to Google Doc and Archive row |
| `Setup.gs` | One-time functions you run from the editor |
| `Tests.gs` | `runTests()` for the pure functions |

## Setup (about 5 hours, once)

**Before you start:** the six Notion databases from `docs/notion-schema.md` exist,
and your Telegram bot token is saved in a password manager.

1. **Create the project.** Open script.google.com, choose *New project*, and name it `pusdok-relay`. Use the Google account that should own the relay and the Drive files.
2. **Show the manifest.** *Project Settings* (gear icon) > tick *Show "appsscript.json" manifest file in editor*. Open `appsscript.json` in the editor and replace its content with the file from this folder.
3. **Add the code files.** Click **+** next to *Files* > *Script*, name it without `.gs` (for example `Config`), and paste the matching file. Do this for all 8 `.gs` files. Delete the default `Code.gs` first, or paste over it.
4. **Check the Drive service.** Click **+** next to *Services*. If *Drive API* v3 is not listed, add it with the identifier `Drive`.
5. **Add secrets.** *Project Settings* > *Script properties* > *Add script property*:

   | Property | Value |
   | --- | --- |
   | `TELEGRAM_TOKEN` | Token from @BotFather |
   | `CHAT_ID` | Your own numeric ID. Message @userinfobot to get it. |
   | `WEBHOOK_SECRET` | Run `generateWebhookSecret` once and paste the result |
   | `NOTION_TOKEN` | Secret of your Notion internal integration |
   | `DB_INBOX`, `DB_TASKS`, `DB_ARCHIVE`, `DB_LESSONS`, `DB_LOG` | The 32-character ID in each database's URL |
   | `DOC_TEMPLATE_ID` | Optional. ID of a Google Doc that contains `{{title}}`, `{{date}}` and `{{body}}` |

6. **Share the databases.** In Notion, open each of the five databases > **•••** > *Connections* > add your integration.
7. **Run `checkSetup`.** Pick it in the toolbar and press *Run*. Google asks you to authorize the script once. Open the Execution log. Fix every problem it lists, then run it again until it says `ALL CHECKS PASSED`.
8. **Deploy.** *Deploy* > *New deployment* > gear icon > *Web app*. *Execute as*: **Me**. *Who has access*: **Anyone**. Press *Deploy*. (Telegram has no Google login, so access must be *Anyone*. The secret key and your chat ID are the lock.)
9. **Connect Telegram.** Run `setupWebhook`, then `installTriggers`, then `checkWebhook`.
10. **Test.** Send `/ping` to your bot and tap **Approve**. A row should appear in the Notion Agent Log.

## Updating the code later

Paste the new code, then **Deploy > Manage deployments > pencil icon > Version: New version > Deploy**.
Saving alone does not change what Telegram calls. The web app address stays the same.

## Everyday use

`/help` shows the commands. Send `/status` to see tasks by status.

## If something goes wrong

| Symptom | Check |
| --- | --- |
| No reply to `/ping` | Run `checkWebhook`. Look at *Last error* and *Pending updates*. Confirm `CHAT_ID` is your own ID and the deployment is *Anyone*. |
| `⚠️ relay error` in Telegram | The message says which step failed. `Notion ... 404` means the database is not shared with the integration. `400` usually means a column name or type is wrong: run `verifySchema`. |
| Buttons arrive late | The 5-minute trigger. Run `installTriggers` if it is missing (*Triggers* in the left bar). |
| Approve says publishing failed | The task page needs a heading starting with **Final** and some text under it. See `docs/status-flow.md`. |
| PDF text is empty | Drive OCR may refuse very large or scanned files. Upload to Notion directly, or split the file. |
| Need to stop everything | Run `removeWebhook`, then delete the triggers. |

## Known limits

- Notion text properties hold 2,000 characters, so long text is stored in the page body.
- Only headings, paragraphs and bullet or numbered lists under *Final* reach the Google Doc. Tables and nested lists are skipped.
- A run is limited to about 6 minutes by Google. Very large files can hit that limit.
- Google Drive OCR limits on file size and Telegram's 20 MB bot limit apply. Both limits are unverified here, so test with a real file.
- This code was tested against a simulated Telegram, Notion and Drive, **not** the real services. Your first real run is the real test: do it with invented data.
