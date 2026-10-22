"""Normalize legacy news and derive metadata without losing dated announcements."""
import copy
import json
import re
import unicodedata
from datetime import date
from pathlib import Path
from bs4 import BeautifulSoup


def normalize_html_block(markup):
    # Indented/blank HTML lines were interpreted as Markdown code blocks.
    return "\n".join(line.strip() for line in markup.splitlines() if line.strip())


def summary_from_html(markup, limit=180):
    soup = BeautifulSoup(markup, 'html.parser')
    paragraph = next((node for node in soup.find_all('p') if node.get_text(strip=True)), soup)
    clone = copy.copy(paragraph)
    for br in clone.find_all('br'):
        br.replace_with('␞')
    lead = clone.get_text(' ', strip=True).split('␞', 1)[0].split('【発表題目】', 1)[0]
    lead = re.sub(r'\s+', ' ', lead).strip()
    if '発表しました' in lead and 'で' in lead:
        people = lead.rsplit('で', 1)[1]
        if 'さん' in people:
            lead = people
    return lead if len(lead) <= limit else lead[:limit].rstrip('、，, ') + '…'


def date_from_news(title, markup):
    heading = unicodedata.normalize('NFKC', title)
    text = unicodedata.normalize('NFKC', BeautifulSoup(markup, 'html.parser').get_text(' ', strip=True))
    # An explicit date in the body takes priority over an incidental year in a
    # conference name, e.g. ACALCI2016 with a body dated (2016.2.2).
    full = r'((?:20|19)\d{2})[/.年](\d{1,2})[/.月](\d{1,2})'
    for value in [heading, text[:70]]:
        match = re.search(full, value)
        if match:
            return date(*map(int, match.groups())).isoformat(), 'day'
    match = re.search(r'((?:20|19)\d{2})[/.年](\d{1,2})', heading)
    if match:
        return date(int(match[1]), int(match[2]), 1).isoformat(), 'month'
    match = re.search(r'(?:20|19)\d{2}', heading)
    return (f'{match[0]}-01-01', 'year') if match else (None, 'unknown')


def category_from_news(title):
    # Showcase selections and competition wins belong with awards. Testing only
    # for the literal word 受賞 incorrectly classified five legacy stories.
    if re.search(r'受賞|表彰|優勝|学生.*賞|Showcase.*選', title, re.I):
        return 'award'
    if re.search(r'新年度|新学期|メンバー|加わ|留学生', title):
        return 'lab'
    if re.search(r'発表|講演|シンポジウム|学会|Forum|CONGRESS|Conference|EUCASS|EFDC', title, re.I):
        return 'conference'
    return 'notice'


def apply_news_corrections(source_order, metadata, body):
    corrections = json.loads(Path(__file__).with_name('legacy-news-corrections.json').read_text())
    correction = corrections.get(str(source_order), {})
    for old, new in correction.get('bodyReplacements', []):
        if old not in body and new not in body:
            raise ValueError(f'Legacy story {source_order}: correction text not found: {old}')
        body = body.replace(old, new)
    metadata.update(correction.get('metadata', {}))
    metadata['summary'] = correction.get('metadata', {}).get('summary', summary_from_html(body))
    return metadata, normalize_html_block(body)
