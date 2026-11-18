import Anthropic from "@anthropic-ai/sdk";
import { json } from "./auth.mjs";
import { DriveError } from "./drive.mjs";

const client = new Anthropic(); // ANTHROPIC_API_KEY を Netlify の環境変数から読む

export class UserFacingError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// 構造化出力（JSON スキーマ）で1回呼び出して、JSON を返す
export async function askJson({ system, user, schema, effort = "low", maxTokens = 8000 }) {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new UserFacingError(500, "サーバーに API キー（ANTHROPIC_API_KEY）が設定されていません。");
  }
  const response = await client.beta.messages.create({
    model: "claude-opus-5-5",
    max_tokens: maxTokens,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort, format: { type: "json_schema", schema } },
    system,
    messages: [{ role: "user", content: user }],
  });
  if (response.stop_reason === "refusal") {
    throw new UserFacingError(422, "この依頼内容では文書を作れませんでした。言い方を変えてもう一度お試しください。");
  }
  if (response.stop_reason === "max_tokens") {
    throw new UserFacingError(502, "文章が長くなりすぎました。依頼や資料を減らしてお試しください。");
  }
  const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  try {
    return JSON.parse(text);
  } catch {
    throw new UserFacingError(502, "AI の返事を読み取れませんでした。もう一度お試しください。");
  }
}

export function errorResponse(err) {
  if (err instanceof UserFacingError) return json(err.status, { error: err.message });
  if (err instanceof DriveError) return json(502, { error: err.message });
  if (err instanceof Anthropic.AuthenticationError) {
    return json(500, { error: "API キーが正しくないようです。Netlify の設定を確認してください。" });
  }
  if (err instanceof Anthropic.RateLimitError) {
    return json(429, { error: "混み合っています。少し待ってからもう一度お試しください。" });
  }
  if (err instanceof Anthropic.APIStatusError) {
    if (/credit|billing|balance/i.test(String(err.message || ""))) {
      return json(402, { error: "API の残高が足りません。Claude Console の Billing でチャージしてください。" });
    }
    return json(502, { error: `AI の呼び出しでエラーが起きました（${err.status}）。` });
  }
  console.error(err);
  return json(500, { error: "予期しないエラーが起きました。もう一度お試しください。" });
}
