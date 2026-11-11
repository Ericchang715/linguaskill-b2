# 題庫與學習資料格式

檔案使用 UTF-8 JSON。題庫與備份都有 `schemaVersion: 1` 欄位。

## 題庫

`data/practice-sets.json`、每週匯入檔與匯出的完整題庫皆使用 `{"schemaVersion":1,"sets":[...]}`。可參考 [一份完整題組範例](./data/weekly-template.json)。

| 題組欄位 | 填寫方式 |
| --- | --- |
| `id` | 題組固定 ID，以英數字開頭，可加連字號或底線。新增題組時另取 ID。 |
| `date` | 安排日期，使用 `YYYY-MM-DD`。 |
| `title`、`topic`、`description` | 題名、篩選用主題、簡介。簡介可留空。 |
| `passage`、`passageZh` | 英文短文與填入正解後的繁中全文翻譯。短文依序使用 `{{q1}}`、`{{q2}}` 等空格標記，每格出現一次。 |
| `cloze`、`vocabulary` | 填空與字彙陣列，至少有一種題型。只有字彙時，填空陣列和短文欄位留空。 |

| 填空欄位 | 填寫方式 |
| --- | --- |
| `id` | 與短文標記對應，例如 `q1`。 |
| `options` | 選擇題填 2 到 6 個不同選項，將正解列入。輸入題填 `[]`。 |
| `answer`、`accepted` | 參考正解與選填的其他答案陣列。其他答案只用於輸入題。系統比對前會統一大小寫、相鄰空白與彎引號。 |
| `explanation` | 繁中解析，說明文法、搭配或上下文。 |

| 字彙欄位 | 填寫方式 |
| --- | --- |
| `id` | 題組內唯一，如 `v1`。 |
| `word`、`pos`、`meaning` | 單字或片語、詞性與繁中意思。詞性可留空。 |
| `example`、`exampleZh`、`note` | B2 英文例句、例句繁中翻譯與搭配用法。用法可留空。 |

## 學習備份

用工作台匯出的 JSON 當修改起點。外層 `kind` 使用 `linguaskill-b2-study-backup`，`schemaVersion` 使用 `1`，`exportedAt` 是匯出時間。

| `state` 的欄位 | 用途 |
| --- | --- |
| `sets` | 瀏覽器新增或修改的題組。欄位與題庫一致。 |
| `attempts` | 已完成的紀錄，含 `id`、`key`、`setId`、`title`、`topic`、`scheduledDate`、`type`、`completedAt`、`note`、`passage`、`passageZh` 和 `items`。 |
| `drafts` | 題型版本 `key`、重做狀態 `retry`、空格與答案對照 `answers`，以及單字與朗讀次數對照 `repeats`。 |
| `reviewWords` | 收藏單字快照，保留字彙欄位與 `key`、`setId`、`setTitle`、`topic`、`addedAt`、`reviewedAt`。待複習時 `reviewedAt` 為 `null`。 |

- 紀錄的 `type` 為 `cloze` 或 `vocabulary`。時間欄位使用以 `Z` 結尾並含毫秒的 ISO 格式，畫面會轉換成臺灣時間。
- 填空的 `items` 包含 `id`、`questionKey`、`number`、`prompt`、`given`、`correctAnswer`、`acceptedAnswers`、`explanation` 和 `correct`。還原時會以 `given` 和 `acceptedAnswers` 重新判分。請將參考正解也列入 `acceptedAnswers`。
- 字彙的 `items` 是練習當時的字彙快照，完成紀錄代表每個單字都已記錄 3 次。這類紀錄的短文欄位留空。
- 錯題清單由歷次填空結果產生。編輯個人紀錄時可更改備註、完成時間或作答明細。請保留原始 `id`、`setId`、`key` 與 `questionKey`，讓紀錄能對回原本的題組與版本。
