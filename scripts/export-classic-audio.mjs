import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import ts from 'typescript';

// Compile our typed, static manuscript only. No application or provider code runs.
const root = process.cwd();
const manuscript = fs.readFileSync(path.join(root, 'src/lib/classic-catalog.ts'), 'utf8');
const compiled = ts.transpileModule(manuscript, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022}}).outputText;
const exports = {};
vm.runInNewContext(compiled, {exports}, {timeout: 1000});
const books = exports.classicBooks;
if (!Array.isArray(books) || books.length !== 10) throw new Error('Expected ten complete classic manuscripts.');
const source = books.map(book => ({id: book.id, title: book.title, pages: book.pages.map(page => Object.fromEntries(['ko', 'en'].map(locale => {
  const text = locale === 'ko' ? page.text : page.en;
  if (!text.trim()) throw new Error(`Missing manuscript: ${book.id}/${locale}`);
  return [locale, {text, sha256: crypto.createHash('sha256').update(text, 'utf8').digest('hex')}];
})))}));
fs.mkdirSync(path.join(root, 'artifacts/classics-audio'), {recursive: true});
fs.writeFileSync(path.join(root, 'artifacts/classics-audio/source.json'), JSON.stringify(source, null, 2) + '\n');
console.log(`Prepared ${books.length} books / ${books.reduce((n, book) => n + book.pages.length, 0)} scenes in Korean and English.`);
