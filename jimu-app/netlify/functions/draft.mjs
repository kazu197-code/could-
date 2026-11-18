import Anthropic from "@anthropic-ai/sdk";
import { checkPasscode, json } from "../../lib/auth.mjs";

const client = new Anthropic(); // ANTHROPIC_API_KEY を Netlify の環境変数から読む

const SYSTEM = `あなたは松戸市消防局の職員の事務を手伝う担当者です。依頼に沿って、庁内で回覧する「事務連絡」または「通知文」の件名・本文・記書きを作ります。

# 書き方の決まり（局内の既存文書に合わせる）
- 件名は「〜について」で終える。回答なら「〜について（回答）」、依頼なら「〜について（依頼）」。
- 本文の書き出しは「このことについて、」「このことにつきましては、」「みだしのことについては、」のいずれか。
- 本文は「です・ます」調。結びは「下記のとおり〜しますので、よろしくお願いします。」「〜いただきますようお願いします。」など。
- 日付・数字は全角（例：令和８年１２月１０日（木）、１４時００分）。曜日を括弧で添える。
- 記書きの各項目は見出しを短い名詞（「日時」「場所」「対象職員」「提出期限」「その他」など）にし、内容は lines に1行ずつ入れる。見出しに番号は付けない（番号はアプリが付ける）。
- 箇条の内容は簡潔に。注意書きは「※」で始める。
- 依頼にない事実（日付、場所、人名、金額、条文）は作らない。分からない箇所は「〇〇」と書き、missing に何が足りないかを書く。
- 「です・ます」以外の口調、絵文字、太字や記号の装飾は使わない。
- 本文は2〜3段落、各段落は1〜3文程度。長くしすぎない。

# 局内の文書の例
件名：消防局におけるフレックスタイム制の運用について
本文：
このことについて、総務部長から令和８年８月２０日付け事務連絡、「フレックスタイム制の導入について」が発出されました。
つきましては、原則上記の総務部長通知に準じますが、運用に関しては業務の運営に支障を来さないよう、職員間の十分な調整を図るとともに、下記のとおり対応いただきますようお願いします。
記：
対象職員／毎日勤務職員及び隔日勤務職員のうち日勤日に限る。／※管理職についても、対象職員に含まれます。
施行日／令和８年１０月１日

件名：松戸市消防局公式Twitterのアカウント開設及び運用について
本文：
このことにつきましては、消防行政の広報をより充実させるため、消防局公式のTwitterアカウントを開設しました。つきましては、下記のとおり運用しますので各所属の広報活動にご活用いただきますよう、よろしくお願いします。`;

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "body", "items", "missing"],
  properties: {
    title: { type: "string", description: "件名" },
    body: { type: "array", items: { type: "string" }, description: "本文の段落。字下げの全角スペースは付けない" },
    items: {
      type: "array",
      description: "記書きの項目。不要なら空配列",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["heading", "lines"],
        properties: {
          heading: { type: "string" },
          lines: { type: "array", items: { type: "string" } },
        },
      },
    },
    missing: { type: "array", items: { type: "string" }, description: "依頼文から分からず〇〇にした情報" },
  },
};

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "POST only" });
  const denied = checkPasscode(req);
  if (denied) return denied;
  if (!process.env.ANTHROPIC_API_KEY) {
    return json(500, { error: "サーバーに API キー（ANTHROPIC_API_KEY）が設定されていません。" });
  }

  let input;
  try {
    input = await req.json();
  } catch {
    return json(400, { error: "リクエストの形式が正しくありません。" });
  }
  const { kind, request, today, sender, recipient, current, revision } = input || {};
  if (!request && !revision) return json(400, { error: "依頼の内容を入力してください。" });

  const kindName = kind === "tsuchi" ? "通知文" : "事務連絡";
  let userText = `文書の種類：${kindName}\n今日の日付：${today || ""}\n発信者：${sender || ""}\n宛先：${recipient || ""}\n\n依頼：\n${request || ""}`;
  if (current && revision) {
    userText += `\n\n今の下書き（JSON）：\n${JSON.stringify(current)}\n\n直してほしいこと：\n${revision}\n\n直してほしいこと以外は、今の下書きをできるだけそのまま残してください。`;
  }

  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 8000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
      system: SYSTEM,
      messages: [{ role: "user", content: userText }],
    });

    if (response.stop_reason === "refusal") {
      return json(422, { error: "この依頼内容では文書を作れませんでした。言い方を変えてもう一度お試しください。" });
    }
    if (response.stop_reason === "max_tokens") {
      return json(502, { error: "文章が長くなりすぎました。依頼を短く分けてお試しください。" });
    }
    const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    const draft = JSON.parse(text);
    return json(200, { draft });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return json(500, { error: "API キーが正しくないようです。Netlify の設定を確認してください。" });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return json(429, { error: "混み合っています。少し待ってからもう一度お試しください。" });
    }
    if (err instanceof Anthropic.APIStatusError) {
      const msg = String(err.message || "");
      if (/credit|billing|balance/i.test(msg)) {
        return json(402, { error: "API の残高が足りません。Claude Console の Billing でチャージしてください。" });
      }
      return json(502, { error: `AI の呼び出しでエラーが起きました（${err.status}）。` });
    }
    if (err instanceof SyntaxError) {
      return json(502, { error: "AI の返事を読み取れませんでした。もう一度お試しください。" });
    }
    return json(500, { error: "予期しないエラーが起きました。もう一度お試しください。" });
  }
};

export const config = { path: "/api/draft" };
