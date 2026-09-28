# 待確認事項：推論、數字與敏感資訊

這份文件整理 `index.html` 裡**屬於推論、或需要再確認**的內容，供作者在發布前逐項核對。頁面上的文字目前**沒有改動**；確認後再決定保留、改寫或刪除。

引用的數字都對照 `data/story.js`（頁面所有數字的來源）。

---

## 1. 數字不一致（優先處理）

| # | 位置 | 頁面文字 | 資料 | 需要確認 |
|---|---|---|---|---|
| 1.1 | Ch2 answer | "above all around Ontario, the **only market** where valuable clients form a statistically significant cluster" | `hotspots`：Los Angeles 有 7 個 99% + 7 個 95% hot spot；同一章的 Exhibit 2.5 和比較表也寫 LA 有 14 個 | 「only market」與同章內容矛盾。建議改成「the largest statistically significant cluster」之類的說法 |
| 1.2 | Ch6 Exhibit 6.2 旁文字 | "The other **nine** originating attorneys share the remaining 10%." | `build_story.py` 只輸出前 8 名（`orig.head(8)`），所以 `story.js` 裡只看得到 #2、#4 以外的 6 位；圖表也只畫出 6 位 | 用 4.7 節的 SQL 確認實際總共有幾位 originating attorney；讀者看圖只會數到 6 位，建議在圖下註明「top 8 shown」 |
| 1.3 | Ch5 population note vs. Exhibit 5.3 | "These charts use **all 2,066 matters and 1,874 clients**" | Exhibit 5.3（lucrative share by channel）用的是 `channel_quality`，只含有地址的客戶（Google 233、Referral 194），tooltip 也寫 "mapped clients" | tier 只算在 1,071 位有地址的客戶上，所以這張圖不可能用全部客戶。需在圖旁註明母體 |
| 1.4 | Ch6 表格 | High Value "Ever returned **27%**" | `tiers.High Value.repeat_rate = 27.5` | 四捨五入應為 28%；確認原始值是否為 27.4x |
| 1.5 | Ch4 Exhibit 4.2 旁文字 | "The typical new client still lives **11–14 miles** from an office" | `years.med_dist`：2021 11.8、2022 **10.6**、2023 11.2、2024 13.9、2025 12.9 | 範圍應為 10.6–13.9（約 11–14 可接受，但 2022 低於 11）；另外 2024 比 2021 多 2 英里，「the same as in 2021」需斟酌 |

---

## 2. 推論型敘述（資料只顯示相關，文字寫成原因或判斷）

| # | 位置 | 頁面文字 | 為什麼是推論 | 建議的確認方式 |
|---|---|---|---|---|
| 2.1 | Ch3 Exhibit 3.1 | "People hire a nearby lawyer, and the best cases come from close by." | 只有距離帶的相關；而且 30–45 mi（3.5）高於 20–30 mi（3.1），不是單調遞減 | 加上簡單的迴歸或信賴區間；或改寫成描述句 |
| 2.2 | Ch2 比較表下方 | "Reach is the one the firm can most directly change." | 作者判斷，沒有資料支持 | 保留時標明是建議 |
| 2.3 | Ch3 "What the gap is worth" | "+260 clients, about $2.1M" / "+79 clients, about $0.37M" | 假設 LA、SD 能達到 Ontario 的一半差距、案件價值不變；頁面已註明 "not a forecast" | 與事務所確認產能與當地競爭；或只保留數量級 |
| 2.4 | Ch3 Exhibit 3.4 | "so this is a gap in reach, not in value" | 每小時收入是全體西語客戶的平均；San Diego 只有 4 位西語客戶，無法推論當地價值；Spanish Google 的 lucrative rate 只有 33% | 改寫為「elsewhere, Spanish-speaking clients are as profitable」 |
| 2.5 | Ch4 answer 與 Exhibit 4.3 | "the data starts in 2021, so this group also includes older clients who returned" / "Recent clients aren't weaker. They are younger." | 2021 以前的資料不存在，無法直接驗證 left-censoring；前 12 個月收入相近不代表長期價值相同 | 向事務所確認 2021 年客戶中有多少是舊客戶 |
| 2.6 | Ch4 answer | "New clients aren't coming from farther away. They are coming from a different office's market." | 依中位數距離判斷；見 1.5，2024–2025 的距離其實較高 | 檢定各年距離分布差異 |
| 2.7 | Ch5 "Referrals spread from neighbor to neighbor" | "That is word of mouth you can see on a map" | 0.80 vs 1.17 mi 的差異沒有做檢定；也可能只是 referral 客戶住在人口較密集的地區 | permutation test，或控制人口密度後再比較 |
| 2.8 | Ch5 answer | "Mostly the kind of work, not where the client lives." | 沒有檢定地點對客戶價值的影響（例如 LQ、chi-square、迴歸） | 補一個檢定，或改成「we found no clear geographic pattern in…」 |
| 2.9 | Ch6 answer 與 Exhibit 6.1 | "most people only need a lawyer once" / "Chasing them for repeat work is unlikely to pay. What they can do is refer." | 從 8.3% 回流率推論；沒有「哪位舊客戶介紹了誰」的資料 | 確認 intake 是否記錄介紹人 |
| 2.10 | Ch6 Exhibit 6.2 旁文字 | "If either of them left, the firm would lose most of its pipeline, and possibly the referral network" | 推測；originating attorney 也可能只是案件分派規則，而不是實際開發客戶的人 | 向事務所確認 originating attorney 的定義 |
| 2.11 | Ch2 Exhibit 2.5 | "34 ZIP areas around Ontario pass at 99% confidence" | Gi* 對 640 個 ZCTA 各自檢定，沒有多重比較校正（例如 FDR） | 用 FDR 校正後重算，確認數量 |
| 2.12 | Ch2 Los Angeles step | "Most of them sit within about 10 miles south and west of the office" | 「south and west」是看地圖判斷，沒有計算方位 | 計算方位分布，或改寫成「within about 10 miles」 |
| 2.13 | Ch3 Exhibit 3.2 notes | "Orange County … is almost untouched" | 看地圖判斷 | 補上 Orange County 的 clients per 100,000 數字 |
| 2.14 | Hero 第 3 點、Action plan | "starting with Spanish-speaking neighborhoods near San Diego"、各項 "Worth" 與 "Effort" | 建議與排序建立在 2.3、2.4 的推論上；Effort 為主觀評估 | 發布前與事務所討論優先順序 |

---

## 3. 敏感資訊（需要作者決定）

| # | 項目 | 目前狀態 | 建議 |
|---|---|---|---|
| 3.1 | 三個辦公室的精確座標 | 已從 `index.html` 和 `PostGIS_Functions.md` 移除，改為引用 `office` 表 | **Git 歷史紀錄裡仍然有**。若 repo 是公開的，需要改寫歷史（force push）才能完全移除，這需要所有協作者同意 |
| 3.2 | Chapter 2 的 QGIS 近照（`LucrativeCustomerTier_LA/ON/SD.png`，3300 px） | 以個別客戶點呈現，放大後可能接近實際住址 | 考慮加入隨機偏移（jitter）、降低解析度，或改用 ZIP 層級彙總 |
| 3.3 | 事務所身分 | 頁面寫出「Southern California civil law firm」＋三個據點城市＋律師編號 | 與事務所確認可以公開到什麼程度；若事務所可被辨識，律師 #2、#4 的業績也就可被辨識 |
| 3.4 | `data/story.js` 的 scatter 資料 | 每位客戶的收入與每小時收入精確到分 | 無 ID，風險低；若要更保守可四捨五入到百元 |
| 3.5 | 已刪除的舊檔案（舊 QGIS 圖、GIF、`OUTLINE.md`、`STORYMAP_REVIEW.md`） | 已從目前版本移除 | 同 3.1，仍在 Git 歷史中 |
