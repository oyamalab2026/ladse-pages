#!/usr/bin/env python3
"""Import a read-only snapshot of the public LADSE site. Never contacts the server."""
import argparse
import copy
import hashlib
import json
import re
import shutil
from pathlib import Path
from urllib.parse import quote, unquote, urljoin, urlsplit

import yaml
from bs4 import BeautifulSoup
from PIL import Image, ImageOps
from legacy_news import normalize_html_block, summary_from_html

ROOT = Path(__file__).resolve().parents[1]
LIMIT = 25 * 1024 * 1024
REPO = 'oyamalab2026/ladse-pages'
RELEASE = 'legacy-assets-2026-10-22'
DENIED = {'.git', 'owncloud', 'staff_only', 'node_modules'}


def dump(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.suffix == '.json':
        path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    else:
        path.write_text(yaml.safe_dump(value, allow_unicode=True, sort_keys=False, width=110))


def soup(path):
    return BeautifulSoup(path.read_bytes(), 'html5lib')


def plain(node):
    return re.sub(r'\s+', ' ', node.get_text(' ', strip=True)).strip() if node else ''


def split_lines(node):
    clone = copy.copy(node)
    for br in clone.find_all('br'):
        br.replace_with('\n')
    return [re.sub(r'\s+', ' ', x).strip() for x in clone.get_text().splitlines() if x.strip()]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    args = parser.parse_args()
    source = args.source.resolve()
    if not (source / 'research.html').is_file() or not (source / 'index.html').is_file():
        raise SystemExit('Expected a snapshot of the public ladse_dir directory.')
    files = [p for p in sorted(source.rglob('*')) if p.is_file() and not p.is_symlink()
             and not any(part in DENIED or part.startswith('.') for part in p.relative_to(source).parts)
             and p.suffix.lower() not in {'.php', '.sh', '.sql', '.log', '.md', '.bak'}]
    downloads = []
    for p in files:
        if p.stat().st_size > LIMIT:
            rel = p.relative_to(source).as_posix()
            asset = rel.replace('/', '__')
            downloads.append({'path': rel, 'asset': asset, 'bytes': p.stat().st_size,
                              'sha256': hashlib.file_digest(p.open('rb'), 'sha256').hexdigest(),
                              'url': f'https://github.com/{REPO}/releases/download/{RELEASE}/{quote(asset)}'})
    big = {x['path']: x for x in downloads}
    available = {p.relative_to(source).as_posix() for p in files}
    broken = set()

    def link(value, origin, image=False):
        if not value or value.startswith(('#', 'mailto:', 'tel:', 'data:')):
            return value
        u = urlsplit(urljoin('https://legacy.invalid/' + origin, value))
        if u.scheme not in {'http', 'https'}:
            return None
        if u.netloc != 'legacy.invalid':
            # Archive external references without loading insecure remote resources.
            if image and u.scheme != 'https':
                return None
            return u.geturl()
        rel = unquote(u.path.lstrip('/'))
        if any(x in DENIED for x in Path(rel).parts):
            return None
        if rel in big:
            return big[rel]['url']
        if not rel or rel.endswith('/'):
            rel += 'index.html'
        if rel not in available:
            broken.add((origin, value))
            return None
        return '/archive/' + quote(rel, safe='/') + (('?' + u.query) if u.query else '') + (('#' + u.fragment) if u.fragment else '')

    optimized = {}

    def photo(value):
        if not value:
            return None
        u = urlsplit(value)
        if u.netloc:
            return None
        rel = unquote(u.path).removeprefix('./')
        if rel in optimized:
            return optimized[rel]
        p = source / rel
        if not p.is_file():
            return None
        key = hashlib.sha1(rel.encode()).hexdigest()[:10]
        out = ROOT / 'public/media' / f'{key}.webp'
        out.parent.mkdir(parents=True, exist_ok=True)
        try:
            with Image.open(p) as im:
                im = ImageOps.exif_transpose(im).convert('RGB')
                im.thumbnail((1800, 1400))
                im.save(out, 'WEBP', quality=86, method=6)
            optimized[rel] = '/media/' + out.name
            return optimized[rel]
        except (OSError, ValueError):
            return link(value, 'index.html', image=True)

    def clean_fragment(node, origin):
        fragment = BeautifulSoup(str(node), 'html5lib')
        for tag in fragment.find_all(['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button']):
            tag.decompose()
        for tag in list(fragment.find_all(True)):
            if tag.name in {'html', 'head', 'body'}:
                continue
            if tag.name in {'font', 'small', 'center'}:
                tag.unwrap()
                continue
            attrs = {}
            if tag.name == 'a':
                href = link(tag.get('href'), origin)
                if href:
                    attrs['href'] = href
                    if href.startswith('https://'):
                        attrs['rel'] = 'noopener noreferrer'
                else:
                    tag.unwrap()
                    continue
            if tag.name == 'img':
                src = link(tag.get('src'), origin, image=True)
                if not src:
                    tag.decompose()
                    continue
                attrs = {'src': src, 'alt': tag.get('alt', ''), 'loading': 'lazy'}
            tag.attrs = attrs
        rendered = ''.join(str(x) for x in fragment.body.contents)
        return normalize_html_block(rendered)

    archive = ROOT / 'public/archive'
    archive.mkdir(parents=True, exist_ok=True)
    for p in files:
        rel = p.relative_to(source).as_posix()
        if rel in big:
            continue
        dst = archive / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        if p.suffix.lower() in {'.html', '.htm'}:
            s = soup(p)
            for x in list(s.find_all(['script', 'iframe', 'object', 'embed', 'form'])):
                x.decompose()
            for x in list(s.find_all('meta', attrs={'http-equiv': True})):
                x.decompose()
            for tag in list(s.find_all(True)):
                for attr in list(tag.attrs):
                    if attr.lower().startswith('on'):
                        del tag[attr]
                for attr in ['href', 'src', 'poster']:
                    if not tag.get(attr):
                        continue
                    mapped = link(tag[attr], rel, image=tag.name in {'img', 'video', 'source'})
                    if mapped:
                        tag[attr] = mapped
                    else:
                        del tag[attr]
                if tag.name == 'a' and tag.get('target'):
                    tag['rel'] = 'noopener noreferrer'
            if s.head:
                for encoding_meta in s.head.find_all('meta', attrs={'charset': True}):
                    encoding_meta.decompose()
                s.head.insert(0, s.new_tag('meta', attrs={'charset': 'utf-8'}))
                noindex = s.new_tag('meta', attrs={'name': 'robots', 'content': 'noindex,follow'})
                s.head.append(noindex)
            if s.body:
                banner = s.new_tag('div', attrs={'style': 'padding:16px;background:#0c273b;color:#fff;font:15px system-ui;position:relative;z-index:99999'})
                banner.string = '旧サイトの記録 / Archived content — '
                a = s.new_tag('a', href='/ja/', attrs={'style': 'color:#fff;text-decoration:underline'})
                a.string = '新しい研究室HPへ / Visit the new site'
                banner.append(a)
                s.body.insert(0, banner)
            dst.write_text(str(s))
        else:
            shutil.copyfile(p, dst)

    # Main-site media are optimized independently; archival originals remain intact.
    for rel in ['images/mars-airplane.jpg', 'images/2025top.JPG', 'images/oyama2024.jpg',
                'images/1815.jpg', 'images/1816.jpg', 'images/tunnel01.jpg', 'images/tunnel02.jpg',
                'images/tunnel03.jpg', 'images/tunnel04.jpg', 'images/jss2.jpg', 'images/workstations.jpg',
                'research/mars00.jpg', 'research/mars01.png', 'research/mars02.png', 'research/mars03.png',
                'research/marsHeli01.jpg', 'research/marsrocket.jpg', 'research/mode01.png',
                'research/AerospikeNozzle.jpg', 'research/DESTINYTrajectory.jpg',
                'research/fc01.jpg', 'research/fc02.jpg', 'research/sj01.jpg']:
        photo(rel)

    members = []
    alumni = []
    for name, dest in [('current-member.html', members), ('former-member.html', alumni)]:
        s = soup(source / name)
        for ti, table in enumerate(s.select('main table')):
            heading = plain(table.find('thead'))
            group = 'staff' if 'Staff' in heading else 'collaborators' if 'Collaborative' in heading else 'students'
            for ri, row in enumerate(table.select('tbody tr')):
                cells = row.find_all(['td', 'th'], recursive=False)
                if len(cells) < 2:
                    continue
                info = cells[1]
                lines = split_lines(info)
                if not lines:
                    continue
                bolds = info.find_all(['b', 'strong'])
                full = plain(info)
                ja_name = plain(bolds[0]) if bolds else re.split(r'[\s,，]', lines[0])[0]
                en_name = plain(bolds[1]) if len(bolds) > 1 else ''
                degree = re.search(r'(博士|修士|学部)(\d)年', full)
                role = ('D' if degree[1] == '博士' else 'M' if degree[1] == '修士' else 'B') + degree[2] if degree else ('Professor' if group == 'staff' and name.startswith('current') else '')
                image = row.find('img')
                topic = split_lines(cells[2]) if len(cells) > 2 else []
                dest.append({'id': f'{"current" if dest is members else "alumni"}-{ti}-{ri}',
                             'group': group, 'groupLabel': heading, 'name': ja_name, 'nameEn': en_name,
                             'role': role, 'description': full,
                             'topic': topic[0] if topic else '', 'topicEn': topic[1] if len(topic) > 1 else '',
                             'image': photo(image.get('src')) if image else None})
    dump(ROOT / 'src/data/members.yaml', members)
    dump(ROOT / 'src/data/alumni.yaml', alumni)

    pubs = []
    s = soup(source / 'publications.html')
    categories = {'journal': ('査読付き学術論文', 'Journal articles'), 'international': ('国際会議', 'International conferences'),
                  'domestic': ('国内会議', 'Domestic conferences'), 'invited': ('招待講演', 'Invited talks'),
                  'keynote': ('基調講演', 'Keynotes'), 'book': ('著書・分担執筆', 'Books & chapters'),
                  'commentary': ('解説記事', 'Commentaries'), 'transration': ('翻訳記事', 'Translations'),
                  'doctor': ('博士論文', 'Doctoral theses')}
    for li in s.select('main .section-in li'):
        # html5lib repairs the unclosed <li> tags in the original bibliography.
        if li.find('li'):
            continue
        h = li.find_previous('h3')
        anchor = h.find('a', attrs={'name': True}) if h else None
        cat = anchor['name'] if anchor else 'other'
        citation = plain(li)
        if not citation:
            continue
        years = re.findall(r'(?<!\d)((?:19|20)\d{2})(?!\d)', citation)
        year = int(years[-1]) if years and 1900 <= int(years[-1]) <= 2027 else None
        links = []
        for a in li.find_all('a', href=True):
            href = link(a['href'], 'publications.html')
            if href and href not in links:
                links.append(href)
        for doi in re.findall(r'https?://doi\.org/[^\s<>，、）)]+', citation):
            if doi not in links:
                links.append(doi.rstrip('.,'))
        pubs.append({'id': f'publication-{len(pubs)+1:04}', 'category': cat, 'year': year,
                     'citation': citation, 'links': links})
    dump(ROOT / 'src/data/publications.yaml', pubs)
    dump(ROOT / 'src/data/publication-categories.json', {k: {'ja': v[0], 'en': v[1]} for k, v in categories.items()})

    news = soup(source / 'index.html').select('article.news-item')
    newsdir = ROOT / 'src/content/news'
    newsdir.mkdir(parents=True, exist_ok=True)
    for i, article in enumerate(news):
        title = plain(article.find('h3'))
        if not title:
            continue
        m = re.search(r'(20\d{2}|19\d{2})[/.年](\d{1,2})(?:[/.月](\d{1,2}))?', title)
        year = re.search(r'(20\d{2}|19\d{2})', title)
        date = f'{int(m[1]):04}-{int(m[2]):02}-{int(m[3] or 1):02}' if m else (year[1]+'-01-01' if year else None)
        precision = ('day' if m[3] else 'month') if m else ('year' if year else 'unknown')
        clone = copy.copy(article)
        h = clone.find('h3')
        if h:
            h.decompose()
        image = article.find('img')
        meta = {'title': title, 'date': date, 'datePrecision': precision, 'sourceOrder': i,
                'image': photo(image.get('src')) if image else None}
        filename = f'{date or "undated"}-{i:03}.md'
        body = clean_fragment(clone, 'index.html')
        meta['summary'] = summary_from_html(body)
        (newsdir / filename).write_text('---\n'+yaml.safe_dump(meta, allow_unicode=True, sort_keys=False)+'---\n\n'+body+'\n')

    groups = [
        {'id': 'benchmarks', 'title': {'ja': '設計最適化ベンチマーク', 'en': 'Design optimization benchmarks'}, 'path': '/archive/benchmark/index.html', 'description': {'ja': '車両構造・空力設計のベンチマーク問題と配布データ。', 'en': 'Benchmark problems and datasets for structural and aerodynamic design.'}},
        {'id': 'space-benchmarks', 'title': {'ja': '宇宙工学の最適化問題', 'en': 'Aerospace optimization problems'}, 'path': '/archive/benchmark_space/index.html', 'description': {'ja': '宇宙工学に関連する最適化問題・参考資料。', 'en': 'Optimization problems and reference materials in aerospace engineering.'}},
        {'id': 'lectures', 'title': {'ja': '講義資料', 'en': 'Lecture materials'}, 'path': '/ja/resources/#lectures', 'description': {'ja': '公開済みの講義スライド・参考資料。原文のまま保存しています。', 'en': 'Previously published lecture slides and reference materials, preserved in their original language.'}},
        {'id': 'mabe', 'title': {'ja': '火星飛行機の飛行試験 MABE', 'en': 'Mars Airplane Balloon Experiment'}, 'path': '/archive/mabe2/2023MABE2.html', 'description': {'ja': '高高度気球を用いた火星飛行機の飛行試験の記録。', 'en': 'Records of high-altitude flight experiments using a balloon.'}},
    ]
    lecture_files = [p.relative_to(source).as_posix() for p in files if p.relative_to(source).parts[0] == 'lecture' and p.suffix.lower() in {'.pdf', '.html'}]
    dump(ROOT / 'src/data/resources.json', {'groups': groups, 'lectures': [{'path': p, 'url': big[p]['url'] if p in big else '/archive/'+quote(p, safe='/')} for p in lecture_files]})
    dump(ROOT / 'src/data/downloads.json', downloads)
    dump(ROOT / 'src/data/media.json', optimized)
    report = {'source': 'flabweb:/data/www/html/ladse_dir', 'snapshotDate': '2026-10-22',
              'publicFiles': len(files), 'archivedFiles': len(files)-len(downloads), 'largeFiles': len(downloads),
              'members': len(members), 'alumni': len(alumni), 'publications': len(pubs),
              'publicationsWithoutYear': sum(x['year'] is None for x in pubs), 'news': len(news),
              'unresolvedLegacyLinks': [{'source': a, 'href': b} for a,b in sorted(broken)]}
    dump(ROOT / 'docs/migration-report.json', report)
    # Old major routes and large-asset aliases remain usable on the new host.
    routes = {'/': '/ja/', '/index.html': '/ja/', '/research.html': '/ja/research/',
              '/current-member.html': '/ja/people/', '/former-member.html': '/ja/people/alumni/',
              '/publications.html': '/ja/publications/', '/environment.html': '/ja/environment/',
              '/joinus.html': '/ja/join/', '/access.html': '/ja/contact/'}
    redirects = [f'{a} {b} 301' for a,b in routes.items()]
    for x in downloads:
        redirects += [f'/{quote(x["path"],safe="/")} {x["url"]} 301', f'/archive/{quote(x["path"],safe="/")} {x["url"]} 301']
    for prefix in ['benchmark','benchmark_space','lecture','mabe2','papers','Phdthesis','current-member-information']:
        redirects.append(f'/{prefix}/* /archive/{prefix}/:splat 301')
    (ROOT/'public/_redirects').write_text('\n'.join(redirects)+'\n')
    print(json.dumps({k:v for k,v in report.items() if k!='unresolvedLegacyLinks'},ensure_ascii=False,indent=2))
    print('Unresolved legacy references recorded:',len(broken))


if __name__ == '__main__':
    main()
