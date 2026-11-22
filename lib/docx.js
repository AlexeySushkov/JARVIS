const enc = new TextEncoder();

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

export function crc32(bytes) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = (c >>> 8) ^ CRC_TABLE[(c ^ bytes[i]) & 0xFF];
  return (c ^ 0xFFFFFFFF) >>> 0;
}

function writer() {
  const chunks = [];
  let len = 0;
  return {
    u16(v) { const b = new Uint8Array(2); new DataView(b.buffer).setUint16(0, v, true); chunks.push(b); len += 2; },
    u32(v) { const b = new Uint8Array(4); new DataView(b.buffer).setUint32(0, v >>> 0, true); chunks.push(b); len += 4; },
    raw(arr) { chunks.push(arr); len += arr.length; },
    done() { const out = new Uint8Array(len); let o = 0; for (const c of chunks) { out.set(c, o); o += c.length; } return out; },
  };
}

// ZIP с методом "store" (без сжатия): документ крошечный, а архив при этом
// полностью детерминирован и не зависит от доступности CompressionStream.
export function buildZip(entries) {
  const meta = entries.map((e) => {
    const nameBytes = enc.encode(e.name);
    return { nameBytes, crc: crc32(e.data), size: e.data.length };
  });
  let offset = 0;
  const offsets = meta.map((m) => {
    const o = offset;
    offset += 30 + m.nameBytes.length + m.size;
    return o;
  });

  const w = writer();
  entries.forEach((e, i) => {
    const m = meta[i];
    w.u32(0x04034B50);        // local file header signature
    w.u16(20);                // version needed
    w.u16(0x0800);            // flags: UTF-8 filenames
    w.u16(0);                 // method: store
    w.u16(0); w.u16(0);       // time, date (0 = not set)
    w.u32(m.crc);
    w.u32(m.size); w.u32(m.size);
    w.u16(m.nameBytes.length);
    w.u16(0);                 // extra len
    w.raw(m.nameBytes);
    w.raw(e.data);
  });

  const cdStart = offset;
  const cdSize = meta.reduce((sum, m) => sum + 46 + m.nameBytes.length, 0);

  entries.forEach((e, i) => {
    const m = meta[i];
    w.u32(0x02014B50);        // central directory header signature
    w.u16(20); w.u16(20);     // version made by, version needed
    w.u16(0x0800);
    w.u16(0);                 // method
    w.u16(0); w.u16(0);
    w.u32(m.crc);
    w.u32(m.size); w.u32(m.size);
    w.u16(m.nameBytes.length);
    w.u16(0);                 // extra len
    w.u16(0);                 // comment len
    w.u16(0);                 // disk number start
    w.u16(0);                 // internal attrs
    w.u32(0);                 // external attrs
    w.u32(offsets[i]);        // local header offset
    w.raw(m.nameBytes);
  });

  w.u32(0x06054B50);          // end of central directory signature
  w.u16(0); w.u16(0);         // disk number, disk with CD
  w.u16(entries.length); w.u16(entries.length);
  w.u32(cdSize);
  w.u32(cdStart);
  w.u16(0);                   // comment len

  return w.done();
}

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

export function buildDocx(documentXml) {
  return buildZip([
    { name: '[Content_Types].xml', data: enc.encode(CONTENT_TYPES) },
    { name: '_rels/.rels', data: enc.encode(RELS) },
    { name: 'word/document.xml', data: enc.encode(documentXml) },
  ]);
}
