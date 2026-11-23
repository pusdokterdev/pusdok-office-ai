/**
 * Files.gs: web pages, Drive storage and text extraction (OCR).
 * Level 3 files stay in your own Google Drive, in the "AI Office Inbox" folder.
 */

const MIME_BY_EXT = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  txt: 'text/plain',
  md: 'text/plain',
  csv: 'text/plain',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  mp3: 'audio/mpeg',
};

function guessMime_(name, current) {
  const ext = String(name || '').split('.').pop().toLowerCase();
  if (MIME_BY_EXT[ext]) return MIME_BY_EXT[ext];
  return current && current !== 'application/octet-stream' ? current : 'application/octet-stream';
}

// ---- web pages -----------------------------------------------------------

function decodeEntities_(s) {
  return String(s)
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, function (m, n) { return String.fromCharCode(Number(n)); });
}

/** Very small HTML to text converter. Good enough for articles; not a browser. */
function htmlToText_(html) {
  const source = String(html || '');
  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(source);
  const title = titleMatch ? decodeEntities_(titleMatch[1]).replace(/\s+/g, ' ').trim() : '';
  const text = source
    .replace(/<head[\s\S]*?<\/head>/gi, ' ')
    .replace(/<title[\s\S]*?<\/title>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<\/(p|div|h[1-6]|li|tr|section|article|blockquote)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  const clean = decodeEntities_(text)
    .split('\n')
    .map(function (l) { return l.replace(/[ \t]+/g, ' ').trim(); })
    .filter(Boolean)
    .join('\n');
  return { title: title, text: clean };
}

/** Fetch a public web page. Returns { title, text }. Never throws for a bad page. */
function fetchUrlText_(url) {
  try {
    const res = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true,
      followRedirects: true,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; pusdok-relay)' },
    });
    const code = res.getResponseCode();
    if (code < 200 || code >= 300) return { title: '', text: '(page returned HTTP ' + code + ')' };
    const type = String(res.getHeaders()['Content-Type'] || '').toLowerCase();
    if (type.indexOf('html') === -1 && type.indexOf('text') === -1) {
      return { title: '', text: '(not a text page: ' + type + ')' };
    }
    return htmlToText_(res.getContentText());
  } catch (err) {
    return { title: '', text: '(page could not be fetched: ' + redact_(err.message) + ')' };
  }
}

// ---- Drive ---------------------------------------------------------------

function getOrCreateFolder_(propKey, name) {
  const props = PropertiesService.getScriptProperties();
  const saved = props.getProperty(propKey);
  if (saved) {
    try {
      return DriveApp.getFolderById(saved);
    } catch (err) {
      // folder was deleted: fall through and make a new one
    }
  }
  const folder = DriveApp.createFolder(name);
  props.setProperty(propKey, folder.getId());
  return folder;
}

function getInboxFolder_() { return getOrCreateFolder_('DRIVE_INBOX_FOLDER_ID', DRIVE_INBOX_FOLDER); }
function getOutputFolder_() { return getOrCreateFolder_('DRIVE_OUTPUT_FOLDER_ID', DRIVE_OUTPUT_FOLDER); }

function saveToDrive_(blob, folder) {
  return folder.createFile(blob);
}

/**
 * Pull text out of a file. PDFs, images and Word files go through Drive's
 * built-in OCR/conversion (needs the Drive advanced service, see appsscript.json).
 * The temporary converted copy is deleted straight away.
 */
function extractText_(blob) {
  const mime = blob.getContentType();
  if (mime === 'text/plain') return blob.getDataAsString('UTF-8');
  const convertible = mime === 'application/pdf'
    || mime.indexOf('image/') === 0
    || mime.indexOf('wordprocessingml') !== -1;
  if (!convertible) return '';
  const created = Drive.Files.create(
    { name: 'tmp-ocr-' + Date.now(), mimeType: 'application/vnd.google-apps.document' },
    blob,
    { ocrLanguage: 'id' }
  );
  try {
    return DocumentApp.openById(created.id).getBody().getText();
  } finally {
    try { Drive.Files.remove(created.id); } catch (err) { /* already gone */ }
  }
}
