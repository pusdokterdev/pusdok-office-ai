/**
 * Telegram.gs: thin wrappers around the Telegram Bot API.
 * Messages are sent as plain text (no Markdown) so odd characters never break them.
 */

function tg_(method, payload) {
  const token = getProp_('TELEGRAM_TOKEN');
  const res = UrlFetchApp.fetch(TELEGRAM_API + '/bot' + token + '/' + method, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload || {}),
    muteHttpExceptions: true,
  });
  const body = JSON.parse(res.getContentText());
  if (!body.ok) {
    throw new Error('Telegram ' + method + ' failed: ' + body.description);
  }
  return body.result;
}

/** Send text to the Boss. rows = [[{text, callback_data}, ...], ...] (optional). */
function tgSend_(text, rows) {
  const payload = {
    chat_id: getProp_('CHAT_ID'),
    text: String(text).slice(0, 3800),
    disable_web_page_preview: true,
  };
  if (rows && rows.length) payload.reply_markup = { inline_keyboard: rows };
  return tg_('sendMessage', payload);
}

function tgAnswerCallback_(callbackId, text) {
  try {
    tg_('answerCallbackQuery', { callback_query_id: callbackId, text: text || '' });
  } catch (err) {
    // A stale callback id is harmless; the handler carries on.
  }
}

/** Replace a message's text and remove its buttons. */
function tgFinish_(msg, note) {
  const base = msg.text || '';
  tg_('editMessageText', {
    chat_id: msg.chat.id,
    message_id: msg.message_id,
    text: (base + '\n\n' + note).slice(0, 3800),
    disable_web_page_preview: true,
  });
}

/** Remove the buttons from an earlier message. Harmless if it is already gone. */
function tgRemoveButtons_(chatId, messageId) {
  if (!chatId || !messageId) return;
  try {
    tg_('editMessageReplyMarkup', {
      chat_id: chatId,
      message_id: messageId,
      reply_markup: { inline_keyboard: [] },
    });
  } catch (err) {
    // message too old or already edited
  }
}

/** Download a file the Boss sent. Returns a Blob named `name`. */
function tgDownload_(fileId, name) {
  const info = tg_('getFile', { file_id: fileId });
  const token = getProp_('TELEGRAM_TOKEN');
  const res = UrlFetchApp.fetch(TELEGRAM_API + '/file/bot' + token + '/' + info.file_path, {
    muteHttpExceptions: true,
  });
  if (res.getResponseCode() !== 200) {
    throw new Error('Telegram file download failed (' + res.getResponseCode() + ')');
  }
  const blob = res.getBlob();
  blob.setName(name);
  blob.setContentType(guessMime_(name, blob.getContentType()));
  return blob;
}

/** Callback data is limited to 64 bytes: kind|code|32-character Notion id. */
function cbData_(kind, code, id) {
  return [kind, code, id || ''].join('|');
}

function parseCb_(data) {
  const parts = String(data || '').split('|');
  if (parts.length < 2) return null;
  return { kind: parts[0], code: parts[1], id: parts[2] || '' };
}

function button_(label, kind, code, id) {
  return { text: label, callback_data: cbData_(kind, code, id) };
}

/** "/note@MyBot some text" -> { name: 'note', arg: 'some text' }; null if not a command. */
function parseCommand_(text) {
  const m = /^\/([A-Za-z_]+)(?:@\w+)?(?:\s+([\s\S]*))?$/.exec(String(text || '').trim());
  if (!m) return null;
  return { name: m[1].toLowerCase(), arg: (m[2] || '').trim() };
}
