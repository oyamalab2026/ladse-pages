# 更新ガイド

## ニュースを追加する

`src/content/news/2026-11-01-example.md` のような、日付と固有の名前を持つファイルを作ります。

```markdown
---
title: ニュースのタイトル
date: '2026-11-01'
datePrecision: day
sourceOrder: -1
image: null
---

ニュース本文を記入します。

![内容を説明する代替テキスト](/media/example.webp)
```

`sourceOrder` は小さい順に並びます。新しいニュースは既存の最小値より1小さくします。過去記事の元の順番を保つための仕組みです。実際の日付だけを記入し、月しか分からなければ `datePrecision: month`、年だけなら `year` とします。日付が全く不明なら `date: null` と `datePrecision: unknown` にします。過去記事は原文を保つため、日本語の記事は英語版一覧でも日本語記事と明記してリンクします。

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
