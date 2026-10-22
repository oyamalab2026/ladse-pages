"""Normalize legacy news HTML and derive factual list summaries."""
import copy
import re
from bs4 import BeautifulSoup


def normalize_html_block(markup):
    # Keep imported raw HTML in one contiguous block. Old indentation otherwise
    # makes Markdown interpret the nested elements as a code block.
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
