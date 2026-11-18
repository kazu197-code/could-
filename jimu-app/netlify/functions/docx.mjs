import { buildDocxBuffer } from "../../lib/docx-builder.mjs";
import { checkPasscode, json } from "../../lib/auth.mjs";

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "POST only" });
  const denied = checkPasscode(req);
  if (denied) return denied;
  let data;
  try {
    data = await req.json();
  } catch {
    return json(400, { error: "リクエストの形式が正しくありません。" });
  }
  const buf = await buildDocxBuffer(data);
  return new Response(buf, {
    status: 200,
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "cache-control": "no-store",
    },
  });
};

export const config = { path: "/api/docx" };
