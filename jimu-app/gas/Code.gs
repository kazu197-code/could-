/**
 * 事務の分身 ― Google ドライブ連携（Google Apps Script）
 *
 * アプリ（Netlify）から呼ばれて、次の3つだけを行います。
 *   search : ドライブの文書をキーワードで探す（読み取りのみ）
 *   read   : 選んだ文書の本文を読む（読み取りのみ）
 *   save   : 作った Word を「事務の分身」フォルダに保存する
 * ファイルの削除・移動・共有設定の変更は一切しません。
 *
 * 設定：下の TOKEN を、アプリ側（Netlify の GAS_TOKEN）と同じ文字列にしてください。
 */
const TOKEN = 'ここに合言葉を入れる';
const SAVE_FOLDER_NAME = '事務の分身';
const MAX_CHARS_PER_FILE = 20000;

const MIME = {
  DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  GDOC: 'application/vnd.google-apps.document',
  TEXT: 'text/plain',
};

function doPost(e) {
  let req;
  try {
    req = JSON.parse(e.postData.contents);
  } catch (err) {
    return out_({ error: 'bad request' });
  }
  if (!TOKEN || TOKEN === 'ここに合言葉を入れる' || req.token !== TOKEN) {
    return out_({ error: 'unauthorized' });
  }
  try {
    if (req.action === 'search') return out_(search_(req.keywords || [], req.limit || 15));
    if (req.action === 'read') return out_(read_(req.ids || []));
    if (req.action === 'save') return out_(save_(req.name, req.base64));
    return out_({ error: 'unknown action' });
  } catch (err) {
    return out_({ error: String(err && err.message || err) });
  }
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function q_(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

// キーワードごとに全文検索し、多くのキーワードに当たった文書・新しい文書を上に並べる
function search_(keywords, limit) {
  const typeCond = "(mimeType = '" + MIME.DOCX + "' or mimeType = '" + MIME.GDOC + "' or mimeType = '" + MIME.TEXT + "')";
  const hits = {};
  keywords.slice(0, 6).forEach(function (kw) {
    kw = String(kw || '').trim();
    if (!kw) return;
    const it = DriveApp.searchFiles("trashed = false and " + typeCond + " and (title contains '" + q_(kw) + "' or fullText contains '" + q_(kw) + "')");
    let n = 0;
    while (it.hasNext() && n < 40) {
      const f = it.next();
      n++;
      const id = f.getId();
      if (!hits[id]) {
        const parents = f.getParents();
        hits[id] = {
          id: id,
          name: f.getName(),
          mimeType: f.getMimeType(),
          folder: parents.hasNext() ? parents.next().getName() : '',
          modified: f.getLastUpdated().toISOString(),
          url: f.getUrl(),
          score: 0,
        };
      }
      hits[id].score += f.getName().indexOf(kw) >= 0 ? 2 : 1;
    }
  });
  const files = Object.keys(hits).map(function (k) { return hits[k]; });
  files.sort(function (a, b) { return b.score - a.score || (b.modified > a.modified ? 1 : -1); });
  return { files: files.slice(0, limit) };
}

function read_(ids) {
  return {
    files: ids.slice(0, 5).map(function (id) {
      const f = DriveApp.getFileById(id);
      const mt = f.getMimeType();
      let text = '';
      if (mt === MIME.GDOC) text = DocumentApp.openById(id).getBody().getText();
      else if (mt === MIME.DOCX) text = docxText_(f.getBlob());
      else if (mt === MIME.TEXT) text = f.getBlob().getDataAsString('UTF-8');
      else text = '（この形式の文書は読めません）';
      return { id: id, name: f.getName(), modified: f.getLastUpdated().toISOString(), text: text.slice(0, MAX_CHARS_PER_FILE) };
    }),
  };
}

// Word ファイルの中の word/document.xml から段落ごとの文字を取り出す
function docxText_(blob) {
  blob.setContentType('application/zip');
  const parts = Utilities.unzip(blob);
  const doc = parts.filter(function (p) { return p.getName() === 'word/document.xml'; })[0];
  if (!doc) return '';
  const xml = doc.getDataAsString('UTF-8');
  const paras = xml.split(/<\/w:p>/);
  const lines = paras.map(function (p) {
    const indent = /<w:jc w:val="(right|end)"/.test(p) ? '［右寄せ］' : /<w:jc w:val="center"/.test(p) ? '［中央］' : '';
    const t = (p.match(/<w:t(?:\s[^>]*)?>[^<]*<\/w:t>|<w:tab\/>/g) || [])
      .map(function (m) { return m === '<w:tab/>' ? '\t' : m.replace(/<[^>]+>/g, ''); })
      .join('');
    return indent + t;
  });
  return lines.join('\n')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function save_(name, base64) {
  if (!name || !base64) throw new Error('name and base64 are required');
  const folders = DriveApp.getRootFolder().getFoldersByName(SAVE_FOLDER_NAME);
  const folder = folders.hasNext() ? folders.next() : DriveApp.getRootFolder().createFolder(SAVE_FOLDER_NAME);
  const blob = Utilities.newBlob(Utilities.base64Decode(base64), MIME.DOCX, name);
  const file = folder.createFile(blob);
  return { id: file.getId(), url: file.getUrl(), folder: SAVE_FOLDER_NAME };
}

// 動作確認用：スクリプトエディタでこの関数を選んで「実行」すると、ドライブへのアクセス許可を求められます
function testSearch() {
  Logger.log(JSON.stringify(search_(['事務連絡'], 5)));
}
