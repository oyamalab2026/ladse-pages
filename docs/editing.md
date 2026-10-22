# 更新ガイド

## ニュースを追加する

[ニュース記事の保存先](https://github.com/oyamalab2026/ladse-pages/tree/main/src/content/news)を開き、**Add file → Create new file** で `2026-11-01-conference.md` のようなファイルを追加します。日付と記事名は、実際の内容に合わせて変更してください。

```markdown
---
title: ニュースのタイトル
date: '2026-11-01'
category: conference
summary: 発表者と発表内容など、一覧に表示する短い概要を記入します。
---

ニュース本文を記入します。
発表者・学会名・発表題目、受賞者・賞の正式名称などを記載します。

必要に応じて関連ページへのリンクや写真を追加します。

![写真の説明](/media/example.webp)
```

`summary` は記事見出しの下に薄い文字で表示されます。学会発表では発表者、受賞記事では受賞者と賞の名称などを1〜2文で記入します。

上記は記入例です。画像の行は実際に掲載する写真がある場合に使います。写真は `public/media/` に追加します。

| category | 表示 | 内容の例 |
|---|---|---|
| `conference` | 学会発表 | 学会名・開催日・発表者・題目 |
| `award` | 受賞・選出 | 受賞・優勝・AIAA Showcase等への選出。受賞者・正式名称・授与団体 |
| `lab` | 研究室行事 | 新年度・新学期、メンバー加入、卒業・修了など |
| `notice` | お知らせ | その他の研究室からのお知らせ |

記事は日付の新しい順に表示され、トップページには最新6件が掲載されます。`sourceOrder` の指定は不要です。同じ日付の過去記事は、旧HPでの掲載順を保ちます。

実際の日付だけを記入します。月しか分からなければ `datePrecision: month`、年だけなら `datePrecision: year` を追加します。日付が全く不明なら `date: null` と `datePrecision: unknown` にします。日付不明の記事は末尾に表示されます。月だけの値は `date: '2026-11-01'` と `datePrecision: month`、年だけの値は `date: '2026-01-01'` と `datePrecision: year` を組にします。1日は並べ替え用で、画面・HTML属性には日を表示しません。

出典は次のように追加できます。受賞日と公開日を区別する必要があれば `dateNote` に説明します。記事末尾に出典へのリンクが表示されます。

```yaml
dateNote: 受賞者一覧公開日
sources:
  - title: 学会公式の受賞者一覧
    url: https://example.org/awards/
```

ニュース一覧上部の「受賞・選出」などから分類別に表示できます。タイトルに `Showcase` を含む記事は「AIAA Showcase」一覧にも表示されます。研究紹介ページの存在だけで受賞や選出を断定せず、その場合は `notice` として紹介します。既存記事の日付を訂正するときも、ファイル名は変更せず公開URLを維持します。旧ニュースの再調査結果・不明点は [news-audit.md](news-audit.md) にあります。

日本語の記事は英語版一覧でも日本語の記事としてリンクします。記事を追加して `main` に反映すると、ニュース一覧・トップページ・記事ページが自動で更新されます。

## メンバーを更新する

`src/data/members.yaml` の配列に次の形式で追加します。

```yaml
- id: person-unique-name
  group: students
  groupLabel: 学生 Students
  name: 氏名
  nameEn: ''
  role: M1
  description: 氏名，修士1年，所属大学・専攻
  topic: 研究テーマ
  topicEn: Research topic
  image: /media/example.webp
```

`id` は全メンバーで一意とし、年度が変わっても同じ人には同じ値を使用します。`group` は `staff`、`students`、`collaborators` のいずれかです。英字氏名は本人の表記を確認し、不明な場合は推測せず空欄にします。

卒業・異動時は該当レコードを `alumni.yaml` へ移します。`groupLabel` を卒業年度などの見出しに変更すると、その見出しの下に表示されます。過去所属・進路を現在の情報として断定しないでください。

## 業績を追加する

`src/data/publications.yaml` の該当カテゴリの先頭付近に追加します。

```yaml
- id: paper-2026-unique-title
  category: journal
  year: 2026
  citation: 著者，論文題名，掲載誌，巻，ページ，年などの正式な引用情報
  links:
    - https://doi.org/正式なDOI
```

カテゴリは `journal`、`international`、`domestic`、`invited`、`keynote`、`book`、`commentary`、`transration`、`doctor` です。`transration` は旧URL互換のため旧サイトの識別子を引き継いでいます。年が未記載なら `null` を使用します。DOIや巻号を推測して補いません。

## GitHubで反映する

1. 対象ファイルを開いて編集し、作業ブランチへコミットします。
2. Pull Requestを作り、Cloudflareのプレビューと自動チェックを確認します。
3. 問題がなければ `main` にマージします。Pagesが自動更新します。

プレビューURLも初期設定では公開されます。公開する内容だけをコミットしてください。
