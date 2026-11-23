/**
 * Setup.gs: functions YOU run once from the Apps Script editor
 * (pick the function in the toolbar, press Run, read the Execution log).
 * Order: generateWebhookSecret > (set Script Properties) > checkSetup >
 *        deploy as Web app > setupWebhook > installTriggers > checkWebhook.
 */

/** Step 1: prints a random secret. Paste it into the WEBHOOK_SECRET property. */
function generateWebhookSecret() {
  const secret = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  Logger.log('WEBHOOK_SECRET = ' + secret);
}

/** Step 2: checks properties, Telegram, Notion access, database columns and Drive. */
function checkSetup() {
  const problems = [];
  const props = PropertiesService.getScriptProperties();

  REQUIRED_PROPS.forEach(function (k) {
    if (!props.getProperty(k)) problems.push('Missing Script Property: ' + k);
  });
  if (problems.length) return finishCheck_(problems);

  try {
    const me = tg_('getMe');
    Logger.log('Telegram bot OK: @' + me.username);
  } catch (err) {
    problems.push('Telegram: ' + redact_(err.message));
  }

  try {
    const me = notion_('get', '/users/me');
    Logger.log('Notion integration OK: ' + (me.name || me.id));
  } catch (err) {
    problems.push('Notion: ' + redact_(err.message));
  }

  Array.prototype.push.apply(problems, verifySchema());

  try {
    Logger.log('Drive folders OK: ' + getInboxFolder_().getName() + ', ' + getOutputFolder_().getName());
  } catch (err) {
    problems.push('Drive: ' + err.message);
  }

  const tpl = props.getProperty('DOC_TEMPLATE_ID');
  if (tpl) {
    try {
      const text = DocumentApp.openById(tpl).getBody().getText();
      if (text.indexOf('{{body}}') === -1) problems.push('DOC_TEMPLATE_ID: the template has no {{body}} placeholder.');
      else Logger.log('Doc template OK');
    } catch (err) {
      problems.push('DOC_TEMPLATE_ID: ' + err.message);
    }
  } else {
    Logger.log('No DOC_TEMPLATE_ID set: documents will use a plain layout.');
  }

  try {
    Drive.About.get({ fields: 'user' });
    Logger.log('Drive advanced service OK (needed for OCR)');
  } catch (err) {
    problems.push('Drive advanced service is not enabled: Services (+) > Drive API > v3. ' + err.message);
  }
  finishCheck_(problems);
}

function finishCheck_(problems) {
  if (!problems.length) {
    Logger.log('ALL CHECKS PASSED');
  } else {
    Logger.log('PROBLEMS FOUND (' + problems.length + '):\n- ' + problems.join('\n- '));
  }
  return problems;
}

/** Compares every Notion database with what the relay expects. Returns a list of problems. */
function verifySchema() {
  const problems = [];
  Object.keys(EXPECTED_SCHEMA).forEach(function (propKey) {
    const dbId = PropertiesService.getScriptProperties().getProperty(propKey);
    if (!dbId) return;
    let db;
    try {
      db = getDatabase_(dbId);
    } catch (err) {
      problems.push(propKey + ': cannot open the database. Share it with your Notion integration (••• > Connections). ' + redact_(err.message).slice(0, 120));
      return;
    }
    const expected = EXPECTED_SCHEMA[propKey];
    Object.keys(expected).forEach(function (name) {
      const actual = db.properties[name];
      if (!actual) {
        problems.push(propKey + ': missing property "' + name + '" (' + expected[name] + ')');
      } else if (actual.type !== expected[name]) {
        problems.push(propKey + ': property "' + name + '" is ' + actual.type + ', should be ' + expected[name]);
      }
    });
  });
  if (!problems.length) Logger.log('Notion database columns OK');
  return problems;
}

/** Step 3 (after deploying as a Web app): points Telegram at your web app. */
function setupWebhook() {
  const base = ScriptApp.getService().getUrl();
  if (!base || !/\/exec$/.test(base)) {
    throw new Error('Deploy first: Deploy > New deployment > Web app. Then run this again. (Current URL: ' + base + ')');
  }
  const url = base + '?key=' + encodeURIComponent(getProp_('WEBHOOK_SECRET'));
  tg_('setWebhook', {
    url: url,
    allowed_updates: ['message', 'callback_query'],
    drop_pending_updates: true,
  });
  Logger.log('Webhook set. Now send /ping to your bot.');
}

/** Shows whether Telegram can reach the web app and the last error it saw. */
function checkWebhook() {
  const info = tg_('getWebhookInfo');
  Logger.log('Webhook URL set: ' + (info.url ? 'yes' : 'NO'));
  Logger.log('Pending updates: ' + info.pending_update_count);
  if (info.last_error_message) {
    Logger.log('Last error: ' + info.last_error_message + ' (' + new Date(info.last_error_date * 1000) + ')');
  } else {
    Logger.log('No delivery errors reported.');
  }
}

/** Emergency stop: Telegram stops calling the web app. */
function removeWebhook() {
  tg_('deleteWebhook', { drop_pending_updates: true });
  Logger.log('Webhook removed.');
}

/** Step 4: creates the two time-based triggers (safe to run again). */
function installTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    const fn = t.getHandlerFunction();
    if (fn === 'notifyLoop' || fn === 'weeklyLessons') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('notifyLoop').timeBased().everyMinutes(5).create();
  ScriptApp.newTrigger('weeklyLessons').timeBased().onWeekDay(ScriptApp.WeekDay.FRIDAY).atHour(14).create();
  Logger.log('Triggers installed: notifyLoop every 5 minutes, weeklyLessons on Fridays around 14:00 WIB.');
}
