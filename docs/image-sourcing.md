# 写真収集の手順

1. 対象: `docs/superpowers/specs/2026-08-31-train-quiz-design.md` §6 の全電車
2. Wikimedia Commons で「<形式名> <愛称>」で検索(例: "E353系 あずさ")
   - 優先ライセンス: CC0 / CC BY / CC BY-SA(GFDLのみは避ける)
   - 構図: 先頭車両が大きく写った編成写真。行き先表示で lookalike と区別できるものを優先
3. 原本を `assets-src/trains/<id>.<拡張子>` で保存(idは trains.json と一致させる)
4. `trains.json` の該当エントリに credit を記入:
   { "author": "<撮影者名>", "license": "<ライセンス名>", "source": "<ファイルページURL>" }
5. `npm run images` で WebP 変換 → `npm run validate` で検証
6. 画像が見つからない電車は trains.json から外し、`docs/image-sourcing.md` 末尾の
   「未収集リスト」に理由付きで記録して発注者に報告する
