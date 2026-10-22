import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
const json=p=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const yaml=p=>parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
const report=json('docs/migration-report.json');

test('migration preserves the source records while allowing additions and graduations',()=>{
 for(const file of ['members','alumni','publications']){
  const entries=yaml(`src/data/${file}.yaml`);
  assert.equal(new Set(entries.map(x=>x.id)).size,entries.length);
 }
 const people=[...yaml('src/data/members.yaml'),...yaml('src/data/alumni.yaml')];
 assert.ok(people.length>=report.members+report.alumni);
 assert.equal(new Set(people.map(x=>x.id)).size,people.length);
 assert.ok(yaml('src/data/publications.yaml').length>=report.publications);
 assert.equal(report.members,22);
 assert.equal(report.publications,778);
 assert.equal(report.news,78);
});
test('large files have distinct immutable download URLs and integrity hashes',()=>{
 const files=json('src/data/downloads.json');
 assert.equal(files.length,9);
 assert.equal(new Set(files.map(f=>f.asset)).size,9);
 for(const file of files){
  assert.match(file.sha256,/^[a-f0-9]{64}$/);
  assert.ok(file.bytes>25*1024*1024&&file.bytes<2*1024**3);
  assert.ok(file.url.includes('/releases/download/legacy-assets-2026-10-22/'));
 }
 const duplicates=files.filter(f=>f.path.endsWith('cheetah_result_20170404.zip'));
 assert.equal(duplicates.length,2);
 assert.notEqual(duplicates[0].asset,duplicates[1].asset);
 assert.notEqual(duplicates[0].sha256,duplicates[1].sha256);
});
test('citations without a stated year are retained rather than assigned fabricated years',()=>{
 const publications=yaml('src/data/publications.yaml');
 assert.equal(report.publicationsWithoutYear,20);
 assert.ok(publications.every(p=>p.year===null||Number.isInteger(p.year)));
 assert.ok(publications.every(p=>p.citation.trim().length>0));
});
