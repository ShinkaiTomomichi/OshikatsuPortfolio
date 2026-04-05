# 推し活ログ

推し活の活動記録をまとめる GitHub Pages 向け静的サイトです。
フレームワークなし、素の HTML / CSS / JavaScript のみで実装しています。

## ファイル構成

```
index.html        # メインページ
css/style.css     # スタイルシート
js/main.js        # ロジック（データ取得・描画・フィルター・ライトボックス）
data/logs.json    # 活動ログデータ
```

## ローカルでの動作確認

`data/logs.json` は `fetch()` で読み込むため、`file://` で直接開くと CORS エラーになります。
以下のいずれかの方法でローカルサーバを起動してから確認してください。

### Python（追加インストール不要）

```bash
# プロジェクトのルートディレクトリで実行
python3 -m http.server 8000
```

ブラウザで [http://localhost:8000](http://localhost:8000) を開く。

### Node.js（npx）

```bash
npx serve .
```

### VS Code の Live Server 拡張機能

1. 拡張機能「Live Server」をインストール
2. `index.html` を右クリック → **Open with Live Server**

---

サーバを停止するときは `Ctrl + C` を押してください。

## ログデータの追加・編集

`data/logs.json` を直接編集します。各エントリのフィールドは以下の通りです。

```json
{
  "date": "YYYY-MM-DD",
  "category": "live | event | shop",
  "title": "イベント名",
  "venue": "会場名（省略可）",
  "url": "公式サイトURL（省略可）",
  "body": "感想・まとめ文章（省略可）",
  "tags": ["タグ1", "タグ2"],
  "images": ["画像パス1", "画像パス2", "画像パス3"]
}
```

| フィールド | 必須 | 説明 |
|---|---|---|
| `date` | ✓ | `YYYY-MM-DD` 形式 |
| `category` | ✓ | `live` / `event` / `shop` のいずれか |
| `title` | ✓ | イベント名 |
| `venue` | — | 会場名 |
| `url` | — | 公式サイト URL |
| `body` | — | 感想・まとめ |
| `tags` | — | 任意のタグ文字列の配列 |
| `images` | — | 表示する画像パス（最大 3 枚） |

## GitHub Pages への公開

`master` ブランチを push した後、リポジトリの **Settings → Pages → Source** で
`Deploy from a branch` / `master` / `/(root)` を選択して Save するだけで公開されます。

公開 URL: `https://<ユーザー名>.github.io/<リポジトリ名>/`
