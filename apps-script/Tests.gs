/**
 * Tests.gs: checks for the pure functions (no Telegram, Notion or Drive calls).
 * Run runTests() from the editor; the Execution log shows PASS or the failures.
 * Run it again after every code change.
 */

function assertEq_(name, actual, expected, failures) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) failures.push(name + '\n   expected ' + e + '\n   got      ' + a);
}

function runTests() {
  const f = [];

  // commands
  assertEq_('command with arg', parseCommand_('/note hello world'), { name: 'note', arg: 'hello world' }, f);
  assertEq_('command with bot name', parseCommand_('/Task@MyBot buat KAK'), { name: 'task', arg: 'buat KAK' }, f);
  assertEq_('command without arg', parseCommand_('/status'), { name: 'status', arg: '' }, f);
  assertEq_('plain text is not a command', parseCommand_('halo /note'), null, f);

  // button data
  const id = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
  const data = cbData_('t', 'app', id);
  assertEq_('callback roundtrip', parseCb_(data), { kind: 't', code: 'app', id: id }, f);
  assertEq_('callback fits Telegram limit', data.length <= 64, true, f);
  assertEq_('short id', shortId_('a1b2c3d4-e5f6-0718-293a-4b5c6d7e8f90'), id, f);

  // long text -> Notion blocks
  const long = 'x'.repeat(4000) + '\n\nsecond paragraph';
  const blocks = textToBlocks_(long);
  assertEq_('block count', blocks.length, 4, f);
  assertEq_('block size limit', blocks.every(function (b) {
    return b.paragraph.rich_text[0].text.content.length <= BLOCK_CHARS;
  }), true, f);
  const clipped = textToBlocks_('y'.repeat(50), 10);
  assertEq_('clipped text gets a note', clipped.length, 2, f);

  // web page text
  const html = '<html><head><title>Berita &amp; Kajian</title><style>p{}</style></head>'
    + '<body><script>x=1</script><h1>Judul</h1><p>Isi pertama.</p><p>Isi&nbsp;kedua</p></body></html>';
  assertEq_('html to text', htmlToText_(html), { title: 'Berita & Kajian', text: 'Judul\nIsi pertama.\nIsi kedua' }, f);

  // the "Final" section contract
  const lines = [
    { type: 'h2', text: 'Request' }, { type: 'p', text: 'Buat KAK' },
    { type: 'h1', text: 'Final' }, { type: 'p', text: 'Isi KAK' }, { type: 'h2', text: 'Latar belakang' }, { type: 'ul', text: 'poin' },
    { type: 'h1', text: 'Changelog' }, { type: 'p', text: 'revisi 1' },
  ];
  assertEq_('final section', extractFinal_(lines), [
    { type: 'p', text: 'Isi KAK' }, { type: 'h2', text: 'Latar belakang' }, { type: 'ul', text: 'poin' },
  ], f);
  assertEq_('no final heading', extractFinal_([{ type: 'p', text: 'x' }]), null, f);
  assertEq_('last Final wins', extractFinal_([
    { type: 'h1', text: 'Final' }, { type: 'p', text: 'lama' }, { type: 'h1', text: 'Final (v2)' }, { type: 'p', text: 'baru' },
  ]), [{ type: 'p', text: 'baru' }], f);

  // misc
  assertEq_('mime guess pdf', guessMime_('laporan.PDF', 'application/octet-stream'), 'application/pdf', f);
  assertEq_('first line', firstLine_('abc\ndef', 80), 'abc', f);
  assertEq_('first line cut', firstLine_('abcdefghij', 5), 'abcd…', f);
  assertEq_('token regex escape', escapeRegex_('{{body}}'), '\\{\\{body\\}\\}', f);

  if (f.length) {
    Logger.log('FAILED ' + f.length + ' test(s):\n' + f.join('\n'));
    throw new Error(f.length + ' test(s) failed. See the Execution log.');
  }
  Logger.log('PASS: all tests passed');
}
