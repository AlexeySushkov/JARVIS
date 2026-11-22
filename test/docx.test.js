import test from 'node:test';
import assert from 'node:assert/strict';
import { crc32, buildZip, buildDocx } from '../lib/docx.js';
import { serializeWeekDocx } from '../lib/export.js';

// Читает store-архив: обходит локальные файловые заголовки до central directory.
function readZip(buf) {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const files = {};
  let off = 0;
  while (off + 4 <= buf.length) {
    const sig = dv.getUint32(off, true);
    if (sig !== 0x04034b50) break;
    const compSize = dv.getUint32(off + 18, true);
    const nameLen = dv.getUint16(off + 26, true);
    const extraLen = dv.getUint16(off + 28, true);
    const name = new TextDecoder().decode(buf.subarray(off + 30, off + 30 + nameLen));
    const dataStart = off + 30 + nameLen + extraLen;
    files[name] = buf.subarray(dataStart, dataStart + compSize);
    off = dataStart + compSize;
  }
  return files;
}

test('crc32: классический тестовый вектор', () => {
  const bytes = new TextEncoder().encode('123456789');
  assert.equal(crc32(bytes), 0xCBF43926);
});

test('buildZip: store-архив с корректными именами и содержимым', () => {
  const enc = new TextEncoder();
  const zip = buildZip([
    { name: 'a.txt', data: enc.encode('hello') },
    { name: 'dir/b.txt', data: enc.encode('мир') },
  ]);
  const files = readZip(zip);
  assert.deepEqual(Object.keys(files).sort(), ['a.txt', 'dir/b.txt']);
  assert.equal(new TextDecoder().decode(files['a.txt']), 'hello');
  assert.equal(new TextDecoder().decode(files['dir/b.txt']), 'мир');
});

test('buildDocx: три обязательных файла внутри', () => {
  const zip = buildDocx('<w:document/>');
  const files = readZip(zip);
  assert.ok(files['[Content_Types].xml']);
  assert.ok(files['_rels/.rels']);
  assert.ok(files['word/document.xml']);
  assert.equal(new TextDecoder().decode(files['word/document.xml']), '<w:document/>');
});

test('serializeWeekDocx: заголовок с датой, данные, переносы строк', () => {
  const docx = serializeWeekDocx([
    { date: '2026-11-16', mood: 7, slots: [{ slotId: '6-7', activity: 'Сон\nЗавтрак', pleasure: 7, importance: 8 }] },
  ]);
  const xml = new TextDecoder().decode(readZip(docx)['word/document.xml']);
  assert.ok(xml.includes('Понедельник 16.11.2026'));
  assert.ok(xml.includes('Сон'));
  assert.ok(xml.includes('Завтрак'));
  assert.ok(xml.includes('<w:br/>'));
  assert.ok(xml.includes('Настроение дня — 7'));
});

test('serializeWeekDocx: заголовок дня крупным шрифтом', () => {
  const docx = serializeWeekDocx([{ date: '2026-11-16', mood: null, slots: [] }]);
  const xml = new TextDecoder().decode(readZip(docx)['word/document.xml']);
  assert.ok(xml.includes('<w:sz w:val="28"/>'));
  assert.ok(xml.includes('<w:szCs w:val="28"/>'));
});

test('serializeWeekDocx: отступы внутри ячеек (текст не прилипает к рамке)', () => {
  const docx = serializeWeekDocx([{ date: '2026-11-16', mood: null, slots: [] }]);
  const xml = new TextDecoder().decode(readZip(docx)['word/document.xml']);
  assert.ok(xml.includes('<w:tblCellMar>'));
  assert.ok(xml.includes('<w:left w:w="108" w:type="dxa"/>'));
  assert.ok(xml.includes('<w:top w:w="60" w:type="dxa"/>'));
});

test('serializeWeekDocx: фиксированная ширина столбцов', () => {
  const docx = serializeWeekDocx([{ date: '2026-11-16', mood: null, slots: [] }]);
  const xml = new TextDecoder().decode(readZip(docx)['word/document.xml']);
  assert.ok(xml.includes('<w:tblLayout w:type="fixed"/>'));
  assert.ok(xml.includes('<w:tblGrid>'));
  assert.ok(xml.includes('<w:gridCol w:w="1200"/>'));
  assert.ok(xml.includes('<w:tcW w:w="1200" w:type="dxa"/>'));
});

test('serializeWeekDocx: экранирует спецсимволы', () => {
  const docx = serializeWeekDocx([{ date: '2026-11-16', mood: null, slots: [{ slotId: '6-7', activity: '<script>', pleasure: null, importance: null }] }]);
  const xml = new TextDecoder().decode(readZip(docx)['word/document.xml']);
  assert.ok(xml.includes('&lt;script&gt;'));
  assert.ok(!xml.includes('<script>'));
});
