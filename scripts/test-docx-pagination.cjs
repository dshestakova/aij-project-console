const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Exercise the real builder without a Next.js server or calls to an LLM.
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const localRequire = (id) => id.startsWith('@/')
    ? load(path.resolve(__dirname, '../src', id.slice(2) + '.ts'))
    : require(id);
  new Function('require', 'module', 'exports', compiled)(localRequire, module, module.exports);
  return module.exports;
}

function unzipStored(buffer) {
  const files = new Map();
  let offset = 0;
  while (buffer.readUInt32LE(offset) === 0x04034b50) {
    assert.equal(buffer.readUInt16LE(offset + 8), 0);
    const size = buffer.readUInt32LE(offset + 18);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const name = buffer.subarray(offset + 30, offset + 30 + nameLength).toString();
    const start = offset + 30 + nameLength + extraLength;
    files.set(name, buffer.subarray(start, start + size).toString());
    offset = start + size;
  }
  return files;
}

const { buildProjectApplicationDocx } = load(path.resolve(__dirname, '../src/lib/document/project-document-docx.ts'));
for (const type of ['traditional_ai', 'generative_ai', 'agentic_ai']) {
  const answer = 'ПОДТВЕРЖДЕНО: Тестовое внедрение и начальная коммерциализация';
  const files = unzipStored(buildProjectApplicationDocx({ external_id: 'TEST', project_name: 'Проверка переносов', flagship_passport_uploaded: true }, type, [
    { title: 'Сведения о проекте', fields: [['Стадия проекта*', answer], ['Длинный ответ', 'Полный текст. '.repeat(1500)]] },
  ]));
  const styles = files.get('word/styles.xml');
  for (const name of ['Title', 'Heading2', 'Heading3']) {
    const style = styles.match(new RegExp(`<w:style[^>]*w:styleId="${name}"[^>]*>[\\s\\S]*?</w:style>`))[0];
    assert.match(style, /<w:keepNext\/>/);
    assert.match(style, /<w:keepLines\/>/);
  }
  const xml = files.get('word/document.xml');
  const rows = xml.match(/<w:tr>[\s\S]*?<\/w:tr>/g);
  assert.equal(rows.length, 5);
  for (const row of rows) {
    assert.match(row, /<w:trPr><w:cantSplit\/><\/w:trPr>/);
    assert.doesNotMatch(row, /<w:trHeight/);
  }
  assert.equal((xml.match(/<w:keepLines\/>/g) || []).length, 2);
  assert.ok(xml.includes('Полный текст. '.repeat(1500)), 'Long answers must not be truncated');
  assert.match(xml, /Тестовое внедрение и начальная коммерциализация/);
}
console.log('DOCX pagination checks passed for all three application types.');
