/**
 * Config.gs: constants shared by every file in the relay.
 *
 * Secrets are NOT stored here. They live in Script Properties
 * (Project Settings > Script properties). See README.md.
 *
 * Keep every top-level value that depends on another constant in THIS file,
 * so the load order of the other files never matters.
 */

const TZ = 'Asia/Jakarta';
const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';
const TELEGRAM_API = 'https://api.telegram.org';

// Script Properties the relay cannot run without.
const REQUIRED_PROPS = [
  'TELEGRAM_TOKEN',
  'CHAT_ID',
  'WEBHOOK_SECRET',
  'NOTION_TOKEN',
  'DB_INBOX',
  'DB_TASKS',
  'DB_ARCHIVE',
  'DB_LESSONS',
  'DB_LOG',
];
// Optional Script Property: DOC_TEMPLATE_ID, a Google Doc containing the
// placeholders {{title}}, {{date}} and {{body}}.

const DRIVE_INBOX_FOLDER = 'AI Office Inbox';
const DRIVE_OUTPUT_FOLDER = 'AI Office Output';

const DEFAULT_DATA_LEVEL = '3 Restricted'; // until Claude classifies the item
const DEFAULT_NAME_PERMISSION = 'Not asked';
const SCHEDULE_HINT = '07:00, 12:00 and 16:00 WIB';

const MAX_BODY_CHARS = 100000; // text copied into one Notion page
const BLOCK_CHARS = 1900; // Notion allows 2000 characters per text block
const MAX_PENDING_MINUTES = 30; // how long the bot waits for a revise note
const MAX_FILE_BYTES = 20 * 1024 * 1024; // Telegram bot download limit

// Task statuses. These exact words must exist as options of the Tasks
// "Status" property (a Select, not Notion's built-in Status type).
const STATUS = {
  NEW: 'New',
  PLAN_READY: 'Plan ready',
  GO: 'Go',
  IN_PROGRESS: 'In progress',
  GATE_SOURCES: 'Gate 1',
  GATE_NAMES: 'Name gate',
  AWAITING: 'Awaiting Boss',
  REVISE: 'Revise',
  APPROVED: 'Approved',
  ARCHIVED: 'Archived',
};

// When a task reaches one of these statuses, the bot sends buttons.
// Each button is [code, label]. Codes are handled in Code.gs > handleTaskTap_.
const BUTTONS_BY_STATUS = {
  'Plan ready': [['go', 'Go'], ['edit', 'Edit']],
  'Gate 1': [['inc', 'Include'], ['int', 'Internal only']],
  'Name gate': [['nam', 'Allow names'], ['cod', 'Use codes']],
  'Awaiting Boss': [['app', 'Approve'], ['rev', 'Revise']],
};

const PROMPT_BY_STATUS = {
  'Plan ready': 'A plan is ready. Go?',
  'Gate 1': 'Outside sources were found. Include them?',
  'Name gate': 'The product would name participants. Allow names, or use codes?',
  'Awaiting Boss': 'Ready for your approval.',
};

// Notion property names. If you rename a property in Notion, change it here.
const P = {
  inbox: {
    title: 'Title',
    source: 'Source',
    type: 'Type',
    level: 'Data Level',
    namePerm: 'Name permission',
    tags: 'Tags',
    abstract: 'Abstract',
    processed: 'Processed',
    captured: 'Captured at',
    link: 'Source link',
  },
  tasks: {
    title: 'Task',
    type: 'Type',
    roles: 'Assigned role(s)',
    status: 'Status',
    due: 'Due',
    level: 'Data Level',
    output: 'Output link',
    feedback: 'Boss feedback',
    gate1: 'Gate 1',
    namePerm: 'Name permission',
  },
  archive: {
    title: 'Title',
    docType: 'Document type',
    date: 'Date',
    link: 'Doc link',
    task: 'Related task',
  },
  lessons: {
    title: 'Lesson',
    role: 'Role',
    source: 'Source task',
    status: 'Status',
    date: 'Date',
  },
  log: {
    event: 'Event',
    time: 'Time',
    from: 'From role',
    to: 'To role',
    task: 'Task',
    note: 'Note',
  },
};

// Script Property that holds each database ID, and the property types the
// relay expects. Setup.gs > verifySchema() checks these against Notion.
const EXPECTED_SCHEMA = {
  DB_INBOX: {
    'Title': 'title',
    'Source': 'select',
    'Type': 'select',
    'Data Level': 'select',
    'Name permission': 'select',
    'Tags': 'multi_select',
    'Abstract': 'rich_text',
    'Processed': 'checkbox',
    'Captured at': 'date',
    'Source link': 'url',
  },
  DB_TASKS: {
    'Task': 'title',
    'Type': 'select',
    'Assigned role(s)': 'multi_select',
    'Status': 'select',
    'Due': 'date',
    'Data Level': 'select',
    'Output link': 'url',
    'Boss feedback': 'rich_text',
    'Gate 1': 'select',
    'Name permission': 'select',
  },
  DB_ARCHIVE: {
    'Title': 'title',
    'Document type': 'select',
    'Date': 'date',
    'Doc link': 'url',
    'Related task': 'url',
  },
  DB_LESSONS: {
    'Lesson': 'title',
    'Role': 'select',
    'Source task': 'url',
    'Status': 'select',
    'Date': 'date',
  },
  DB_LOG: {
    'Event': 'title',
    'Time': 'date',
    'From role': 'rich_text',
    'To role': 'rich_text',
    'Task': 'rich_text',
    'Note': 'rich_text',
  },
};

const HELP_TEXT = [
  'pusdok-relay commands',
  '/note <text>  save a field note (plain text works too)',
  '/task <text>  give the office a task',
  '/ask <text>  ask a question (answered at the next scheduled run)',
  '/brief  start the weekly executive brief',
  '/status  tasks by status',
  '/cancel  cancel a pending revise or edit',
  '/ping  test the buttons and Notion',
  '',
  'Send a link, PDF, photo or voice note to save it to the Inbox.',
].join('\n');
