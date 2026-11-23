/**
 * Code.gs: entry points, routing and handlers.
 *
 * Telegram calls doPost() for every message and button tap.
 * notifyLoop() and weeklyLessons() run on time-based triggers (Setup.gs > installTriggers).
 * This script does NO AI work. Claude reads and writes Notion on its own schedule.
 */

// ---- small helpers -------------------------------------------------------

function getProp_(key, required) {
  const v = PropertiesService.getScriptProperties().getProperty(key);
  if ((v === null || v === '') && required !== false) {
    throw new Error('Missing Script Property: ' + key);
  }
  return v || '';
}

/** Hide secrets before any text leaves the script (alerts, logs). */
function redact_(text) {
  let out = String(text);
  ['TELEGRAM_TOKEN', 'NOTION_TOKEN', 'WEBHOOK_SECRET'].forEach(function (k) {
    const v = PropertiesService.getScriptProperties().getProperty(k);
    if (v) out = out.split(v).join('***');
  });
  return out;
}

function nowIso_() {
  return Utilities.formatDate(new Date(), TZ, "yyyy-MM-dd'T'HH:mm:ssXXX");
}
function todayIso_() {
  return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
}
function dateLabel_() {
  return Utilities.formatDate(new Date(), TZ, 'd MMM yyyy HH:mm');
}
function firstLine_(text, max) {
  const line = String(text || '').split(/\r?\n/)[0].trim();
  return line.length > max ? line.slice(0, max - 1) + '…' : line;
}

function reportError_(where, err) {
  const message = redact_((err && err.message) || err);
  Logger.log('ERROR in ' + where + ': ' + message);
  try {
    const cache = CacheService.getScriptCache();
    if (cache.get('last_error_alert')) return; // at most one alert a minute
    cache.put('last_error_alert', '1', 60);
    tgSend_('⚠️ relay error in ' + where + ': ' + message.slice(0, 500));
  } catch (ignored) {
    // nothing more we can do
  }
}

/** One row in the Agent Log. Never lets a logging problem break the real work. */
function logEvent_(from, to, task, event, note) {
  try {
    const props = {};
    props[P.log.event] = pTitle(event);
    props[P.log.time] = pDate(nowIso_());
    props[P.log.from] = pText(from);
    props[P.log.to] = pText(to);
    props[P.log.task] = pText(task);
    props[P.log.note] = pText(note);
    createPage_(getProp_('DB_LOG'), props);
  } catch (err) {
    Logger.log('log failed: ' + redact_(err.message));
  }
}

// ---- state kept between calls ---------------------------------------------

function getPending_() {
  const raw = PropertiesService.getScriptProperties().getProperty('PENDING');
  if (!raw) return null;
  const p = JSON.parse(raw);
  if (Date.now() - p.ts > MAX_PENDING_MINUTES * 60000) {
    clearPending_();
    return null;
  }
  return p;
}
function setPending_(obj) {
  obj.ts = Date.now();
  PropertiesService.getScriptProperties().setProperty('PENDING', JSON.stringify(obj));
}
function clearPending_() {
  PropertiesService.getScriptProperties().deleteProperty('PENDING');
}

/** Which status of which task the Boss was already notified about. */
function getNotified_() {
  const raw = PropertiesService.getScriptProperties().getProperty('NOTIFIED');
  return raw ? JSON.parse(raw) : {};
}
function saveNotified_(map) {
  const keys = Object.keys(map);
  if (keys.length > 120) keys.slice(0, keys.length - 120).forEach(function (k) { delete map[k]; });
  PropertiesService.getScriptProperties().setProperty('NOTIFIED', JSON.stringify(map));
}
function clearNotified_(id) {
  const map = getNotified_();
  delete map[shortId_(id)];
  saveNotified_(map);
}

function isDuplicate_(updateId) {
  if (updateId === undefined || updateId === null) return false;
  const cache = CacheService.getScriptCache();
  const key = 'upd_' + updateId;
  if (cache.get(key)) return true;
  cache.put(key, '1', 21600);
  return false;
}

function isBoss_(chatId, fromId) {
  const boss = String(getProp_('CHAT_ID'));
  return String(chatId) === boss && String(fromId) === boss;
}

// ---- web app entry points --------------------------------------------------

function doGet() {
  return ContentService.createTextOutput('pusdok-relay is running');
}

function doPost(e) {
  const out = ContentService.createTextOutput('ok');
  try {
    const key = e && e.parameter ? e.parameter.key : '';
    if (!key || key !== getProp_('WEBHOOK_SECRET')) return out; // wrong key: say nothing
    handleUpdate_(JSON.parse(e.postData.contents));
  } catch (err) {
    reportError_('doPost', err);
  }
  return out;
}

function handleUpdate_(update) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) throw new Error('Another run held the lock for too long.');
  try {
    if (isDuplicate_(update.update_id)) return;
    if (update.callback_query) return handleCallback_(update.callback_query);
    if (update.message) return handleMessage_(update.message);
  } finally {
    lock.releaseLock();
  }
}

// ---- messages ------------------------------------------------------------

function handleMessage_(msg) {
  if (!isBoss_(msg.chat && msg.chat.id, msg.from && msg.from.id)) return; // not the Boss: ignore
  if (msg.document || msg.photo || msg.voice || msg.audio) return handleFile_(msg);
  const text = (msg.text || '').trim();
  if (!text) return;
  const cmd = parseCommand_(text);
  if (cmd) return runCommand_(cmd);
  const pending = getPending_();
  if (pending) return handlePendingNote_(pending, text);
  return saveNote_(text);
}

function runCommand_(cmd) {
  switch (cmd.name) {
    case 'start':
    case 'help':
      return tgSend_(HELP_TEXT);
    case 'ping':
      return tgSend_('Ping. Tap a button to test Telegram and Notion.', [[
        button_('Approve', 'p', 'ok'),
        button_('Decline', 'p', 'no'),
      ]]);
    case 'note':
      if (!cmd.arg) return tgSend_('Send /note followed by your text.');
      return saveNote_(cmd.arg);
    case 'task':
      if (!cmd.arg) return tgSend_('Send /task followed by what you need.');
      return createTask_(cmd.arg, 'Other');
    case 'ask':
      if (!cmd.arg) return tgSend_('Send /ask followed by your question.');
      return createTask_(cmd.arg, 'Question');
    case 'brief':
      return createTask_('Weekly brief ' + todayIso_(), 'Weekly brief');
    case 'status':
      return sendStatus_();
    case 'cancel':
      clearPending_();
      return tgSend_('Cancelled.');
    default:
      return tgSend_('Unknown command. Send /help.');
  }
}

function inboxProps_(title, source, type, link) {
  const p = {};
  p[P.inbox.title] = pTitle(title);
  p[P.inbox.source] = pSelect(source);
  p[P.inbox.type] = pSelect(type);
  p[P.inbox.level] = pSelect(DEFAULT_DATA_LEVEL);
  p[P.inbox.namePerm] = pSelect(DEFAULT_NAME_PERMISSION);
  p[P.inbox.processed] = pCheckbox(false);
  p[P.inbox.captured] = pDate(nowIso_());
  if (link) p[P.inbox.link] = pUrl(link);
  return p;
}

function saveNote_(text) {
  const isLink = /^https?:\/\/\S+$/i.test(text);
  let title = firstLine_(text, 80);
  let body = text;
  let type = 'Field note';
  let link = '';
  if (isLink) {
    const page = fetchUrlText_(text);
    title = page.title || text;
    body = page.text;
    type = 'Article';
    link = text;
  }
  const created = createPage_(getProp_('DB_INBOX'), inboxProps_(title, 'Telegram', type, link), textToBlocks_(body));
  logEvent_('Admin', 'Admin', title, 'captured', 'inbox');
  tgSend_('Saved ✓ ' + firstLine_(title, 60) + '\n' + created.url);
}

function pickTelegramFile_(msg) {
  const stamp = Utilities.formatDate(new Date(), TZ, 'yyyyMMdd-HHmmss');
  if (msg.document) {
    return { fileId: msg.document.file_id, name: msg.document.file_name || 'document-' + stamp, size: msg.document.file_size, kind: 'doc' };
  }
  if (msg.photo && msg.photo.length) {
    const big = msg.photo[msg.photo.length - 1];
    return { fileId: big.file_id, name: 'photo-' + stamp + '.jpg', size: big.file_size, kind: 'doc' };
  }
  if (msg.voice) {
    return { fileId: msg.voice.file_id, name: 'voice-' + stamp + '.ogg', size: msg.voice.file_size, kind: 'voice' };
  }
  if (msg.audio) {
    return { fileId: msg.audio.file_id, name: msg.audio.file_name || 'audio-' + stamp + '.mp3', size: msg.audio.file_size, kind: 'voice' };
  }
  return null;
}

function handleFile_(msg) {
  const f = pickTelegramFile_(msg);
  if (!f) return;
  if (f.size && f.size > MAX_FILE_BYTES) {
    return tgSend_('That file is over the 20 MB limit for bots. Upload it to the Notion Inbox directly.');
  }
  const blob = tgDownload_(f.fileId, f.name);
  const file = saveToDrive_(blob, getInboxFolder_());
  let text = '';
  let note = '';
  if (f.kind === 'voice') {
    note = 'Voice note saved in Drive. It is not transcribed.';
  } else {
    try {
      text = extractText_(blob);
    } catch (err) {
      note = 'Text extraction failed: ' + redact_(err.message);
    }
    if (!text && !note) note = 'No text could be extracted from this file.';
  }
  const caption = (msg.caption || '').trim();
  const title = caption ? firstLine_(caption, 80) : f.name;
  const body = [caption, note, text].filter(Boolean).join('\n\n');
  const type = f.kind === 'voice' ? 'Field note' : 'Doc';
  const created = createPage_(getProp_('DB_INBOX'), inboxProps_(title, 'Upload', type, file.getUrl()), textToBlocks_(body));
  logEvent_('Admin', 'Admin', title, 'captured', 'file saved to Drive');
  tgSend_('Saved ✓ ' + firstLine_(title, 60) + (note ? '\n' + note : '') + '\n' + created.url);
}

function createTask_(text, type) {
  const title = firstLine_(text, 100);
  const props = {};
  props[P.tasks.title] = pTitle(title);
  props[P.tasks.type] = pSelect(type);
  props[P.tasks.status] = pSelect(STATUS.NEW);
  props[P.tasks.level] = pSelect(DEFAULT_DATA_LEVEL);
  props[P.tasks.namePerm] = pSelect(DEFAULT_NAME_PERMISSION);
  const blocks = [headingBlock_('Request', 2)].concat(textToBlocks_(text));
  const created = createPage_(getProp_('DB_TASKS'), props, blocks);
  logEvent_('Boss', 'Manager', title, 'task created', type);
  tgSend_('Task created ✓ ' + firstLine_(title, 60) + '\nThe Manager plans it at the next run (' + SCHEDULE_HINT + ').\n' + created.url);
}

function sendStatus_() {
  const pages = queryDb_(getProp_('DB_TASKS'), {
    property: P.tasks.status, select: { does_not_equal: STATUS.ARCHIVED },
  });
  if (!pages.length) return tgSend_('No open tasks.');
  const counts = {};
  const waiting = [];
  pages.forEach(function (p) {
    const s = selectName_(p, P.tasks.status) || '(no status)';
    counts[s] = (counts[s] || 0) + 1;
    if (s === STATUS.AWAITING) waiting.push('• ' + firstLine_(pageTitle_(p, P.tasks.title), 70));
  });
  const lines = Object.keys(counts).map(function (s) { return s + ': ' + counts[s]; });
  if (waiting.length) lines.push('', 'Waiting for you:', waiting.join('\n'));
  tgSend_(lines.join('\n'));
}

// ---- revise / edit notes ----------------------------------------------------

function handlePendingNote_(pending, text) {
  clearPending_();
  clearNotified_(pending.id);
  tgRemoveButtons_(pending.chatId, pending.messageId);
  const note = text.trim();
  appendBlocks_(pending.id, textToBlocks_('Boss feedback (' + dateLabel_() + '): ' + note));
  const props = {};
  props[P.tasks.feedback] = pText(note);
  if (pending.kind === 'revise') {
    props[P.tasks.status] = pSelect(STATUS.REVISE);
    updatePage_(pending.id, props);
    const lesson = {};
    lesson[P.lessons.title] = pTitle(note);
    lesson[P.lessons.status] = pSelect('Proposed');
    lesson[P.lessons.date] = pDate(todayIso_());
    if (pending.url) lesson[P.lessons.source] = pUrl(pending.url);
    createPage_(getProp_('DB_LESSONS'), lesson);
    logEvent_('Boss', 'Manager', pending.title, 'revise requested', firstLine_(note, 100));
    tgSend_('Noted ✓ Claude applies it at the next revision run (16:00, or 06:00 on Fridays). I also saved it as a proposed lesson.');
  } else {
    props[P.tasks.status] = pSelect(STATUS.NEW);
    updatePage_(pending.id, props);
    logEvent_('Boss', 'Manager', pending.title, 'plan edited', firstLine_(note, 100));
    tgSend_('Noted ✓ The Manager re-plans the task at the next run (' + SCHEDULE_HINT + ').');
  }
}

// ---- button taps ------------------------------------------------------------

function handleCallback_(cb) {
  tgAnswerCallback_(cb.id);
  const msg = cb.message;
  if (!msg || !isBoss_(msg.chat && msg.chat.id, cb.from && cb.from.id)) return;
  const d = parseCb_(cb.data);
  if (!d) return;
  if (d.kind === 'p') return handlePingTap_(msg, d.code);
  if (d.kind === 'l') return handleLessonTap_(msg, d);
  if (d.kind === 't') return handleTaskTap_(msg, d);
}

function handlePingTap_(msg, code) {
  logEvent_('Boss', 'Relay', 'ping', 'ping ' + (code === 'ok' ? 'approve' : 'decline'), 'button test');
  tgFinish_(msg, code === 'ok' ? 'Approve received. Telegram and Notion both work ✓' : 'Decline received. Telegram and Notion both work ✓');
}

function handleLessonTap_(msg, d) {
  const approve = d.code === 'la';
  const props = {};
  props[P.lessons.status] = pSelect(approve ? 'Approved' : 'Rejected');
  updatePage_(d.id, props);
  tgFinish_(msg, approve ? 'Approved ✓' : 'Rejected ✓');
}

function handleTaskTap_(msg, d) {
  const page = getPage_(d.id);
  const title = pageTitle_(page, P.tasks.title);
  const status = selectName_(page, P.tasks.status);
  const allowed = (BUTTONS_BY_STATUS[status] || []).map(function (b) { return b[0]; });
  if (allowed.indexOf(d.code) === -1) {
    return tgFinish_(msg, 'Already handled. The task is now "' + status + '".');
  }
  const set = function (extra, note) {
    const props = extra || {};
    props[P.tasks.status] = pSelect(STATUS.GO);
    updatePage_(d.id, props);
    clearNotified_(d.id);
    logEvent_('Boss', 'Manager', title, 'decision', note);
    tgFinish_(msg, note + ' ✓');
  };
  // For edit and revise the original buttons stay on the message until the note arrives,
  // so a forgotten note never leaves the task without buttons.
  const askNote = function (kind, prompt) {
    setPending_({ kind: kind, id: d.id, title: title, url: page.url, chatId: msg.chat.id, messageId: msg.message_id });
    tgSend_(prompt + ' (/cancel to stop)');
  };
  switch (d.code) {
    case 'go':
      return set({}, 'Go');
    case 'inc':
      return set({ [P.tasks.gate1]: pSelect('Include') }, 'Outside sources included');
    case 'int':
      return set({ [P.tasks.gate1]: pSelect('Internal only') }, 'Internal sources only');
    case 'nam':
      return set({ [P.tasks.namePerm]: pSelect('Allowed') }, 'Names allowed');
    case 'cod':
      return set({ [P.tasks.namePerm]: pSelect('Use codes') }, 'Codes only');
    case 'edit':
      return askNote('edit', 'Send your correction to the plan in one message.');
    case 'rev':
      return askNote('revise', 'What should change? Send your note in one message.');
    case 'app':
      return approveTask_(msg, d.id, title);
  }
}

function approveTask_(msg, id, title) {
  const approved = {};
  approved[P.tasks.status] = pSelect(STATUS.APPROVED);
  updatePage_(id, approved);
  clearNotified_(id);
  try {
    const docUrl = publishApproved_(id);
    logEvent_('Boss', 'Admin', title, 'approved', 'archived and published');
    tgFinish_(msg, 'Approved ✓');
    tgSend_('📄 ' + firstLine_(title, 80) + '\n' + docUrl);
  } catch (err) {
    const back = {};
    back[P.tasks.status] = pSelect(STATUS.AWAITING);
    updatePage_(id, back);
    clearNotified_(id);
    tgFinish_(msg, 'Approved, but publishing failed. I will send the buttons again in a few minutes.');
    reportError_('publish', err);
  }
}

// ---- time-based triggers ------------------------------------------------------

/** Every 5 minutes: tell the Boss about tasks that need a decision. */
function notifyLoop() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return;
  try {
    const statuses = Object.keys(BUTTONS_BY_STATUS);
    const filter = { or: statuses.map(function (s) { return { property: P.tasks.status, select: { equals: s } }; }) };
    const pages = queryDb_(getProp_('DB_TASKS'), filter);
    const map = getNotified_();
    pages.forEach(function (page) {
      const id = shortId_(page.id);
      const status = selectName_(page, P.tasks.status);
      if (map[id] === status) return;
      try {
        const title = pageTitle_(page, P.tasks.title);
        const type = selectName_(page, P.tasks.type);
        const rows = [BUTTONS_BY_STATUS[status].map(function (b) { return button_(b[1], 't', b[0], id); })];
        tgSend_('📋 ' + firstLine_(title, 100) + (type ? ' (' + type + ')' : '') + '\n' + PROMPT_BY_STATUS[status] + '\n' + page.url, rows);
        map[id] = status;
        saveNotified_(map);
      } catch (err) {
        reportError_('notifyLoop', err);
      }
    });
  } catch (err) {
    reportError_('notifyLoop', err);
  } finally {
    lock.releaseLock();
  }
}

/** Fridays: send the week's proposed lessons for approval. */
function weeklyLessons() {
  try {
    const pages = queryDb_(getProp_('DB_LESSONS'), { property: P.lessons.status, select: { equals: 'Proposed' } }, 20);
    pages.forEach(function (page) {
      const id = shortId_(page.id);
      tgSend_('📝 Proposed lesson:\n' + pageTitle_(page, P.lessons.title), [[
        button_('Approve', 'l', 'la', id),
        button_('Reject', 'l', 'lr', id),
      ]]);
    });
  } catch (err) {
    reportError_('weeklyLessons', err);
  }
}
