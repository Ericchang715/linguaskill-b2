import { LABEL, timeLabel } from "./model.js";
import { button, field, h, icon } from "./ui.js";
import { resultList, wordExample } from "./views.js";

export const prompt = `請將下方的 Linguaskill CEFR B2 練習整理成一份可匯入的 JSON，外層為 {"schemaVersion":1,"sets":[...]}。依我指定的臺灣日期分組。確認原稿的題目與答案後，只輸出 JSON。若缺少答案或資訊互相矛盾，先請我確認。

每份題組包含 id、date、title、topic、description、passage、passageZh、cloze、vocabulary。date 用 YYYY-MM-DD。id 以日期開頭，用英數字和連字號，各題組 ID 不可重複。title、topic、description 使用臺灣繁體中文。

passage 為英文短文，空格依序使用 {{q1}}、{{q2}} 等標記。passageZh 是填入答案後的全文翻譯。cloze 每格包含 id、options、answer、explanation。選擇題提供字串陣列 options，answer 也列在選項中。輸入題的 options 用 []，若有多個正確答案可加 accepted 字串陣列。explanation 用繁中說明搭配、文法或上下文。

vocabulary 每項包含 id、word、pos、meaning、example、exampleZh、note。word 只需填一次。example 寫 CEFR B2 英文例句。meaning 和 exampleZh 用繁中，note 可留空。若只有一種題型，另一個題型用 []，純字彙題的短文與翻譯留空。

請整理這些日期與練習
〔在此貼上日期與內容〕`;
const error = '<p id="dialog-error" class="error" role="alert" hidden></p>';
const cancel = button("取消","close","","");
function shell(title, subtitle, body) {
  return `<header class="dialog-head"><div><h2 id="dialog-title">${title}</h2><p>${subtitle}</p></div><button type="button" class="btn quiet" data-action="close" aria-label="關閉視窗">${icon("close",21)}</button></header>${body}`;
}
function submit(label, name = "check") { return `<button type="submit" class="btn primary">${icon(name,17)}${label}</button>`; }
function upload(id, label) { return `<label class="field"><span>${label}</span><input id="${id}" type="file" accept=".json,application/json"></label>`; }

export function weekDialog() {
  return shell("新增每週練習","將一週的題組一次匯入，或改用表單新增單份。",`<form class="dialog-body" id="weekly">
    <div class="actions">${button("載入範例","example","list")}${button("複製整理指令","copy-prompt","copy")}<a class="btn quiet" href="./data/weekly-template.json" download>${icon("download",17)}下載範本</a></div>
    <label class="field"><span>每週題庫 JSON</span><textarea name="json" id="weekly-json" class="code" rows="10" placeholder='{"schemaVersion":1,"sets":[...]}' required spellcheck="false"></textarea></label>
    ${upload("week-file","或選擇題庫 JSON 檔")}
    <p class="hint">相同題組會自動略過。若要修改已存在的題組，請使用題庫管理。</p>
    <label class="field" id="prompt-fallback" hidden><span>選取後複製整理指令</span><textarea rows="6" readonly>${h(prompt)}</textarea></label>
    ${error}<div class="form-actions">${button("改用單份表單","new-set","plus")}${submit("匯入一週題目","upload")}</div>
  </form>`);
}
const wordFields = [
  ["word","英文單字或片語",100],["pos","詞性（選填）",40],["meaning","繁中意思",200],
  ["example","CEFR B2 英文例句",500,2],["exampleZh","例句繁中翻譯",500,2],["note","搭配用法（選填）",500]
];
export function editorDialog(set, isEdit, reset) {
  return shell(isEdit ? "編輯題組" : "新增單份練習","設定日期與主題，再加入填空、字彙或兩種題型。",`<form id="editor" class="dialog-body">
    <div class="editor-grid">${field("title","題組名稱",set.title,{required:true,limit:100})}${field("topic","主題",set.topic,{required:true,limit:50})}${field("date","安排日期",set.date,{required:true,type:"date"})}</div>
    ${field("description","簡介（選填）",set.description,{limit:400})}
    <section class="editor-section"><div class="editor-head"><h3>完形填空</h3>${button("加入空格","add-item","plus","",'data-kind="cloze"')}</div>
    ${set.cloze.length ? `<p class="hint">短文的 {{q1}} 等空格標記依題目順序排列，每個標記出現一次。</p>
      ${field("passage","英文短文",set.passage,{required:true,rows:4,limit:10000})}
      ${field("passageZh","短文繁中翻譯",set.passageZh,{required:true,rows:3,limit:10000})}
      ${set.cloze.map((item,index) => `<fieldset class="editor-item"><legend>第 ${index + 1} 格 <code>{{${item.id}}}</code></legend>
        <div class="actions">${button("插入空格標記","marker","","text-link",`data-id="${item.id}"`)}${button("移除此格","remove-item","","text-link danger",`data-kind="cloze" data-id="${item.id}"`)}</div>
        <div class="editor-grid">${field(`q.${item.id}.options`,"選項，每行一個，輸入題留空",item.options.join("\n"),{rows:3})}
        ${field(`q.${item.id}.accepted`,"其他可接受答案，輸入題選填",item.accepted.join("\n"),{rows:3})}</div>
        ${field(`q.${item.id}.answer`,"正解",item.answer,{required:true,limit:180})}
        ${field(`q.${item.id}.explanation`,"繁中解析",item.explanation,{required:true,limit:1200,rows:2})}</fieldset>`).join("")}` :
      '<p class="hint">按「加入空格」後填寫短文、答案與解析。</p>'}
    </section>
    <section class="editor-section"><div class="editor-head"><h3>字彙練習</h3>${button("加入單字","add-item","plus","",'data-kind="vocabulary"')}</div>
    ${set.vocabulary.length ? set.vocabulary.map((word,index) => `<fieldset class="editor-item"><legend>第 ${index + 1} 個單字</legend>
      <div class="actions">${button("移除此字","remove-item","","text-link danger",`data-kind="vocabulary" data-id="${word.id}"`)}</div>
      ${wordFields.map(([key,label,limit,rows]) => field(`v.${word.id}.${key}`,label,word[key],{required:!["pos","note"].includes(key),limit,rows})).join("")}</fieldset>`).join("") :
      '<p class="hint">工作台會自動把每個單字或片語顯示 3 次。</p>'}
    </section>
    ${error}<div class="form-actions">${reset ? button("使用網站版本","reset-set","","quiet",`data-id="${set.id}"`) : ""}${cancel}${submit("儲存題組")}</div>
  </form>`);
}
export function attemptDialog(entry) {
  return shell(h(entry.title),`${LABEL[entry.type]} · ${timeLabel(entry.completedAt)} 完成`,`<div class="dialog-body">
    ${entry.type === "cloze" ? `<h3>作答明細</h3>${resultList(entry.items,true)}<div class="translation"><h3>短文繁中翻譯</h3><p>${h(entry.passageZh)}</p></div>` :
      `<h3>已練習字彙</h3>${entry.items.map((word) => `<article class="card"><h3 lang="en">${h(word.word)}</h3><p>${h(word.meaning)} · 已唸 3 次</p>${wordExample(word)}</article>`).join("")}`}
    <form id="note" data-id="${entry.id}">${field("note","我的備註（選填）",entry.note,{rows:3,limit:1000})}${error}<div class="form-actions">${cancel}${submit("儲存備註")}</div></form>
  </div>`);
}
export function backupDialog() {
  return shell("還原學習備份","確認後會以備份內容取代目前的瀏覽器學習資料。",`<form id="restore" class="dialog-body">
    ${upload("backup-file","選擇學習備份 JSON")}
    <label class="field"><span>或貼上學習備份 JSON</span><textarea name="json" id="backup-json" class="code" rows="6" required spellcheck="false"></textarea></label>
    <p id="backup-preview" class="hint" role="status">檢查備份後會顯示內容摘要。</p>${error}
    <div class="form-actions">${button("先匯出目前進度","export-backup","download")}${submit("檢查備份","list")}${button("確認還原","restore","check","primary",'id="confirm-restore" hidden')}</div>
  </form>`);
}
