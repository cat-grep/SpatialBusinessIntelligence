# 待確認事項：推論、數字與敏感資訊

這份文件整理 `index.html` 裡**屬於推論、或需要再確認**的內容，供作者與事務所確認。引用的數字都對照 `data/story.js`（頁面所有數字的來源）。

- **第 1 節**：已修正的數字不一致（留作紀錄）
- **第 2 節**：推論型敘述。頁面文字已改成較保守的說法，但背後的判斷仍需要與事務所確認
- **第 3 節**：敏感資訊

---

## 1. 已修正的數字不一致

| # | 位置 | 原本 | 修正後 |
|---|---|---|---|
| 1.1 | Ch2 answer | Ontario 是 "the **only market** where valuable clients form a statistically significant cluster"，但同章寫 LA 有 14 個 hot spot | "The **largest** statistically significant cluster of valuable clients is around Ontario." |
| 1.2 | Ch6 Exhibit 6.2 | "The other **nine** originating attorneys…"，但 `story.js` 只看得到 6 位 | 依要求整段移除（見 3.3） |
| 1.3 | Ch5 population note | 寫所有圖表都用全部 1,874 位客戶，但 Exhibit 5.3 只能用有地址的客戶 | 註明 5.1、5.2、5.4 用全部客戶；5.3、5.5 只用有地址的客戶 |
| 1.4 | Ch6 表格 | High Value "Ever returned 27%"（原始值 27.5） | 28% |
| 1.5 | Ch4 Exhibit 4.2 旁文字 | "still lives **11–14 miles** … the same as in 2021"（2022 是 10.6） | "between **10.6 and 13.9 miles**"，並拿掉 "the same as in 2021" |

---

## 2. 推論型敘述（已改寫得較保守，仍待確認）

| # | 位置 | 目前的頁面文字 | 為什麼是推論 | 建議的確認方式 |
|---|---|---|---|---|
| 2.1 | Ch3 Exhibit 3.1 | "This suggests proximity to an office matters, although the data can't show why." | 只有距離帶的相關；30–45 mi（3.5）高於 20–30 mi（3.1），不是單調遞減 | 加上迴歸或信賴區間 |
| 2.2 | Ch2 takeaway | "Reach is the measure most directly shaped by marketing and intake" | 作者判斷 | 與事務所確認行銷能影響的範圍 |
| 2.3 | Ch3 "What the gap is worth" | "+260 clients, about $2.1M" / "+79 clients, about $0.37M" | 假設 LA、SD 能縮小一半差距、案件價值不變；頁面已註明 "not a forecast" | 與事務所確認產能與當地競爭 |
| 2.4 | Ch3 Exhibit 3.4 | "With only 4 Spanish-speaking clients in San Diego, their value there can't be measured directly." | San Diego 西語客戶的價值是從全所平均推論 | 事務所是否有 San Diego 西語案件的其他紀錄 |
| 2.5 | Ch4 Exhibit 4.3 | "this group may also include older clients who returned" / "recent clients look about as valuable as earlier ones" | 2021 以前沒有資料，無法直接驗證；前 12 個月收入相近不代表長期價值相同 | 確認 2021 年客戶中有多少是舊客戶 |
| 2.6 | Ch4 answer | "The typical distance between a new client and an office has changed little." | 依中位數判斷；2024 比 2021 多 2 英里 | 檢定各年距離分布差異 |
| 2.7 | Ch5 Exhibit 5.5 | "That is consistent with word of mouth, though it may also reflect where referral clients tend to live." | 0.80 vs 1.17 mi 的差異沒有做檢定，也可能是人口密度造成 | permutation test，或控制人口密度後再比較 |
| 2.8 | Ch5 answer | "The type of work shows the clearest differences." | 沒有檢定地點對客戶價值的影響 | 補一個檢定（LQ、chi-square 或迴歸） |
| 2.9 | Ch6 answer 與 Exhibit 6.1 | "a long silence is a weak sign of a lost client" / "referrals may be a stronger one" | 從 8.3% 回流率推論；沒有「哪位舊客戶介紹了誰」的資料 | 確認 intake 是否記錄介紹人 |
| 2.10 | Ch2 Exhibit 2.5 | "34 ZIP areas around Ontario pass at 99% confidence" | Gi* 沒有多重比較校正（已寫進 Method 的 Limits） | 用 FDR 校正後重算 |
| 2.11 | Ch2 San Diego | "The gap in San Diego appears to be the number of clients rather than their quality." | 45.8% 來自 96 位客戶，樣本小 | 加上信賴區間 |
| 2.12 | Hero 第 3 點、Action plan | "The clearest room to grow is close to the offices"、各項 Worth 與 Effort | 建立在 2.1、2.3 的推論上；Effort 為主觀評估 | 與事務所討論優先順序 |

---

## 3. 敏感資訊

| # | 項目 | 狀態 |
|---|---|---|
| 3.1 | 三個辦公室的精確座標 | 已從目前版本移除。**Git 歷史紀錄裡仍然有**，完全清除需要改寫歷史（force push），需所有協作者同意 |
| 3.2 | Chapter 2 的 QGIS 近照（`LucrativeCustomerTier_LA/ON/SD.png`，3300 px） | 待決定：以個別客戶點呈現，放大後可能接近實際住址。可考慮隨機偏移（jitter）、降低解析度或改用 ZIP 層級彙總 |
| 3.3 | 律師業績 | 已移除 Ch6 的 Exhibit 6.2 與相關文字、`story.js` 的 `attorneys` 資料、`build_story.py` 的輸出和圖表程式，並把 Action plan 第 6 項換成「Measure what works」 |
| 3.4 | `data/story.js` 的 scatter 資料 | 已處理：收入四捨五入到 $100，每小時收入四捨五入到 $1（`build_story.py` 重建時也會套用）。每小時收入沒有取到 $100，因為這樣會讓 27 位客戶變成 $0、從對數軸上消失，另有 44 位跑到 tier 分界線的另一側 |
| 3.5 | 事務所身分 | 待確認：頁面寫出「Southern California civil law firm」與三個據點城市，請與事務所確認可以公開到什麼程度 |
| 3.6 | 已刪除的舊檔案 | 已從目前版本移除；同 3.1，仍在 Git 歷史中 |
