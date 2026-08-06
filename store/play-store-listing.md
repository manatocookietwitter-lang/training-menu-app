# Google Play 公開準備

## 掲載文案

- アプリ名：練習メニュープランナー
- 短い説明：人数に合わせた練習量と所要時間を、かんたんに計算・画像保存
- カテゴリ：スポーツ

### 詳しい説明

練習メニュープランナーは、チームやグループの練習内容を組み立てるためのシンプルなアプリです。

人数パターンを選ぶと、メニューごとのセット数から合計の練習量と所要時間を計算できます。完成したメニュー表は画像で保存でき、履歴からいつでも確認できます。

- 練習メニューと分類を自由に追加・編集
- ドラッグ操作でメニューを並び替え
- 2つの人数パターンを比較
- 完成したメニュー表を画像保存
- 保存した写真を端末内の履歴で管理
- アカウント登録不要

## 公開用URL

- アプリ：https://manatocookietwitter-lang.github.io/training-menu-app/
- プライバシーポリシー：https://manatocookietwitter-lang.github.io/training-menu-app/privacy.html
- Web App Manifest：https://manatocookietwitter-lang.github.io/training-menu-app/manifest.webmanifest

## Android App Bundleを作るときの設定

- 方式：Trusted Web Activity（Bubblewrap）
- 推奨パッケージID例：`io.github.manatocookietwitterlang.trainingmenu`
- target SDK：API 36
- display mode：standalone
- theme color：`#17823b`
- signing key：Play App Signingを使用

パッケージIDはGoogle Playへの初回登録後に変更できないため、確定してからAndroidプロジェクトを作成すること。

```powershell
npx @bubblewrap/cli init --manifest=https://manatocookietwitter-lang.github.io/training-menu-app/manifest.webmanifest
npx @bubblewrap/cli build
```

作成後、Play Consoleの「アプリの署名鍵証明書」のSHA-256フィンガープリントを使い、`store/assetlinks.json.template`の値を埋める。そのファイルを公開サイトの `/.well-known/assetlinks.json` として配信すると、ブラウザの上部バーがないアプリ表示になる。

## Play Consoleで残る作業

1. デベロッパーアカウントと連絡先を登録する。
2. 変更しないパッケージIDを決める。
3. AABをアップロードし、Play App Signingを有効にする。
4. ストア用スクリーンショットとフィーチャーグラフィックを登録する。
5. Data safetyを入力する。アプリ本体には解析・広告SDKがなく、入力内容は端末内保存だが、配信事業者が処理する接続情報も含めて実態と申告を一致させる。
6. 新しい個人アカウントの場合は、12人以上が14日間継続参加するクローズドテストを行う。
7. 2026年8月31日以降の新規提出ではAPI 36以上を対象にする。
