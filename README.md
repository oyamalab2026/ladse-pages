# Oyama Lab — LADSE

大山研究室の公開HP。Astroで静的HTMLを生成し、Cloudflare Pagesへ公開します。主要ページは日本語・英語、過去資料は原文のアーカイブです。

公開サイト：[日本語](https://oyamalab2026.pages.dev/ja/) · [English](https://oyamalab2026.pages.dev/en/)

## ローカルで確認する

Node.js 24を使用します。

```bash
nvm install
nvm use
npm ci
npm run dev
```

表示されたURLの `/ja/` または `/en/` を開いてください。現在の制作環境では、プロジェクト専用Node.jsも `.tools/node-runtime/node_modules/node/bin/node` に用意しています。

```bash
npm run check
npm test
npm run build
npm run test:browser
```

ブラウザーテストは、インストール済みのGoogle Chromeを使用します。利用できない環境では `npx playwright install chromium` を実行してください。

## 日々の更新

- ニュース：`src/content/news/` にMarkdownを追加。日付・タイトル・本文を記入します。
- 研究紹介：`src/content/research/ja/` と `en/` を編集します。
- 現在のメンバー：`src/data/members.yaml` を編集。卒業・異動時は同じレコードを `alumni.yaml` へ移します。
- 業績：`src/data/publications.yaml` に追加します。引用文は原文のまま、年が不明な場合は `null` とします。
- 写真：`public/media/` に画像を追加し、本文やデータから参照します。

詳しい記入例は [更新ガイド](docs/editing.md) を参照してください。

## 公開

公開先リポジトリは `oyamalab2026/ladse-pages` です。既存の `flabhomepage/ladse` と旧サーバーは、このプロジェクトの公開処理では変更しません。

1. `npm run check`、`npm test`、`npm run build`、ブラウザーテストを通します。
2. 研究室GitHubアカウントを認証し、`npm run publish:prepare` で専用リポジトリを作成・pushします。既存の別プロジェクトは上書きしません。
3. ローカルに保持した旧資料を `npm run publish:assets` でGitHub Releasesへアップロードします。原本とのSHA-256照合を行い、同名の異なるファイルは上書きしません。
4. `node scripts/verify-publication.mjs` で大型資料9件の公開を確認します。
5. Cloudflareダッシュボードで **Workers & Pages → Create application** を開き、画面下部の **Looking to deploy Pages? → Get started → Import an existing Git repository** から専用リポジトリを接続します。Pages用の画面には **Build output directory** 欄があります。初回だけ、CloudflareのGitHubアプリに対象リポジトリへのアクセスを許可する必要があります。
6. 本番ブランチを `main`、ビルドを `npm run build`、出力を `dist`、Node.jsを24に設定します。`SITE_URL` に実際の `https://プロジェクト名.pages.dev` を設定します。
7. 発行されたURLで日英ページ・画像・ダウンロード・転送・404を確認します。作業ブランチはプレビュー、本番更新は `main` へのマージで行います。

GitHub認証は `gh auth login` または環境変数 `GH_TOKEN` / `GITHUB_TOKEN` に対応しています。トークンをファイルやGitに保存しないでください。Cloudflareの設定は研究室管理アカウントで行います。

現在の本番設定は `SITE_URL=https://oyamalab2026.pages.dev`、`NODE_VERSION=24` です。独自ドメインへ切り替える場合も `SITE_URL` を更新します。環境変数なしで使われる `ladse-pages.pages.dev` は初期制作時の仮設定なので、本番では必ず `SITE_URL` を設定してください。

## 旧資料の再取り込み

初回取り込み結果は [移行レポート](docs/migration-report.json) に記録しています。元のHTMLに存在した不達リンクは同レポートに保存し、アーカイブ内では不達のローカルリンクを無効化しています。

`scripts/import-legacy.py` は読み取り用スナップショットからコンテンツを再生成する初回移行ツールです。**日々の編集後に再実行すると、取り込んだデータや本文を再生成します。通常の更新には使わないでください。** 大型資料の原本はGit対象外の `.migration/source/` に保持しています。Releasesへの初回アップロード完了まで保管してください。

## 戻す場合

Cloudflare Pagesの本番デプロイ一覧から直前の正常な版へロールバックします。その後、問題の変更をGitでrevertし、本番とソースをそろえます。初回公開では既存ドメインを変更しないため、旧サイトの接続設定はそのまま残ります。
