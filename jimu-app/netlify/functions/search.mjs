import { checkPasscode, json } from "../../lib/auth.mjs";
import { askJson, errorResponse } from "../../lib/claude.mjs";
import { callDrive, driveConfigured } from "../../lib/drive.mjs";
import { streamJson, asBody } from "../../lib/stream.mjs";
import { KEYWORD_SYSTEM, KEYWORD_SCHEMA } from "../../lib/keywords.mjs";


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
  return streamJson(async () => {
  try {
    let keywords = (input.keywords || []).map((s) => String(s).trim()).filter(Boolean);
    if (!keywords.length) {
      if (!input.request) return { error: "頼みたいことを入力してください。" };
      keywords = (await askJson({ system: KEYWORD_SYSTEM, user: `依頼：${input.request}`, schema: KEYWORD_SCHEMA, maxTokens: 2000 })).keywords.slice(0, 4);
    }
    const { files } = await callDrive("search", { keywords, limit: 15 });
    return { keywords, files };
  } catch (err) {
    return asBody(errorResponse(err));
  }
  });
};

export const config = { path: "/api/search" };
