import { checkPasscode, json } from "../../lib/auth.mjs";
import { askJson, errorResponse } from "../../lib/claude.mjs";
import { callDrive, driveConfigured } from "../../lib/drive.mjs";

const SYSTEM = `松戸市消防局の職員が、事務連絡や通知文を作るためにGoogleドライブの資料を探しています。
依頼文から、ドライブの全文検索に使うキーワードを3〜5個選んでください。
- 文書のファイル名や本文に実際に出てきそうな、短い語（2〜8文字程度）にする。例：「署長会議」「開催通知」「フレックスタイム」「時間外勤務」「立入検査」
- 「去年の」「今年用に」のような語や、年度・日付・回数（第２回など）はキーワードにしない。
- 1つ目に、いちばん絞り込める語を置く。`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["keywords"],
  properties: { keywords: { type: "array", items: { type: "string" } } },
};

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "POST only" });
  const denied = checkPasscode(req);
  if (denied) return denied;
  if (!driveConfigured()) return json(400, { error: "ドライブ連携がまだ設定されていません。" });

  let input;
  try {
    input = await req.json();
  } catch {
    return json(400, { error: "リクエストの形式が正しくありません。" });
  }
  try {
    let keywords = (input.keywords || []).map((s) => String(s).trim()).filter(Boolean);
    if (!keywords.length) {
      if (!input.request) return json(400, { error: "頼みたいことを入力してください。" });
      keywords = (await askJson({ system: SYSTEM, user: `依頼：${input.request}`, schema: SCHEMA, maxTokens: 2000 })).keywords;
    }
    const { files } = await callDrive("search", { keywords, limit: 15 });
    return json(200, { keywords, files });
  } catch (err) {
    return errorResponse(err);
  }
};

export const config = { path: "/api/search" };
