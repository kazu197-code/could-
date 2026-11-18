// ドライブのお手本（01通知.docx／06 事務連絡.docx／01通知文.docx）の段落構成を再現する
import {
  Document, Packer, Paragraph, TextRun, AlignmentType, DocumentGridType,
} from "docx";

const FONT = "BIZ UDゴシック";
const SIZE = 24; // half-points = 12pt
const CHAR = 240; // 1字 = 12pt = 240 twips
const mm = (v) => Math.round((v / 25.4) * 1440);

const run = (text) =>
  new TextRun({
    text,
    font: { ascii: FONT, eastAsia: FONT, hAnsi: FONT, cs: FONT },
    size: SIZE,
  });

const p = (text = "", opts = {}) =>
  new Paragraph({ children: text ? [run(text)] : [], ...opts });

const right = (text) => p(text.endsWith("　") ? text : text + "　", { alignment: AlignmentType.RIGHT });
const center = (text) => p(text, { alignment: AlignmentType.CENTER });
const indent1 = (text) => p(text, { indent: { firstLine: CHAR } });

/**
 * data = {
 *   kind: "jimu" | "tsuchi",
 *   docNumber: "松消総第１２３号",   // 通知文のみ
 *   date: "令和８年１１月１８日",
 *   recipient: "所　属　長",
 *   sender: "消　防　局　長",
 *   title: "…について",
 *   body: ["このことについて、…", "つきましては、…"],
 *   items: [{ heading: "日時", lines: ["令和８年…"] }],
 *   closing: "以上" | "",
 *   contact: { office: "", person: "", ext: "" },
 * }
 */
export function buildDocument(data) {
  const children = [];

  children.push(right(data.kind === "tsuchi" && data.docNumber ? data.docNumber : "事務連絡"));
  children.push(right(data.date || ""));
  children.push(p());
  children.push(indent1(data.recipient || "所　属　長"));
  children.push(p());
  children.push(right(data.sender || ""));
  children.push(p());
  children.push(center(data.title || ""));
  children.push(p());

  for (const para of data.body || []) {
    children.push(indent1(para.replace(/^[\s　]+/, "")));
  }

  const items = (data.items || []).filter((it) => it && (it.heading || (it.lines || []).length));
  if (items.length) {
    children.push(p());
    children.push(center("記"));
    children.push(p());
    items.forEach((it, i) => {
      const num = String(i + 1).replace(/[0-9]/g, (d) => String.fromCharCode(d.charCodeAt(0) + 0xfee0));
      children.push(p(`${num}　${it.heading || ""}`));
      for (const line of it.lines || []) {
        children.push(indent1(line.replace(/^[\s　]+/, "")));
      }
      children.push(p());
    });
  } else {
    children.push(p());
  }

  if (data.closing) {
    children.push(p(data.closing, { alignment: AlignmentType.RIGHT, indent: { right: CHAR } }));
  }

  const c = data.contact || {};
  const contactLines = [
    c.office && `事務局：${c.office}`,
    c.person && `担　当：${c.person}`,
    c.ext && `内　線：${c.ext}`,
  ].filter(Boolean);
  if (contactLines.length) {
    children.push(p());
    children.push(p());
    // お手本では全角スペース24字分の位置から始まる
    for (const line of contactLines) children.push(p(line, { indent: { left: CHAR * 24 } }));
  }

  return new Document({
    styles: {
      default: {
        document: {
          run: { font: { ascii: FONT, eastAsia: FONT, hAnsi: FONT, cs: FONT }, size: SIZE },
          paragraph: { spacing: { before: 0, after: 0 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: mm(35), bottom: mm(30), left: mm(30), right: mm(30), header: 851, footer: 992 },
          },
          grid: { type: DocumentGridType.LINES, linePitch: 360 },
        },
        children,
      },
    ],
  });
}

export async function buildDocxBuffer(data) {
  return Packer.toBuffer(buildDocument(data));
}
