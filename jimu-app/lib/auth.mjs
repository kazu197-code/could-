import { timingSafeEqual } from "node:crypto";

export function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

// 合言葉（Netlify の環境変数 APP_PASSCODE）が一致しないリクエストは断る
export function checkPasscode(req) {
  const expected = process.env.APP_PASSCODE || "";
  const given = req.headers.get("x-passcode") || "";
  if (!expected) return json(500, { error: "サーバーに合言葉（APP_PASSCODE）が設定されていません。" });
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return json(401, { error: "合言葉が違います。設定画面で確認してください。" });
  }
  return null;
}
