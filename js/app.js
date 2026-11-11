import { BACKUP, VERSION, combine, cleanSet, draftFor, emptyState, grade, planMonday, practiceKey, readBackup, readBank, readState, today, types, uid, weekday, wordKey, wrongQuestions } from "./model.js";
import { attemptDialog, backupDialog, editorDialog, prompt, weekDialog } from "./dialogs.js";
import { empty, icon, practiceLink } from "./ui.js";
import * as view from "./views.js";

const page = document.querySelector("#page");
const dialog = document.querySelector("#dialog");
const nav = document.querySelector("#site-nav");
const menu = document.querySelector(".mobile-menu");
const warning = document.querySelector("#warning");
const toast = document.querySelector("#toast");
const storageLabel = document.querySelector("#storage-label");
const key = `linguaskill-b2:${new URL("../", import.meta.url).pathname}:v1`;
const bankURL = new URL("../data/practice-sets.json", import.meta.url);
const exampleURL = new URL("../data/weekly-template.json", import.meta.url);
const pages = { desk: view.desk, bank: view.bank, history: view.history, errors: view.errors, words: view.words, manage: view.manage, help: view.help };
const modes = { errors: "pending", words: "pending" };
const blankFilters = () => ({ period: "", from: "", to: "", topic: "", type: "", status: "" });

let state = emptyState();
let seed = [];
let filters = blankFilters();
let diskText = null;
let damaged = null;
let storageIssue = "";
let bankIssue = false;
let ready = false;
let toastTimer;
let origin;
let editor;
let checkedBackup;
let fileCounter = 0;

function readDisk() {
  let raw;
  try { raw = localStorage.getItem(key); }
  catch { storageIssue = "unavailable"; return; }
  if (raw === diskText && !storageIssue) return;
  try {
    state = raw ? readState(JSON.parse(raw)) : emptyState();
    diskText = raw;
    damaged = null;
    storageIssue = "";
  } catch {
    damaged = raw;
    storageIssue = "damaged";
  }
}
function updateWarning() {
  const messages = [];
  if (storageIssue === "damaged") messages.push('目前的變更暫存在頁面。瀏覽器中的舊資料無法讀取。<button class="btn text-link" type="button" data-action="export-raw">下載原始資料</button>');
  if (storageIssue === "unavailable") messages.push("目前無法寫入瀏覽器。進度暫存在頁面，關閉前可匯出學習備份。");
  if (bankIssue) messages.push("網站題庫載入失敗。仍可使用瀏覽器中已有的題組與學習紀錄。");
  warning.hidden = messages.length === 0;
  warning.innerHTML = messages.join("<br>");
  storageLabel.textContent = storageIssue ? "進度暫存在這個頁面" : "進度保存在此瀏覽器";
}

async function write(change, { immediate = false, restore = false } = {}) {
  const operation = () => {
    if (!storageIssue) readDisk();
    const next = structuredClone(state);
    change(next);
    state = next;
    if (storageIssue === "damaged" && !restore) return false;
    try {
      const serialized = JSON.stringify(next);
      localStorage.setItem(key, serialized);
      diskText = serialized;
      damaged = null;
      storageIssue = "";
      return true;
    } catch {
      storageIssue = damaged ? "damaged" : "unavailable";
      return false;
    }
  };
  const saved = !immediate && navigator.locks ? await navigator.locks.request(key, operation) : operation();
  updateWarning();
  return saved;
}
function getSets() { return combine(seed, state.sets); }
function getRoute(sets = getSets()) {
  const [part, id, type] = location.hash.slice(1).split("/");
  if (part === "practice") {
    const set = sets.find((set) => set.id === id);
    return { name: part, set, type: set && types(set).includes(type) ? type : null };
  }
  return { name: Object.hasOwn(pages, part) ? part : "desk" };
}
function render() {
  if (!ready) return;
  const sets = getSets();
  const wrong = wrongQuestions(state.attempts);
  const { name, set, type } = getRoute(sets);
  const active = name === "practice" ? "bank" : name;
  for (const link of nav.querySelectorAll("[data-route]")) {
    if (link.dataset.route === active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
  for (const [id, count] of [["wrong-count", wrong.filter((item) => !item.correctedAt).length], ["word-count", state.reviewWords.filter((word) => !word.reviewedAt).length]]) {
    const badge = document.getElementById(id);
    badge.textContent = count;
    badge.hidden = count === 0;
  }
  const context = { sets, state, filters, day: today(), wrong };
  page.innerHTML = name === "practice"
    ? set && type ? view.practice(context, set, type) : empty("book","找不到這份練習","可從題庫重新選題。",'<a class="btn" href="#bank">回到題庫</a>')
    : pages[name](context, modes[name]);
  updateWarning();
}
function visit() {
  nav.classList.remove("open");
  menu.setAttribute("aria-expanded", "false");
  render();
  (page.querySelector("h1") ?? document.querySelector("#main")).focus({ preventScroll: true });
  window.scrollTo(0, 0);
}
function go(hash) {
  if (location.hash === hash) visit();
  else location.hash = hash;
}
function notify(message, saved = true) {
  clearTimeout(toastTimer);
  toast.textContent = saved ? message : "變更暫存在頁面。關閉前可匯出學習備份。";
  toast.hidden = false;
  toastTimer = setTimeout(() => { toast.hidden = true; }, 4200);
}
function showError(message, id = "dialog-error") {
  const target = document.getElementById(id);
  if (!target) return;
  target.textContent = message;
  target.hidden = !message;
  if (message && id === "dialog-error") target.scrollIntoView({ block: "nearest" });
}
function openDialog(content) {
  if (!dialog.open) origin = document.activeElement;
  dialog.innerHTML = content;
  if (!dialog.open) dialog.showModal();
  dialog.scrollTop = 0;
  (dialog.querySelector("textarea, input:not([type=file])") ?? dialog.querySelector("button"))?.focus({ preventScroll: true });
}
function openEditor(set) {
  const day = today();
  editor = { isEdit: Boolean(set), set: set ? structuredClone(set) : {
    id: uid("set"), date: [0, 6].includes(weekday(day)) ? planMonday(day) : day,
    title: "", topic: "", description: "", passage: "", passageZh: "", cloze: [], vocabulary: []
  } };
  refreshEditor();
}
function refreshEditor() {
  const id = editor.set.id;
  openDialog(editorDialog(editor.set, editor.isEdit, seed.some((set) => set.id === id) && state.sets.some((set) => set.id === id)));
}
function collectEditor() {
  const data = new FormData(dialog.querySelector("#editor"));
  const get = (name) => String(data.get(name) ?? "");
  const lines = (name) => get(name).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const set = editor.set;
  for (const name of ["title","topic","date","description","passage","passageZh"]) set[name] = get(name);
  for (const question of set.cloze) {
    for (const name of ["options","accepted"]) question[name] = lines(`q.${question.id}.${name}`);
    for (const name of ["answer","explanation"]) question[name] = get(`q.${question.id}.${name}`);
  }
  for (const word of set.vocabulary) {
    for (const name of ["word","pos","meaning","example","exampleZh","note"]) word[name] = get(`v.${word.id}.${name}`);
  }
}
function editItem(action, kind, id) {
  collectEditor();
  const set = editor.set;
  const scroll = dialog.scrollTop;
  if (action === "remove-item") {
    set[kind] = set[kind].filter((item) => item.id !== id);
    if (kind === "cloze") set.passage = set.cloze.length ? set.passage.replaceAll(`{{${id}}}`, "") : "";
  } else {
    if (set[kind].length >= 40) throw new Error("每種題型最多 40 項。");
    const prefix = kind === "cloze" ? "q" : "v";
    const used = new Set([...set[kind].map((item) => item.id), ...state.attempts.filter((entry) => entry.setId === set.id && entry.type === kind).flatMap((entry) => entry.items.map((item) => item.id))]);
    let index = set[kind].length + 1;
    while (used.has(prefix + index)) index += 1;
    id = prefix + index;
    set[kind].push(kind === "cloze" ? { id, options: [], accepted: [], answer: "", explanation: "" } : { id, word: "", pos: "", meaning: "", example: "", exampleZh: "", note: "" });
  }
  refreshEditor();
  dialog.scrollTop = scroll;
  const field = action === "remove-item" ? `[data-action="add-item"][data-kind="${kind}"]`
    : kind === "cloze" ? `[name="q.${id}.answer"]` : `[name="v.${id}.word"]`;
  dialog.querySelector(field)?.focus();
}
function parse(text) {
  const fenced = text.trim().match(/^```(?:json)?\s*\n([\s\S]+)\n```$/i);
  try { return JSON.parse(fenced ? fenced[1] : text); }
  catch { throw new Error("JSON 格式有誤。請檢查引號、逗號和括號。"); }
}
function download(filename, data, raw = false) {
  const content = raw ? data : JSON.stringify(data, null, 2) + "\n";
  const link = document.createElement("a");
  const url = URL.createObjectURL(new Blob([content], { type: "application/json;charset=utf-8" }));
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
function needDraft(next, key) {
  let draft = draftFor(next, key);
  if (!draft) {
    draft = { key, retry: false, answers: {}, repeats: {} };
    next.drafts.push(draft);
  }
  return draft;
}
async function saveAttempt(set, type, items) {
  const key = practiceKey(set, type);
  const attempt = { key, id: uid("attempt"), setId: set.id, title: set.title, topic: set.topic,
    type, scheduledDate: set.date, completedAt: new Date().toISOString(), note: "", items,
    passage: type === "cloze" ? set.passage : "", passageZh: type === "cloze" ? set.passageZh : "" };
  const saved = await write((next) => {
    next.attempts.push(attempt);
    next.drafts = next.drafts.filter((draft) => draft.key !== key);
  });
  if (location.hash === practiceLink(set, type)) {
    render();
    document.querySelector("#practice-result")?.focus();
  }
  notify("這次練習已加入練習歷程。", saved);
}
async function retry(set, type) {
  await write((next) => { needDraft(next, practiceKey(set, type)).retry = true; });
  go(practiceLink(set, type));
}
function filterFocus(id) { render(); document.getElementById(id)?.focus({ preventScroll: true }); }
function clearBackupPreview() {
  checkedBackup = null;
  document.querySelector("#confirm-restore").hidden = true;
  document.querySelector("#backup-preview").textContent = "檢查備份後會顯示內容摘要。";
}
async function fileInput(input) {
  const serial = ++fileCounter;
  const file = input.files[0];
  if (!file) return;
  try {
    if (file.size > 8 * 1024 * 1024) throw new Error("檔案超過 8 MB，請分批整理題庫或縮小學習備份。");
    const text = await file.text();
    if (serial !== fileCounter || !dialog.open || !input.isConnected) return;
    document.getElementById(input.id === "week-file" ? "weekly-json" : "backup-json").value = text;
    if (input.id === "backup-file") clearBackupPreview();
    showError("");
  } catch (error) {
    if (serial === fileCounter && dialog.open && input.isConnected) showError(error.message);
  }
}

async function click(button) {
  const { action, id, value, date, kind } = button.dataset;
  switch (action) {
    case "menu": menu.setAttribute("aria-expanded", String(nav.classList.toggle("open"))); return;
    case "filter-day":
      filters = { ...blankFilters(), period: "custom", from: date, to: date };
      go("#bank"); return;
    case "reset-filters": filters = blankFilters(); filterFocus("filter-period"); return;
    case "errors-mode":
    case "words-mode":
      modes[action.split("-")[0]] = value;
      render();
      page.querySelector(`[data-action="${action}"][data-value="${value}"]`)?.focus({ preventScroll: true });
      return;
    case "week": openDialog(weekDialog()); return;
    case "close": dialog.close(); return;
    case "new-set": openEditor(); return;
    case "edit-set": {
      const set = getSets().find((set) => set.id === id);
      if (set) openEditor(set);
      return;
    }
    case "add-item":
    case "remove-item": editItem(action, kind, id); return;
    case "marker": {
      const input = dialog.querySelector('[name="passage"]');
      const token = `{{${id}}}`;
      const start = input.value.indexOf(token);
      if (start >= 0) input.setSelectionRange(start, start + token.length);
      else input.setRangeText(token, input.selectionStart, input.selectionEnd, "end");
      input.focus();
      return;
    }
    case "reset-set":
      if (window.confirm("將此題組切換為網站題庫版本，練習紀錄會保留。確定要切換嗎？")) {
        const saved = await write((next) => { next.sets = next.sets.filter((set) => set.id !== id); });
        dialog.close(); render(); notify("已使用網站版本。", saved);
      }
      return;
    case "example": {
      const response = await fetch(exampleURL);
      if (!response.ok) throw new Error("無法載入範例。請改用下載範本。");
      const content = await response.json();
      const input = document.querySelector("#weekly-json");
      if (input && button.isConnected) {
        input.value = JSON.stringify(content, null, 2);
        input.focus();
      }
      return;
    }
    case "copy-prompt":
      try { await navigator.clipboard.writeText(prompt); notify("已複製每週練習整理指令。"); }
      catch {
        const fallback = document.querySelector("#prompt-fallback");
        if (fallback) { fallback.hidden = false; fallback.querySelector("textarea").select(); }
      }
      return;
    case "attempt": {
      const entry = state.attempts.find((item) => item.id === id);
      if (entry) openDialog(attemptDialog(entry));
      return;
    }
    case "backup": checkedBackup = null; openDialog(backupDialog()); return;
    case "restore": {
      if (!checkedBackup || document.querySelector("#backup-json").value !== checkedBackup.source) throw new Error("請先檢查要還原的備份。");
      const restored = checkedBackup.data;
      button.disabled = true;
      try {
        const saved = await write((next) => { Object.assign(next, restored); }, { restore: true });
        dialog.close(); render(); notify("已還原學習備份。", saved);
      } finally { button.disabled = false; }
      return;
    }
    case "export-bank": download("practice-sets.json", { schemaVersion: VERSION, sets: getSets() }); return;
    case "export-backup":
      download(`linguaskill-b2-backup-${today()}.json`, { schemaVersion: VERSION, kind: BACKUP, exportedAt: new Date().toISOString(), state });
      return;
    case "export-raw": if (damaged) download("linguaskill-b2-original.json", damaged, true); return;
    case "review-word": {
      const saved = await write((next) => {
        const word = next.reviewWords.find((item) => item.key === button.dataset.key);
        if (word) word.reviewedAt = value === "done" ? word.reviewedAt ?? new Date().toISOString() : null;
      });
      render();
      page.querySelector('[data-action="words-mode"][aria-pressed="true"]')?.focus({ preventScroll: true });
      notify("已更新單字複習狀態。", saved);
      return;
    }
    case "retry-error": {
      const set = getSets().find((item) => item.id === id);
      if (set?.cloze.length) await retry(set, "cloze");
      return;
    }
  }
  const { set, type } = getRoute();
  if (!set || !type) return;
  if (action === "retry") { await retry(set, type); return; }
  if (type !== "vocabulary") return;
  const revision = practiceKey(set, type);
  if (action === "finish-vocab") {
    const draft = draftFor(state, revision);
    if (!set.vocabulary.every((word) => draft?.repeats[word.id] === 3)) return;
    button.disabled = true;
    try { await saveAttempt(set, type, set.vocabulary); }
    finally { button.disabled = false; }
    return;
  }
  const word = set.vocabulary.find((item) => item.id === id);
  if (!word) return;
  button.disabled = true;
  try {
    if (action === "repeat-word") {
      const step = Number(button.dataset.step);
      await write((next) => {
        const repeats = needDraft(next, revision).repeats;
        const count = Object.hasOwn(repeats, id) ? repeats[id] : 0;
        if (step === count + 1) repeats[id] = step;
      }, { immediate: true });
      if (location.hash === practiceLink(set, type)) {
        render();
        (page.querySelector(`[data-action="repeat-word"][data-id="${id}"]:enabled`) ?? page.querySelector('[data-action="repeat-word"]:enabled, [data-action="finish-vocab"]:enabled'))?.focus({ preventScroll: true });
      }
    }
    if (action === "save-word") {
      const add = button.getAttribute("aria-pressed") !== "true";
      const saved = await write((next) => {
        const key = wordKey(set, word);
        const index = next.reviewWords.findIndex((entry) => entry.key === key);
        if (add) {
          const record = { ...word, key, setId: set.id, setTitle: set.title, topic: set.topic, addedAt: new Date().toISOString(), reviewedAt: null };
          if (index < 0) next.reviewWords.push(record);
          else if (next.reviewWords[index].reviewedAt) next.reviewWords[index] = record;
        } else if (index >= 0 && !next.reviewWords[index].reviewedAt) next.reviewWords.splice(index, 1);
      });
      if (location.hash === practiceLink(set, type)) {
        render(); page.querySelector(`[data-action="save-word"][data-id="${id}"]`)?.focus({ preventScroll: true });
      }
      notify(add ? "已加入待複習單字。" : "已移除這個待複習單字。", saved);
    }
  } finally { button.disabled = false; }
}

const submitActions = {
  async weekly(form) {
    const incoming = readBank(parse(form.elements.json.value));
    if (!incoming.length) throw new Error("請加入至少一份題組。");
    let count = 0;
    const saved = await write((next) => {
      const existing = new Map(combine(seed, next.sets).map((set) => [set.id, set]));
      const conflict = incoming.find((set) => existing.has(set.id) && JSON.stringify(existing.get(set.id)) !== JSON.stringify(set));
      if (conflict) throw new Error(`題組 ID ${conflict.id} 已存在且內容不同。請在題庫管理編輯，或更換新題組 ID。`);
      const additions = incoming.filter((set) => !existing.has(set.id));
      next.sets.push(...additions);
      count = additions.length;
    });
    dialog.close(); filters = blankFilters(); go("#bank");
    notify(count ? `已匯入 ${count} 份練習。` : "相同題組已存在，本次略過重複項目。", saved);
  },
  async editor() {
    collectEditor();
    const set = cleanSet(editor.set);
    const saved = await write((next) => {
      const index = next.sets.findIndex((item) => item.id === set.id);
      if (index < 0) next.sets.push(set);
      else next.sets[index] = set;
    });
    dialog.close(); go("#manage"); notify("已儲存題組。", saved);
  },
  async note(form) {
    const note = String(new FormData(form).get("note") ?? "").trim();
    const saved = await write((next) => {
      const entry = next.attempts.find((entry) => entry.id === form.dataset.id);
      if (!entry) throw new Error("這筆紀錄已變更，請重新開啟練習歷程。");
      entry.note = note;
    });
    dialog.close(); render(); notify("已儲存練習備註。", saved);
  },
  restore(form) {
    clearBackupPreview();
    const source = form.elements.json.value;
    const data = readBackup(parse(source));
    checkedBackup = { source, data };
    document.querySelector("#backup-preview").textContent = `備份含 ${data.sets.length} 份自訂題組、${data.attempts.length} 筆練習紀錄與 ${data.reviewWords.length} 個收藏單字。`;
    const confirm = document.querySelector("#confirm-restore");
    confirm.hidden = false;
    confirm.focus();
  },
  async cloze(form) {
    const { set, type } = getRoute();
    if (!set || type !== "cloze") return;
    const data = new FormData(form);
    const answers = Object.fromEntries(set.cloze.map((question) => [question.id, String(data.get(question.id) ?? "")]));
    const missing = set.cloze.findIndex((question) => !answers[question.id].trim());
    if (missing >= 0) throw new Error(`請填寫第 ${missing + 1} 格。`);
    await saveAttempt(set, type, grade(set, answers));
  }
};

document.addEventListener("click", async (event) => {
  if (event.target.closest(".skip")) { event.preventDefault(); document.querySelector("#main").focus(); return; }
  const button = event.target.closest("button[data-action]");
  if (!button || button.disabled) return;
  try { await click(button); }
  catch (error) { if (dialog.open) showError(error.message); else notify("操作無法完成，請再試一次。"); }
});
document.addEventListener("change", ({ target }) => {
  if (target.dataset.filter) { filters[target.dataset.filter] = target.value; filterFocus(target.id); }
  if (["week-file","backup-file"].includes(target.id)) void fileInput(target);
});
document.addEventListener("input", ({ target }) => {
  if (target.id === "backup-json") clearBackupPreview();
  if (!target.matches("#cloze input") || (target.type === "radio" && !target.checked)) return;
  const { set, type } = getRoute();
  if (!set || type !== "cloze") return;
  const revision = practiceKey(set, type);
  const { name, value } = target;
  void write((next) => { needDraft(next, revision).answers[name] = value; }, { immediate: true }).catch(() => notify("草稿無法儲存。"));
});
document.addEventListener("submit", async (event) => {
  const form = event.target;
  const submit = Object.hasOwn(submitActions, form.id) ? submitActions[form.id] : null;
  if (!submit) return;
  event.preventDefault();
  if (form.dataset.saving) return;
  const button = form.querySelector('button[type="submit"]');
  form.dataset.saving = "true";
  button.disabled = true;
  const error = form.id === "cloze" ? "form-error" : "dialog-error";
  showError("", error);
  try { await submit(form); }
  catch (failure) { showError(failure.message, error); }
  finally { delete form.dataset.saving; button.disabled = false; }
});
dialog.addEventListener("close", () => {
  fileCounter += 1;
  checkedBackup = null;
  if (origin?.isConnected) origin.focus({ preventScroll: true });
});
window.addEventListener("hashchange", visit);
window.addEventListener("storage", (event) => {
  if ((event.key === key || event.key === null) && !storageIssue) {
    readDisk();
    if (!document.activeElement?.matches("#cloze input")) render();
  }
});
document.querySelectorAll("[data-icon]").forEach((span) => { span.innerHTML = icon(span.dataset.icon); });
readDisk();
try {
  const response = await fetch(bankURL, { cache: "no-cache" });
  if (!response.ok) throw new Error("無法讀取題庫。");
  seed = readBank(await response.json());
} catch { bankIssue = true; }
ready = true;
render();
