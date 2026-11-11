import { LABEL, STATUS, DAYS, addDays, attemptFor, draftFor, firstType, monday, newest, planMonday, practiceKey, progress, questionKey, shortDate, timeLabel, types, weekday, wordKey } from "./model.js";
import { button, empty, h, heading, icon, panelHead, practiceLink } from "./ui.js";

export const addWeek = button("新增每週練習", "week", "plus", "primary");
const toBank = '<a href="#bank" class="btn">前往題庫</a>';
const tags = (set, type) => `<div class="tags">${(type ? [type] : types(set)).map(tag).join("")}</div>`;
function tag(type) { return `<span class="tag tag-${type}">${icon(type === "cloze" ? "edit" : "list", 13)}${LABEL[type]}</span>`; }
function badge(status) { return `<span class="badge status-${status}"><i></i>${STATUS[status]}</span>`; }
function chip(text) { return `<span class="chip" role="status">${text}</span>`; }
function entry(title, subtitle, name = "book") {
  return `<div class="entry"><span class="tile">${icon(name, 17)}</span><div><strong>${h(title)}</strong><small>${h(subtitle)}</small></div></div>`;
}
function select(key, label, options, value) {
  return `<label class="field"><span>${label}</span><select id="filter-${key}" data-filter="${key}">${options.map(([option, text]) =>
    `<option value="${h(option)}"${option === value ? " selected" : ""}>${h(text)}</option>`).join("")}</select></label>`;
}
function table(titles, rows) {
  return `<table class="table"><thead><tr>${titles.map((name) => `<th scope="col">${name || '<span class="sr">操作</span>'}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>`;
}
function row(title, date, type, status, action) {
  return `<tr><td class="td-title">${title}</td><td class="td-date">${date}</td><td class="td-type">${type}</td><td class="td-status">${status}</td><td class="td-action">${action}</td></tr>`;
}
function dateTime(date) { return `<time datetime="${date}">${date}</time>`; }

function bankTable({ sets, state, filters, day }, title) {
  const start = monday(day);
  let [from, to] = ["", ""];
  if (filters.period === "week") [from, to] = [start, addDays(start, 6)];
  if (filters.period === "last") [from, to] = [addDays(start, -7), addDays(start, -1)];
  if (filters.period === "month") [from, to] = [day.slice(0, 7) + "-01", day.slice(0, 7) + "-31"];
  if (filters.period === "custom") [from, to] = [filters.from, filters.to];
  const invalid = from && to && from > to;
  const rows = invalid ? [] : sets.filter((set) => (!from || from <= set.date) && (!to || set.date <= to)
    && (!filters.topic || filters.topic === set.topic) && (!filters.type || set[filters.type].length)
    && (!filters.status || filters.status === progress(state, set, filters.type)));
  const topics = [...new Set(sets.map((set) => set.topic))].sort((a, b) => a.localeCompare(b, "zh-TW"));
  const clear = button("清除篩選", "reset-filters", "filter", "quiet reset");
  return `<section class="panel bank">
    ${panelHead(title, "依條件找題，或直接從題組開始。", chip(rows.length + " 份題組"))}
    <div class="filters">
      ${select("period", "日期", [["","全部日期"],["week","本週"],["last","上週"],["month","本月"],["custom","指定日期"]], filters.period)}
      ${select("topic", "主題", [["","全部主題"], ...topics.map((topic) => [topic, topic])], filters.topic)}
      ${select("type", "題型", [["","全部題型"], ...Object.entries(LABEL)], filters.type)}
      ${select("status", "完成狀態", [["","全部狀態"], ...Object.entries(STATUS)], filters.status)}
      ${clear}
      ${filters.period === "custom" ? `<div class="ranges">
        <label class="field"><span>起始日</span><input id="filter-from" type="date" data-filter="from" value="${h(filters.from)}"></label>
        <label class="field"><span>結束日</span><input id="filter-to" type="date" data-filter="to" value="${h(filters.to)}"></label>
        ${invalid ? '<p class="error" role="alert">起始日須早於或等於結束日。</p>' : ""}</div>` : ""}
    </div>
    ${rows.length ? table(["題組","安排日期","題型","完成狀態",""], rows.map((set) => {
      const status = progress(state, set, filters.type);
      const label = { new: "開始", active: "繼續", done: "回顧" }[status];
      return row(entry(set.title, set.topic), dateTime(set.date), tags(set, filters.type), badge(status),
        `<a class="text-link" href="${practiceLink(set, filters.type || firstType(state, set))}" aria-label="${label}${h(set.title)}">${label}${icon("arrow", 16)}</a>`);
    })) : empty("filter","沒有符合條件的練習","清除篩選可查看所有題組。", clear)}
  </section>`;
}

function planner({ sets, state, day }) {
  const start = planMonday(day);
  const end = addDays(start, 4);
  const inWeek = sets.filter((set) => set.date >= start && set.date <= end);
  const complete = inWeek.filter((set) => progress(state, set) === "done").length;
  return `<section class="panel planner">
    <div class="planner-title"><span class="tile">${icon("calendar", 20)}</span><div><h2>每週練習安排</h2><p>週一至週五 10:00 · 臺灣時間</p></div></div>
    <div class="days">${Array.from({ length: 5 }, (_, index) => {
      const date = addDays(start, index);
      const planned = inWeek.filter((set) => set.date === date);
      const done = planned.length && planned.every((set) => progress(state, set) === "done");
      return `<button type="button" class="day ${date === day ? "day-today" : ""} ${planned.length ? "day-planned" : ""}" data-action="filter-day" data-date="${date}" aria-label="${date} 週${DAYS[index + 1]}，${planned.length} 份題組${done ? "已完成" : ""}"${date === day ? ' aria-current="date"' : ""}>
        <span>${DAYS[index + 1]}</span><strong>${shortDate(date)}</strong><i aria-hidden="true">${done ? icon("check", 12) : ""}</i></button>`;
    }).join("")}</div>
    <div class="planner-foot"><span>${shortDate(start)} 至 ${shortDate(end)}</span><strong>${complete} / ${inWeek.length} 份完成</strong></div>
  </section>`;
}

function hero({ sets, state, day }) {
  const remaining = sets.filter((set) => progress(state, set) !== "done");
  const set = remaining.find((set) => set.date >= day) ?? remaining.at(-1) ?? sets.at(-1);
  if (!set) return `<section class="hero"><div><p class="hero-label">練習起點</p><h2>新增第一份練習</h2><p>匯入題組後即可開始。</p><div class="actions">${addWeek}</div></div></section>`;
  const status = progress(state, set);
  const label = status === "done" ? "練習回顧" : set.date === day ? "今日練習" : set.date > day ? "下一份練習" : "接續練習";
  const cta = { new: "開始練習", active: "繼續練習", done: "回顧練習" }[status];
  return `<section class="hero">
    <img src="./assets/notebook.svg" width="430" height="300" alt="">
    <div><p class="hero-label">${icon("edit", 16)}${label} · <time datetime="${set.date}">${shortDate(set.date)} 週${DAYS[weekday(set.date)]}</time></p>
    <h2>${h(set.title)}</h2><p class="hero-description">${h(set.description || set.topic)}</p>
    <div class="actions"><a class="btn cream" href="${practiceLink(set, firstType(state, set))}">${cta}${icon("arrow")}</a><span>${types(set).map((part) => LABEL[part]).join(" ＋ ")}</span></div></div>
  </section>`;
}

export function desk(context) {
  const { day, sets, state, wrong } = context;
  const summaries = [
    ["circleCheck", "已完成題組", sets.filter((set) => progress(state, set) === "done").length, "份", "查看練習歷程", "history"],
    ["flag", "待訂正錯題", wrong.filter((item) => !item.correctedAt).length, "題", "回到作答解析", "errors"],
    ["bookmark", "待複習單字", state.reviewWords.filter((word) => !word.reviewedAt).length, "個", "回想例句與用法", "words"]
  ];
  return `${heading("CEFR B2 · STUDY DESK", "英語練習工作台", "安排平日練習，回看作答解析，把容易忘的字留到下次複習。",
    `<span class="date-chip">${icon("calendar", 16)}<time datetime="${day}">${shortDate(day)} 週${DAYS[weekday(day)]}</time></span>` + addWeek)}
    <div class="hero-row">${hero(context)}${planner(context)}</div>
    <div class="stats">${summaries.map(([name, label, count, unit, note, route]) => `<a class="panel stat stat-${route}" href="#${route}"><span class="tile">${icon(name, 20)}</span><div><span>${label}</span><p><strong>${count}</strong> ${unit}</p><small>${note}</small></div><span class="stat-arrow">${icon("arrow", 16)}</span></a>`).join("")}</div>
    ${bankTable(context, "練習題庫")}`;
}
export function bank(context) { return heading("PRACTICE LIBRARY","練習題庫","選擇日期、主題、題型和進度，找到這次要練的內容。", addWeek) + bankTable(context, "題組清單"); }

export function resultList(items, prompt = false) {
  return `<ol class="results">${items.map((item) => `<li class="${item.correct ? "correct" : "incorrect"}"><div class="result-label"><span class="number">${item.number}</span><strong>${item.correct ? "答對" : "答錯"}</strong></div>
    ${prompt ? `<p class="review-prompt" lang="en">${h(item.prompt)}</p>` : ""}
    <p class="answers">你的答案 <b lang="en">${h(item.given)}</b><span>參考正解 <b lang="en">${h(item.correctAnswer)}</b></span></p><p>${h(item.explanation)}</p></li>`).join("")}</ol>`;
}
function passage(set, solved) {
  const byId = new Map(set.cloze.map((question, index) => [question.id, { index, question }]));
  return set.passage.split(/(\{\{[\w-]+\}\})/g).map((part) => {
    if (!part.startsWith("{{")) return h(part);
    const { index, question } = byId.get(part.slice(2, -2));
    return solved ? `<strong class="filled-gap">${h(question.answer)}</strong>` : `<span class="gap" aria-label="第 ${index + 1} 格">${index + 1}</span>`;
  }).join("");
}
function cloze(set, draft, attempt) {
  const results = attempt?.items.map((item) => ({ ...item, explanation: set.cloze.find((question) => question.id === item.id)?.explanation ?? item.explanation })) ?? [];
  return `<div class="practice-grid">
    <section class="panel reading"><div class="planner-title"><span class="tile">${icon("book", 20)}</span><div><p class="kicker">READING PASSAGE</p><h2>閱讀短文</h2></div></div>
      <p class="passage" lang="en">${passage(set, Boolean(attempt))}</p>
      ${attempt ? `<div class="translation"><h3>短文繁中翻譯</h3><p>${h(set.passageZh)}</p></div>` : '<p class="hint ruled">送出答案後可查看全文翻譯。</p>'}
    </section>
    ${attempt ? `<section class="panel reading" id="practice-result" tabindex="-1"><p class="kicker">ANSWER KEY</p><h2>答案與解析</h2><p class="hint">答對 <strong>${results.filter((item) => item.correct).length} / ${results.length}</strong> 題</p>
      ${resultList(results)}<div class="form-actions">${button("再做一次","retry","repeat")}</div></section>` :
    `<form class="panel reading" id="cloze"><h2>填入最合適的答案</h2><p class="hint">共有 ${set.cloze.length} 格。輸入題依上下文作答。</p>
      ${set.cloze.map((question, index) => {
        const chosen = Object.hasOwn(draft?.answers ?? {}, question.id) ? draft.answers[question.id] : "";
        return `<fieldset class="question"><legend><span class="number" aria-hidden="true">${index + 1}</span>第 ${index + 1} 格</legend>
          ${question.options.length ? `<div class="options">${question.options.map((option, choice) => `<label class="option"><input name="${question.id}" type="radio" value="${h(option)}"${chosen === option ? " checked" : ""} required><span>${String.fromCharCode(65 + choice)}</span><span lang="en">${h(option)}</span></label>`).join("")}</div>` :
          `<input type="text" name="${question.id}" value="${h(chosen)}" aria-label="第 ${index + 1} 格英文答案" placeholder="輸入英文答案" autocomplete="off" autocapitalize="none" spellcheck="false" lang="en" maxlength="180" required>`}</fieldset>`;
      }).join("")}<p class="error" id="form-error" role="alert" hidden></p>
      <div class="form-actions"><button type="submit" class="btn primary">送出答案${icon("arrow", 17)}</button></div></form>`}
  </div>`;
}
export function wordExample(word) {
  return `<div class="word-example"><p class="kicker">CEFR B2 例句</p><p lang="en">${h(word.example)}</p><p>${h(word.exampleZh)}</p>${word.note ? `<small>${h(word.note)}</small>` : ""}</div>`;
}
function wordHead(word, control, source = "") {
  return `<div class="word-head"><div>${source}<h3 lang="en">${h(word.word)}</h3><p>${word.pos ? `<span class="pos">${h(word.pos)}</span>` : ""}${h(word.meaning)}</p></div>${control}</div>`;
}
function vocab(set, draft, attempt, state) {
  const total = set.vocabulary.length;
  const complete = set.vocabulary.filter((word) => attempt || draft?.repeats[word.id] === 3).length;
  return `<section class="panel cards">
    ${panelHead("每個單字唸 3 次","唸完一次就點一下，想再看的字可以加入複習清單。", chip(`${complete} / ${total} 個`))}
    ${attempt ? '<p class="success" id="practice-result" tabindex="-1">這份字彙練習已完成，紀錄已加入練習歷程。</p>' : ""}
    <div class="card-list">${set.vocabulary.map((word) => {
      const count = attempt ? 3 : Object.hasOwn(draft?.repeats ?? {}, word.id) ? draft.repeats[word.id] : 0;
      const saved = state.reviewWords.some((entry) => entry.key === wordKey(set, word) && !entry.reviewedAt);
      return `<article class="card">${wordHead(word, button(saved ? "已加入待複習" : "加入待複習", "save-word", "bookmark", "word-save", `data-id="${word.id}" aria-pressed="${saved}"`))}
        <div class="repeats" role="group" aria-label="${h(word.word)} 朗讀進度">${[1,2,3].map((step) => `<button type="button" data-action="repeat-word" data-id="${word.id}" data-step="${step}" aria-label="${h(word.word)}，第 ${step} 次${step <= count ? "已完成" : ""}" class="${step <= count ? "repeated" : ""}" ${step !== count + 1 ? "disabled" : ""}><small>${step <= count ? icon("check", 14) : "0" + step}</small><span lang="en">${h(word.word)}</span></button>`).join("")}</div>${wordExample(word)}</article>`;
    }).join("")}</div>
    <div class="form-actions">${attempt ? button("再練一次","retry","repeat") :
      button("完成字彙練習","finish-vocab","check","primary",complete < total ? "disabled" : "")}</div>
  </section>`;
}
export function practice({ state }, set, type) {
  const key = practiceKey(set, type);
  const draft = draftFor(state, key);
  const attempt = draft?.retry ? null : attemptFor(state, key);
  return `<a href="#bank" class="text-link back">${icon("back", 17)}回到題庫</a>
    ${heading(`${dateTime(set.date)} · ${h(set.topic)} · CEFR B2`, h(set.title), h(set.description || "選擇本次要練習的題型。"))}
    <nav class="tabs" aria-label="題型切換">${types(set).map((part) => `<a href="${practiceLink(set, part)}"${part === type ? ' aria-current="page"' : ""}>${tag(part)}${progress(state, set, part) === "done" ? icon("check", 15) : ""}</a>`).join("")}</nav>
    ${type === "cloze" ? cloze(set, draft, attempt) : vocab(set, draft, attempt, state)}`;
}

export function history({ state }) {
  const records = newest(state.attempts);
  return heading("STUDY HISTORY","練習歷程","查看每次完成的作答、解析與自己的備註。") + `<section class="panel bank">
    ${panelHead("完成紀錄","完成時間以臺灣時間顯示。",chip(records.length + " 筆"))}
    ${records.length ? table(["題組","完成時間","題型","作答結果",""], records.map((record) => row(
      entry(record.title, "安排於 " + record.scheduledDate + (record.note ? " · 有備註" : ""), "history"),
      `<time datetime="${record.completedAt}">${timeLabel(record.completedAt)}</time>`, tag(record.type),
      record.type === "cloze" ? `答對 ${record.items.filter((item) => item.correct).length} / ${record.items.length} 題` : `練習 ${record.items.length} 個單字`,
      button("查看","attempt","arrow","text-link",`data-id="${record.id}" aria-label="查看${h(record.title)}的紀錄"`))))
      : empty("history","還沒有完成紀錄","送出填空答案或完成一份字彙練習後，紀錄會顯示在這裡。",toBank)}
  </section>`;
}
function segments(action, mode, pending, done) {
  return `<div class="segments" role="group" aria-label="複習狀態">${[["pending",pending],["done",done],["all","全部"]].map(([value, label]) =>
    button(label, action, "", "quiet", `data-value="${value}" aria-pressed="${mode === value}"`)).join("")}</div>`;
}
function includesMode(mode, finished) { return mode === "all" || (mode === "done" ? finished : !finished); }
export function errors({ wrong, sets }, mode) {
  const entries = wrong.filter((record) => includesMode(mode, record.correctedAt));
  return heading("ERROR REVIEW","錯題複習","重做相同題目並答對後，錯題會移到已訂正。") + `<section class="panel cards">
    ${panelHead("錯題清單","按最近答錯的時間排列。",segments("errors-mode",mode,"待訂正","已訂正"))}
    ${entries.length ? `<div class="card-list">${entries.map(({ attempt, item, count, correctedAt }) => {
      const set = sets.find((set) => set.id === attempt.setId);
      const active = set?.cloze.some((question) => questionKey(set, question) === item.questionKey);
      return `<article class="card"><div class="review-meta"><span>${h(attempt.title)} · 第 ${item.number} 格</span>${chip(correctedAt ? "已訂正" : active ? "待訂正" : "舊版題目")}</div>
        <p class="review-prompt" lang="en">${h(item.prompt)}</p><p class="hint">答錯 ${count} 次 · ${timeLabel(attempt.completedAt)}</p>
        <details><summary>展開答案與解析</summary>${resultList([item])}</details>
        <div class="actions">${active ? button("重做題組","retry-error","repeat","",`data-id="${set.id}"`) : ""}${button("原始紀錄","attempt","arrow","text-link",`data-id="${attempt.id}"`)}</div></article>`;
    }).join("")}</div>` : empty("flag",mode === "done" ? "還沒有已訂正的錯題" : "目前沒有錯題","填空答錯時會留下作答與解析。",toBank)}
  </section>`;
}
export function words({ state }, mode) {
  const entries = state.reviewWords.filter((word) => includesMode(mode, word.reviewedAt)).sort((a, b) => b.addedAt.localeCompare(a.addedAt));
  return heading("WORD REVIEW","待複習單字","回想字義，再用例句確認用法。") + `<section class="panel cards">
    ${panelHead("單字清單",`共 ${entries.length} 個單字或片語`,segments("words-mode",mode,"待複習","已複習"))}
    ${entries.length ? `<div class="card-list">${entries.map((word) => `<article class="card">${wordHead(word,
      button(word.reviewedAt ? "移回待複習" : "標記已複習","review-word",word.reviewedAt ? "repeat" : "check","",`data-key="${h(word.key)}" data-value="${word.reviewedAt ? "pending" : "done"}"`),
      `<p class="review-meta">${h(word.setTitle)} · ${h(word.topic)}</p>`)}${wordExample(word)}</article>`).join("")}</div>` :
      empty("bookmark",mode === "done" ? "還沒有已複習的單字" : "目前沒有收藏單字","在字彙練習選「加入待複習」，即可在這裡找回單字與例句。",toBank)}
  </section>`;
}
export function manage({ sets, state }) {
  const local = new Set(state.sets.map((set) => set.id));
  return heading("QUESTION BANK","題庫管理","在瀏覽器新增題組，或修改題目、答案與安排日期。",button("新增單份","new-set","plus") + addWeek) +
    `<section class="panel bank">${panelHead("編輯題組","要更新部署版，可匯出完整題庫並替換 data/practice-sets.json。",button("匯出題庫","export-bank","download"))}
    ${sets.length ? table(["題組","安排日期","題型","資料來源",""],sets.map((set) => row(
      entry(set.title,set.topic,"folder"),dateTime(set.date),tags(set),local.has(set.id) ? "瀏覽器版本" : "網站題庫",
      button("編輯","edit-set","edit","text-link",`data-id="${set.id}" aria-label="編輯${h(set.title)}"`)))) :
      empty("folder","還沒有題組","新增一份練習，或一次匯入整週題目。",addWeek)}</section>`;
}
export function help() {
  return heading("GUIDE & BACKUP","使用說明與備份","進度保存在目前使用的瀏覽器。換裝置或網址時，可用備份移轉。") + `<div class="guide-grid">
    <section class="panel guide"><span class="tile">${icon("book")}</span><h2>開始練習</h2><p>在題庫選題。填空送出後顯示答案、全文翻譯及逐題解析。字彙每唸一次點一下，所有單字練完再按完成。</p><a href="#bank" class="text-link">開啟練習題庫${icon("arrow",16)}</a></section>
    <section class="panel guide"><span class="tile">${icon("folder")}</span><h2>更新每週題目</h2><p>可用表單編輯單份，或把每週題庫 JSON 貼到批次匯入視窗。視窗內附範本與整理指令。</p><a href="#manage" class="text-link">開啟題庫管理${icon("arrow",16)}</a></section>
    <section class="panel guide"><span class="tile">${icon("download")}</span><h2>備份學習紀錄</h2><p>備份包含自訂題組、練習歷程、草稿與收藏單字。還原時可先檢查備份摘要，再確認取代目前資料。</p><div class="actions">${button("匯出學習備份","export-backup","download","primary")}${button("還原學習備份","backup","upload")}</div></section>
    <section class="panel guide"><span class="tile">${icon("list")}</span><h2>部署與資料格式</h2><p>部署包可直接發佈至 GitHub Pages。題庫和備份欄位可在資料格式說明查閱。</p><div class="actions"><a class="text-link" href="./README.md" target="_blank" rel="noopener">部署與操作手冊</a><a class="text-link" href="./DATA-FORMAT.md" target="_blank" rel="noopener">資料格式說明</a></div></section>
    </div><p class="hint ruled">本站示範題為自編練習。<a href="https://www.cambridgeenglish.org/tw/exams-and-tests/linguaskill/information-about-the-exam/exam-formats-and-task-types/" target="_blank" rel="noopener">劍橋英語官方題型說明</a></p>`;
}
