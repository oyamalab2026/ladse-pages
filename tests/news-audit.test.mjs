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

test('award selections and wins are retained alongside sourced additions', () => {
  const legacyAwards = audit.records.filter(record => record.category === 'award');
  assert.equal(legacyAwards.length, 18);
  assert.ok(audit.additions.length >= 7);
  for (const record of [...legacyAwards, ...audit.additions.filter(record => record.category === 'award')]) {
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

const review = JSON.parse(readFileSync(new URL('docs/news-2023-2026-review.json', root), 'utf8'));
test('the 2023–2026 review covers each original story, including embedded award documents', () => {
  assert.equal(review.source.sha256, audit.sourceHtmlSha256);
  assert.equal(review.source.matchesInitialSnapshot, true);
  assert.equal(review.records.length, 45);
  assert.deepEqual(review.records.map(record => record.sourceOrder), Array.from({length:45}, (_, i) => i));
  for (const record of review.records) {
    const entry = entries.get(record.id);
    assert.ok(entry, record.sourceTitle);
    for (const reference of record.sourceReferences) {
      assert.ok(entry.body.includes(reference.url), `Missing ${reference.kind} in ${record.id}: ${reference.url}`);
    }
  }
  assert.match(entries.get('2024-06-30-023').body, /href="\/archive\/images\/news\/Certificate1.pdf"/);
});

test('Showcase coverage includes the old announcements and both additional research stories', () => {
  const expected = new Map([
    ['2024-02-03-016', '金子賢人'],
    ['2024-02-03-030', '篠塚温志'],
    ['2026-01-onishi-scitech-showcase', '大西龍汰郎'],
    ['2026-iida-scitech-showcase', '飯田悠生'],
    ['2026-sawada-scitech-showcase', '澤田健'],
    ['2024-endo-scitech-research-story', '遠藤桜'],
  ]);
  for (const [id, name] of expected) {
    assert.ok(review.showcases.some(record => record.id === id), `Missing Showcase story: ${name}`);
    assert.ok(entries.get(id).title.includes(name));
    assert.match(entries.get(id).title, /Showcase/i);
  }
  const iida = entries.get('2026-iida-scitech-showcase');
  assert.match(iida.body, /Yuki Iida/);
  assert.ok(!iida.body.includes('飯田怜央'));
  assert.equal(iida.datePrecision, 'year');
  assert.match(iida.dateNote, /掲載月日未確認/);
  // A public research story alone does not establish an award or selection.
  const endo = entries.get('2024-endo-scitech-research-story');
  assert.equal(endo.category, 'notice');
  assert.ok(!endo.body.includes('受賞しました'));
  assert.match(entries.get('2023-04-14-042').title, /学生優秀発表賞/);
  assert.match(entries.get('2024-03-21-028').title, /学生優秀講演賞/);
});


test('Sawada CFD37 award is retained separately from the 2023 presentation with its announcement date', () => {
  const id = '2024-01-10-sawada-cfd37-award';
  const award = entries.get(id);
  assert.ok(audit.additions.some(record => record.id === id));
  assert.ok(review.additionalAwardFollowup.some(record => record.id === id));
  assert.equal(award.category, 'award');
  assert.equal(award.date, '2024-01-10');
  assert.equal(award.dateNote, '受賞者一覧公開日');
  assert.match(award.summary, /澤田健さん.*2023年12月/);
  assert.match(award.title, /第37回数値流体力学シンポジウムの若手優秀講演表彰/);
  assert.match(award.body, /大気アシスト型観測ロケットの排気ノズルまわりの流れと噴流の干渉が推力へ与える影響について/);
  assert.ok(award.sources.some(source => source.url === 'https://www.nagare.or.jp/prize/6403/7037.html'));
  assert.match(award.body, /\/ja\/news\/2023-12-15-034\//);
  assert.equal(entries.get('2023-12-15-034').category, 'conference');
});


test('Sawada Showcase selection uses laboratory confirmation without treating paper metadata as a selection date', () => {
  const id = '2026-sawada-scitech-showcase';
  const story = entries.get(id);
  assert.equal(story.category, 'award');
  assert.equal(story.datePrecision, 'year');
  assert.equal(story.dateNote, '選出月日未確認');
  assert.match(story.body, /Takeshi Sawada/);
  assert.match(story.body, /研究室からの提供/);
  assert.equal(story.sources[0].url, 'https://doi.org/10.2514/6.2026-1320');
  assert.equal(audit.additions.find(record => record.id === id).selectionEvidence.kind, 'laboratory-provided');
});
