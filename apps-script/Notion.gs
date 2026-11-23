/**
 * Notion.gs: Notion API helpers (Notion-Version 2022-06-28).
 * Property builders start with "p", block builders end with "Block_".
 */

function notion_(method, path, payload, attempt) {
  const tries = attempt || 0;
  const options = {
    method: method,
    headers: {
      Authorization: 'Bearer ' + getProp_('NOTION_TOKEN'),
      'Notion-Version': NOTION_VERSION,
    },
    muteHttpExceptions: true,
  };
  if (payload) {
    options.contentType = 'application/json';
    options.payload = JSON.stringify(payload);
  }
  const res = UrlFetchApp.fetch(NOTION_API + path, options);
  const code = res.getResponseCode();
  if (code === 429 && tries < 2) {
    const wait = Number(res.getHeaders()['Retry-After'] || 1);
    Utilities.sleep(Math.min(wait, 5) * 1000);
    return notion_(method, path, payload, tries + 1);
  }
  const text = res.getContentText();
  if (code < 200 || code >= 300) {
    throw new Error('Notion ' + method + ' ' + path.split('?')[0] + ' failed (' + code + '): ' + text.slice(0, 300));
  }
  return text ? JSON.parse(text) : {};
}

// ---- property builders -------------------------------------------------

function richText_(s) {
  return [{ type: 'text', text: { content: String(s || '').slice(0, 2000) } }];
}
function pTitle(s) { return { title: richText_(s) }; }
function pText(s) { return { rich_text: richText_(s) }; }
function pSelect(name) { return { select: name ? { name: name } : null }; }
function pCheckbox(v) { return { checkbox: !!v }; }
function pDate(iso) { return { date: iso ? { start: iso } : null }; }
function pUrl(u) { return { url: u || null }; }

// ---- block builders ----------------------------------------------------

function paragraphBlock_(text) {
  return { object: 'block', type: 'paragraph', paragraph: { rich_text: richText_(text) } };
}

function headingBlock_(text, level) {
  const key = 'heading_' + (level || 2);
  const block = { object: 'block', type: key };
  block[key] = { rich_text: richText_(text) };
  return block;
}

/** Long text -> paragraph blocks of at most BLOCK_CHARS characters each. */
function textToBlocks_(text, maxTotal) {
  const full = String(text || '');
  const limit = maxTotal || MAX_BODY_CHARS;
  const blocks = [];
  full.slice(0, limit).split(/\r?\n/).forEach(function (line) {
    const t = line.trim();
    if (!t) return;
    for (let i = 0; i < t.length; i += BLOCK_CHARS) {
      blocks.push(paragraphBlock_(t.slice(i, i + BLOCK_CHARS)));
    }
  });
  if (full.length > limit) blocks.push(paragraphBlock_('[Text cut at ' + limit + ' characters]'));
  return blocks;
}

// ---- pages and databases -----------------------------------------------

function createPage_(dbId, properties, blocks) {
  const all = blocks || [];
  const body = { parent: { database_id: dbId }, properties: properties };
  if (all.length) body.children = all.slice(0, 100);
  const page = notion_('post', '/pages', body);
  if (all.length > 100) appendBlocks_(page.id, all.slice(100));
  return page;
}

function appendBlocks_(pageId, blocks) {
  for (let i = 0; i < blocks.length; i += 100) {
    notion_('patch', '/blocks/' + pageId + '/children', { children: blocks.slice(i, i + 100) });
  }
}

function getPage_(pageId) {
  return notion_('get', '/pages/' + pageId);
}

function updatePage_(pageId, properties) {
  return notion_('patch', '/pages/' + pageId, { properties: properties });
}

function getDatabase_(dbId) {
  return notion_('get', '/databases/' + dbId);
}

function queryDb_(dbId, filter, maxResults) {
  const cap = maxResults || 200;
  const results = [];
  let cursor = null;
  do {
    const body = { page_size: 100 };
    if (filter) body.filter = filter;
    if (cursor) body.start_cursor = cursor;
    const res = notion_('post', '/databases/' + dbId + '/query', body);
    Array.prototype.push.apply(results, res.results);
    cursor = res.has_more ? res.next_cursor : null;
  } while (cursor && results.length < cap);
  return results;
}

function propOf_(page, name) {
  return page.properties && page.properties[name] ? page.properties[name] : null;
}

function selectName_(page, name) {
  const p = propOf_(page, name);
  return p && p.select ? p.select.name : '';
}

function pageTitle_(page, name) {
  const p = propOf_(page, name);
  return p && p.title ? p.title.map(function (t) { return t.plain_text; }).join('') : '';
}

/** Notion ids without dashes (32 characters) fit inside Telegram's 64-byte button limit. */
function shortId_(id) {
  return String(id || '').replace(/-/g, '');
}

// ---- reading a page back as simple lines -------------------------------

function blockToLine_(block) {
  const t = block.type;
  const o = block[t];
  const text = o && o.rich_text
    ? o.rich_text.map(function (r) { return r.plain_text; }).join('')
    : '';
  if (!text.trim()) return null;
  switch (t) {
    case 'heading_1': return { type: 'h1', text: text };
    case 'heading_2': return { type: 'h2', text: text };
    case 'heading_3': return { type: 'h3', text: text };
    case 'bulleted_list_item':
    case 'to_do': return { type: 'ul', text: text };
    case 'numbered_list_item': return { type: 'ol', text: text };
    case 'paragraph':
    case 'quote':
    case 'callout': return { type: 'p', text: text };
    default: return null;
  }
}

/** Top-level blocks only. Tables and nested blocks are not copied. */
function pageToLines_(pageId) {
  const lines = [];
  let cursor = null;
  do {
    const path = '/blocks/' + pageId + '/children?page_size=100' + (cursor ? '&start_cursor=' + cursor : '');
    const res = notion_('get', path);
    res.results.forEach(function (b) {
      const line = blockToLine_(b);
      if (line) lines.push(line);
    });
    cursor = res.has_more ? res.next_cursor : null;
  } while (cursor);
  return lines;
}
