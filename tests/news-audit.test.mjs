import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { parse } from 'yaml';
const root = new URL('../', import.meta.url);
const audit = JSON.parse(readFileSync(new URL('docs/news-audit.json', root), 'utf8'));
const entries = new Map(readdirSync(new URL('src/content/news/', root)).filter(name => name.endsWith('.md')).map(name => {
  const [, front, body] = readFileSync(new URL(`src/content/news/${name}`, root), 'utf8').split('---', 3);
  return [name.slice(0, -3), { ...parse(front), body }];
}));

test('every legacy announcement has a distinct retained URL and source record', () => {
  assert.equal(audit.records.length, 78);
  assert.deepEqual(audit.records.map(record => record.sourceOrder), Array.from({length:78}, (_, i) => i));
  assert.equal(new Set(audit.records.map(record => record.id)).size, 78);
  for (const record of audit.records) {
    const entry = entries.get(record.id);
    assert.ok(entry, `Missing legacy story: ${record.sourceTitle}`);
    assert.equal(entry.sourceOrder, record.sourceOrder);
    assert.ok(record.sourceTitle && record.sourceBodyTextSha256);
  }
});

test('award selections and wins are retained alongside the five sourced additions', () => {
  const legacyAwards = audit.records.filter(record => record.category === 'award');
  assert.equal(legacyAwards.length, 18);
  assert.equal(audit.additions.length, 5);
  for (const record of [...legacyAwards, ...audit.additions]) {
    assert.equal(entries.get(record.id)?.category, 'award', record.id);
  }
  for (const record of audit.additions) {
    const entry = entries.get(record.id);
    assert.ok(entry.sources.length >= 1);
    assert.ok(entry.sources.every(source => source.url.startsWith('https://')));
  }
});

test('dates in old body text are used without fabricating days for uncertain awards', () => {
  const dates = ['2017-12-09','2017-10-01','2017-10-01','2017-10-01','2017-04-01','2017-03-09','2017-01-17','2016-06-12','2016-03-10','2016-02-22','2016-02-02','2014-12-25'];
  dates.forEach((date, offset) => {
    const record = audit.records.find(record => record.sourceOrder === offset + 66);
    assert.equal(entries.get(record.id).date, date);
    assert.equal(entries.get(record.id).datePrecision, 'day');
  });
  const kaneko = entries.get('2024-02-03-016');
  assert.equal(kaneko.datePrecision, 'year');
  assert.ok(!kaneko.title.includes('2024/2/3'));
  assert.equal(kaneko.dateNote, '選出月日未確認');
  assert.equal(entries.get('2025-07-iida-ists-award').datePrecision, 'month');
});

test('conference title and body agree, and official award terminology is retained', () => {
  const meeting = entries.get('2026-04-15-004');
  assert.match(meeting.title, /日本航空宇宙学会 第57期 年会講演会/);
  assert.match(meeting.body, /日本航空宇宙学会 第57期 年会講演会/);
  assert.ok(!meeting.body.includes('令和7年度航空宇宙空力シンポジウム'));
  assert.match(entries.get('2026-01-30-006').body, /令和7年度航空宇宙空力シンポジウム/);
  assert.match(entries.get('2024-03-21-028').title, /学生優秀講演賞/);
  assert.match(entries.get('2025-07-02-013').title, /2名が発表/);
  assert.match(entries.get('2025-04-01-014').body, /2025年度は/);
});
