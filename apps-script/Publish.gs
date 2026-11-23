/**
 * Publish.gs: turn an approved Task into a Google Doc and an Archive row.
 *
 * Contract with Claude: the deliverable sits on the task page under a heading
 * whose text starts with "Final". Only headings, paragraphs and bullet or
 * numbered lists under it are copied (no tables, no nested blocks).
 */

function headingLevel_(type) {
  return { h1: 1, h2: 2, h3: 3 }[type] || 0;
}

/** Lines under the LAST "Final" heading, or null if there is no such heading. */
function extractFinal_(lines) {
  let start = -1;
  let level = 0;
  for (let i = 0; i < lines.length; i++) {
    const lv = headingLevel_(lines[i].type);
    if (lv && /^final\b/i.test(lines[i].text.trim())) {
      start = i;
      level = lv;
    }
  }
  if (start === -1) return null;
  const out = [];
  for (let i = start + 1; i < lines.length; i++) {
    const lv = headingLevel_(lines[i].type);
    if (lv && lv <= level) break;
    out.push(lines[i]);
  }
  return out;
}

function escapeRegex_(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Replace every occurrence of a token without treating $ in the value specially. */
function replaceToken_(body, token, value) {
  let found = body.findText(escapeRegex_(token));
  while (found) {
    const el = found.getElement().asText();
    const start = found.getStartOffset();
    el.deleteText(start, found.getEndOffsetInclusive());
    el.insertText(start, value);
    found = body.findText(escapeRegex_(token));
  }
}

/** index = position to insert at, or null to append at the end. */
function applyLine_(body, index, line) {
  const H = DocumentApp.ParagraphHeading;
  if (line.type === 'ul' || line.type === 'ol') {
    const item = index === null ? body.appendListItem(line.text) : body.insertListItem(index, line.text);
    item.setGlyphType(line.type === 'ul' ? DocumentApp.GlyphType.BULLET : DocumentApp.GlyphType.NUMBER);
    return;
  }
  const para = index === null ? body.appendParagraph(line.text) : body.insertParagraph(index, line.text);
  para.setHeading({ h1: H.HEADING1, h2: H.HEADING2, h3: H.HEADING3 }[line.type] || H.NORMAL);
}

function buildGoogleDoc_(title, lines) {
  const folder = getOutputFolder_();
  const templateId = getProp_('DOC_TEMPLATE_ID', false);
  const dateText = Utilities.formatDate(new Date(), TZ, 'd MMMM yyyy');
  let doc;
  if (templateId) {
    const copy = DriveApp.getFileById(templateId).makeCopy(title, folder);
    doc = DocumentApp.openById(copy.getId());
  } else {
    doc = DocumentApp.create(title);
    DriveApp.getFileById(doc.getId()).moveTo(folder);
  }
  const body = doc.getBody();
  if (templateId) {
    replaceToken_(body, '{{title}}', title);
    replaceToken_(body, '{{date}}', dateText);
    const marker = body.findText(escapeRegex_('{{body}}'));
    if (!marker) {
      throw new Error('The Google Doc template has no {{body}} placeholder.');
    }
    const holder = marker.getElement().getParent();
    let index = body.getChildIndex(holder);
    lines.forEach(function (line) { applyLine_(body, index++, line); });
    holder.asParagraph().clear();
  } else {
    body.appendParagraph(title).setHeading(DocumentApp.ParagraphHeading.TITLE);
    body.appendParagraph(dateText);
    lines.forEach(function (line) { applyLine_(body, null, line); });
  }
  doc.saveAndClose();
  return doc.getUrl();
}

/** Returns the Google Doc URL. Throws a readable error when the page is not ready. */
function publishApproved_(pageId) {
  const page = getPage_(pageId);
  const title = pageTitle_(page, P.tasks.title) || 'Untitled';
  const docType = selectName_(page, P.tasks.type) || 'Other';
  const finalLines = extractFinal_(pageToLines_(pageId));
  if (finalLines === null) throw new Error('The task page has no "Final" heading, so there is nothing to publish.');
  if (!finalLines.length) throw new Error('The "Final" section on the task page is empty.');

  const docUrl = buildGoogleDoc_(title, finalLines);

  updatePage_(pageId, {
    [P.tasks.output]: pUrl(docUrl),
    [P.tasks.status]: pSelect(STATUS.ARCHIVED),
  });
  const archive = {};
  archive[P.archive.title] = pTitle(title);
  archive[P.archive.docType] = pSelect(docType);
  archive[P.archive.date] = pDate(todayIso_());
  archive[P.archive.link] = pUrl(docUrl);
  archive[P.archive.task] = pUrl(page.url);
  createPage_(getProp_('DB_ARCHIVE'), archive);
  return docUrl;
}
