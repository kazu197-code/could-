import { buildDocxBuffer } from "../../lib/docx-builder.mjs";
import { checkPasscode, json } from "../../lib/auth.mjs";
import { errorResponse } from "../../lib/claude.mjs";
import { callDrive, driveConfigured } from "../../lib/drive.mjs";

// Word を作って、ドライブの「事務の分身」フォルダに直接保存する
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
    const buf = await buildDocxBuffer(input.doc || {});
    const name = String(input.name || "文書.docx").replace(/[\\/:*?"<>|]/g, "");
    const saved = await callDrive("save", { name, base64: Buffer.from(buf).toString("base64") });
    return json(200, saved);
  } catch (err) {
    return errorResponse(err);
  }
};

export const config = { path: "/api/save" };
