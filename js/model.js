export const LABEL = { cloze: "完形填空", vocabulary: "字彙練習" };
export const STATUS = { new: "未開始", active: "進行中", done: "已完成" };
export const DAYS = ["日", "一", "二", "三", "四", "五", "六"];
export const VERSION = 1;
export const BACKUP = "linguaskill-b2-study-backup";

const dateFormat = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" });
const timeFormat = new Intl.DateTimeFormat("zh-TW", { timeZone: "Asia/Taipei", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const idPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/;
const gapPattern = /\{\{([\w-]+)\}\}/g;

export function today(date = new Date()) { return dateFormat.format(date); }
export function timeLabel(value) {
  const date = new Date(value);
  return `${today(date)} ${timeFormat.format(date)}`;
}
export function weekday(date) { return new Date(date + "T00:00:00Z").getUTCDay(); }
export function addDays(day, count) {
  const date = new Date(day + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
}
export function monday(day) { return addDays(day, -((weekday(day) + 6) % 7)); }
export function planMonday(day) { return addDays(monday(day), [0, 6].includes(weekday(day)) ? 7 : 0); }
export function shortDate(day) { return `${Number(day.slice(5, 7))}/${Number(day.slice(8))}`; }
export function validDay(day) {
  return typeof day === "string" && /^\d{4}-\d{2}-\d{2}$/.test(day)
    && Number.isFinite(Date.parse(day)) && new Date(day).toISOString().startsWith(day + "T");
}
export function uid(prefix) { return prefix + "-" + (globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + "-" + Math.random().toString(36).slice(2)); }
export function normalize(value) { return value.normalize("NFKC").trim().replace(/[‘’]/g, "'").replace(/\s+/g, " ").toLowerCase(); }
function check(condition, message) { if (!condition) throw new Error(message); }
function object(value, label) { check(value && typeof value === "object" && !Array.isArray(value), `${label}須為 JSON 物件。`); return value; }
function array(value, label) { check(Array.isArray(value), `${label}須為陣列。`); return value; }
function text(value, label, limit, optional = false) {
  if (value == null && optional) return "";
  check(typeof value === "string" && value.trim().length <= limit && (optional || value.trim()), `${label}請填入有效文字，最多 ${limit} 字。`);
  return value.trim();
}
function id(value, label) {
  check(typeof value === "string" && idPattern.test(value), `${label}請使用英數字，並可加上連字號或底線。`);
  return value;
}
function distinct(items, label) { check(new Set(items).size === items.length, `${label}有重複項目。`); }
function instant(value, label) {
  check(typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && validDay(value.slice(0, 10)) && Number.isFinite(Date.parse(value)), `${label}須使用備份中的 ISO 時間格式。`);
  return value;
}

function cleanWord(raw, label) {
  object(raw, label);
  return { id: id(raw.id, label), word: text(raw.word, label + "英文", 100), pos: text(raw.pos, label + "詞性", 40, true),
    meaning: text(raw.meaning, label + "字義", 200), example: text(raw.example, label + "例句", 500),
    exampleZh: text(raw.exampleZh, label + "例句翻譯", 500), note: text(raw.note, label + "用法", 500, true) };
}

function cleanQuestion(raw, label) {
  object(raw, label);
  const options = array(raw.options ?? [], label + "選項").map((value) => text(value, label + "選項", 180));
  const answer = text(raw.answer, label + "正解", 180);
  const accepted = array(raw.accepted ?? [], label + "其他答案").map((value) => text(value, label + "其他答案", 180));
  distinct(options.map(normalize), label + "選項");
  distinct([answer, ...accepted].map(normalize), label + "答案");
  check(!options.length || (options.length >= 2 && options.length <= 6 && options.some((option) => normalize(option) === normalize(answer)) && !accepted.length),
    `${label}請給 2 到 6 個選項，將正解列入選項，其他答案留空。`);
  return { id: id(raw.id, label), options, answer, accepted, explanation: text(raw.explanation, label + "繁中解析", 1200) };
}

export function cleanSet(raw, label = "題組") {
  object(raw, label);
  check(validDay(raw.date), `${label}日期須為有效的 YYYY-MM-DD。`);
  const cloze = array(raw.cloze ?? [], label + "完形填空").map((question, index) => cleanQuestion(question, `${label}第 ${index + 1} 格`));
  const vocabulary = array(raw.vocabulary ?? [], label + "字彙").map((word, index) => cleanWord(word, `${label}第 ${index + 1} 個單字`));
  check((cloze.length || vocabulary.length) && cloze.length <= 40 && vocabulary.length <= 40, `${label}至少包含一題，每種題型最多 40 項。`);
  distinct(cloze.map((item) => item.id), label + "空格 ID");
  distinct(vocabulary.map((item) => item.id), label + "單字 ID");
  const passage = text(raw.passage, label + "英文短文", 10000, !cloze.length);
  const passageZh = text(raw.passageZh, label + "全文翻譯", 10000, !cloze.length);
  const gaps = [...passage.matchAll(gapPattern)].map((match) => match[1]);
  check(gaps.length === cloze.length && gaps.every((value, i) => value === cloze[i].id) && !/[{}]{2}/.test(passage.replace(gapPattern, "")),
    `${label}的 {{空格標記}} 須按題目順序排列，每格出現一次。`);
  return { id: id(raw.id, label + " ID"), date: raw.date, title: text(raw.title, label + "名稱", 100), topic: text(raw.topic, label + "主題", 50),
    description: text(raw.description, label + "簡介", 400, true), passage, passageZh, cloze, vocabulary };
}

export function readBank(raw) {
  check(object(raw, "題庫").schemaVersion === VERSION, "題庫請使用 schemaVersion 1。");
  const sets = array(raw.sets, "題組清單").map((set, index) => cleanSet(set, `第 ${index + 1} 份題組`));
  distinct(sets.map((set) => set.id), "題組 ID");
  return sets;
}
export function combine(seed, local) {
  return [...new Map([...seed, ...local].map((set) => [set.id, set])).values()]
    .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title, "zh-TW"));
}
function signature(value) {
  let hash = 0x811c9dc5;
  for (const character of JSON.stringify(value)) hash = Math.imul(hash ^ character.codePointAt(0), 0x01000193);
  return (hash >>> 0).toString(36);
}
function answerSpec(question) { return [question.id, question.options, question.answer, question.accepted]; }
export function practiceKey(set, type) {
  const content = type === "cloze" ? [set.passage, set.cloze.map(answerSpec)] : set.vocabulary.map((word) => [word.id, word.word, word.meaning, word.example]);
  return `${set.id}/${type}/${signature(content)}`;
}
export function questionKey(set, question) { return `${set.id}/${question.id}/${signature([set.passage, answerSpec(question)])}`; }
export function wordKey(set, word) { return `${set.id}/${word.id}/${signature([word.word, word.meaning])}`; }
export function types(set) { return Object.keys(LABEL).filter((type) => set[type].length); }
export function newest(attempts) { return [...attempts].reverse().sort((a, b) => b.completedAt.localeCompare(a.completedAt)); }
export function attemptFor(state, key) { return newest(state.attempts.filter((item) => item.key === key))[0]; }
export function draftFor(state, key) { return state.drafts.find((item) => item.key === key); }
export function progress(state, set, type) {
  if (!type) {
    const parts = types(set).map((part) => progress(state, set, part));
    return parts.every((part) => part === "done") ? "done" : parts.some((part) => part !== "new") ? "active" : "new";
  }
  const key = practiceKey(set, type);
  const draft = draftFor(state, key);
  if (draft && (draft.retry || Object.values(draft.answers).some((answer) => answer.trim()) || Object.values(draft.repeats).some((count) => count > 0))) return "active";
  return attemptFor(state, key) ? "done" : "new";
}
export function firstType(state, set) { return types(set).find((part) => progress(state, set, part) !== "done") ?? types(set)[0]; }

export function grade(set, answers) {
  return set.cloze.map((question, index) => {
    const prompt = (set.passage.split(/(?<=[.!?])\s+/).find((part) => part.includes(`{{${question.id}}}`)) ?? set.passage)
      .replace(gapPattern, (_, gap) => gap === question.id ? `［${index + 1}］_____` : "_____");
    const given = answers[question.id].trim();
    const acceptedAnswers = [question.answer, ...question.accepted];
    return { id: question.id, questionKey: questionKey(set, question), number: index + 1, prompt, given,
      correctAnswer: question.answer, acceptedAnswers, explanation: question.explanation,
      correct: acceptedAnswers.some((answer) => normalize(answer) === normalize(given)) };
  });
}
export function wrongQuestions(attempts) {
  const result = new Map();
  for (const attempt of newest(attempts).reverse()) {
    if (attempt.type !== "cloze") continue;
    for (const item of attempt.items) {
      const previous = result.get(item.questionKey);
      if (item.correct) {
        if (previous) previous.correctedAt = attempt.completedAt;
      } else result.set(item.questionKey, { attempt, item, count: (previous?.count ?? 0) + 1, correctedAt: null });
    }
  }
  return [...result.values()].sort((a, b) => b.attempt.completedAt.localeCompare(a.attempt.completedAt));
}

export function emptyState() { return { sets: [], attempts: [], drafts: [], reviewWords: [] }; }
export function readState(raw) {
  object(raw, "學習資料");
  const sets = readBank({ schemaVersion: VERSION, sets: raw.sets });
  const attempts = array(raw.attempts, "練習歷程").map((entry) => {
    object(entry, "練習紀錄");
    check(Object.hasOwn(LABEL, entry.type) && validDay(entry.scheduledDate), "練習紀錄的題型或安排日期有誤。");
    const items = array(entry.items, "作答明細").map((item) => {
      if (entry.type === "vocabulary") return cleanWord(item, "字彙紀錄");
      object(item, "填空紀錄");
      const given = text(item.given, "你的答案", 180);
      const correctAnswer = text(item.correctAnswer, "參考正解", 180);
      const acceptedAnswers = array(item.acceptedAnswers ?? [correctAnswer], "可接受答案").map((value) => text(value, "可接受答案", 180));
      check(Number.isInteger(item.number) && item.number >= 1 && item.number <= 40 && acceptedAnswers.some((value) => normalize(value) === normalize(correctAnswer)), "填空紀錄的題號或正解有誤。");
      return { id: id(item.id, "作答 ID"), questionKey: text(item.questionKey, "題目索引", 220), number: item.number,
        prompt: text(item.prompt, "原題", 10400), given, correctAnswer, acceptedAnswers,
        explanation: text(item.explanation, "繁中解析", 1200), correct: acceptedAnswers.some((value) => normalize(value) === normalize(given)) };
    });
    check(items.length > 0 && items.length <= 40, "作答明細請保留 1 到 40 項。");
    distinct(items.map((item) => item.id), "作答明細 ID");
    return { id: id(entry.id, "練習紀錄 ID"), setId: id(entry.setId, "題組 ID"), key: text(entry.key, "題型索引", 220),
      title: text(entry.title, "題組名稱", 100), topic: text(entry.topic, "主題", 50), type: entry.type,
      scheduledDate: entry.scheduledDate, completedAt: instant(entry.completedAt, "完成時間"), note: text(entry.note, "備註", 1000, true),
      passage: text(entry.passage, "原始短文", 10000, entry.type !== "cloze"),
      passageZh: text(entry.passageZh, "短文翻譯", 10000, entry.type !== "cloze"), items };
  });
  const drafts = array(raw.drafts, "草稿").map((entry) => {
    object(entry, "草稿");
    const answers = Object.fromEntries(Object.entries(object(entry.answers, "草稿作答")).map(([key, answer]) => {
      check(typeof answer === "string" && answer.length <= 180, "草稿作答格式有誤。");
      return [id(key, "空格 ID"), answer];
    }));
    const repeats = Object.fromEntries(Object.entries(object(entry.repeats, "朗讀進度")).map(([key, count]) => {
      check(Number.isInteger(count) && count >= 0 && count <= 3, "朗讀次數須介於 0 到 3。");
      return [id(key, "單字 ID"), count];
    }));
    return { key: text(entry.key, "草稿索引", 220), retry: entry.retry === true, answers, repeats };
  });
  const reviewWords = array(raw.reviewWords, "單字清單").map((entry) => ({
    ...cleanWord(entry, "收藏單字"), key: text(entry.key, "收藏索引", 220), setId: id(entry.setId, "題組 ID"),
    setTitle: text(entry.setTitle, "題組名稱", 100), topic: text(entry.topic, "主題", 50), addedAt: instant(entry.addedAt, "收藏時間"),
    reviewedAt: entry.reviewedAt == null ? null : instant(entry.reviewedAt, "複習時間")
  }));
  distinct(attempts.map((entry) => entry.id), "練習紀錄 ID");
  distinct(drafts.map((entry) => entry.key), "草稿索引");
  distinct(reviewWords.map((entry) => entry.key), "單字索引");
  return { sets, attempts, drafts, reviewWords };
}
export function readBackup(raw) {
  check(object(raw, "學習備份").kind === BACKUP && raw.schemaVersion === VERSION, "請選擇工作台匯出的第 1 版學習備份。");
  return readState(raw.state);
}
