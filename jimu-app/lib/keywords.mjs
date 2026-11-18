// 依頼文から、ドライブの全文検索に使うキーワードを作るための指示
export const KEYWORD_SYSTEM = `松戸市消防局の職員が、事務連絡や通知文を作るためにGoogleドライブの資料を探しています。
依頼文から、ドライブの全文検索に使うキーワードを3〜5個選んでください。
- 文書のファイル名や本文に実際に出てきそうな、短い語（2〜8文字程度）にする。例：「署長会議」「開催通知」「フレックスタイム」「時間外勤務」「立入検査」
- 「去年の」「今年用に」のような語や、年度・日付・回数（第２回など）はキーワードにしない。
- 1つ目に、いちばん絞り込める語を置く。`;

export const KEYWORD_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["keywords"],
  properties: { keywords: { type: "array", items: { type: "string" } } },
};
