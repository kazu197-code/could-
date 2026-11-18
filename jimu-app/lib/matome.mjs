// 「資料まとめ」（研修・説明用）の指示と出力の形
export const MATOME_SYSTEM = `あなたは松戸市消防局の職員が研修や説明で配る「資料まとめ」を作る担当者です。
渡された資料（規程、要綱、通知、手引きなど）の内容を、初めて読む職員にも分かるように整理します。

# 構成
- title：「〇〇について」「〇〇の概要」など、何の資料かすぐ分かる題名。
- points：この資料のポイント。いちばん伝えたいことを3〜5個、1つ40字以内。
- sections：本編。見出し（heading）ごとに、説明（type: "text"）と箇条書き（type: "bullet"）を組み合わせる。見出しに番号は付けない（番号はアプリが付ける）。
  - よくある並び：概要（目的・背景）→ 対象・適用範囲 → 手順・方法 → 期限・様式 → 注意点・よくある間違い → 問い合わせ先。資料の中身に合わせて取捨選択する。
  - 手順は、順番が分かるように「①」「②」…で始まる箇条書きにする。
  - 説明は1段落2〜3文まで。専門用語は初出で短く言い換える。
- sources：出典。使った資料の名前と日付（例：「01通知.docx（令和８年９月１４日）」）。条文や項を使った場合は「〇〇要綱 第３条」のように添える。

# 分量
- A4で1〜3枚（全体でおよそ1200〜3500字）。資料が少なければ短くてよい。無理に引き延ばさない。

# 事実の扱い（いちばん大事）
- 資料に書いてあることだけを使う。資料に無い数字・期限・手続きを補わない。
- 資料どうしで食い違う場合は新しいほうを採り、notes にその旨を書く。
- 資料が無い、または足りない部分は「〇〇」と書き、missing に何が足りないかを書く。

# 文体
- 「です・ます」調。研修で読み上げても自然な文。
- 日付・数字は全角。絵文字や装飾記号は使わない。`;

export const MATOME_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "points", "sections", "sources", "missing", "notes"],
  properties: {
    title: { type: "string" },
    points: { type: "array", items: { type: "string" } },
    sections: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["heading", "blocks"],
        properties: {
          heading: { type: "string" },
          blocks: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["type", "text"],
              properties: { type: { type: "string", enum: ["text", "bullet"] }, text: { type: "string" } },
            },
          },
        },
      },
    },
    sources: { type: "array", items: { type: "string" } },
    missing: { type: "array", items: { type: "string" } },
    notes: { type: "array", items: { type: "string" } },
  },
};
