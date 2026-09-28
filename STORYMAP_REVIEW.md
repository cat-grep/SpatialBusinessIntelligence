# StoryMap Review：讓讀者不需簡報也能自行看懂

> 目標：讀者從上往下捲動就能看懂整份 StoryMap，不需要有人口頭帶。重點放在 **Business Analysis + Geospatial Analysis**。
> 審閱範圍：`index.html`（共 26 個 scroll step）、`js/main.js`、`OUTLINE.md`、`data/` 裡的地圖圖檔。

---

## 0. 總評（TL;DR）

| 面向 | 現況 | 主要問題 |
|---|---|---|
| 敘事結構 | 5 個問題 → 4 個章節 → Findings | 問題跟章節沒有一對一對應；Ch4 有 20 個 step，篇幅最長、空間分析最少 |
| 標題 | 多半是「主題」型（*Total Revenue by Practice Area*） | 讀者得自己讀完內文才知道重點是什麼；標題應該直接寫出結論 |
| 地圖可讀性 | 靜態 PNG，有標出事務所據點 | **大部分地圖沒有圖例**（顏色靠內文 `<strong style=color>` 說明、圓圈大小沒有說明）、沒有比例尺、沒有標註重點 |
| 空間分析深度 | 多半是用肉眼判讀「有群聚／沒群聚」 | 缺少統計檢定（hot spot、LQ）、缺少人口分母（penetration）、缺少與據點的距離分析 |
| 商業分析 | 指標很多（rev/hr、lucrative %） | 缺少「所以要做什麼、在哪裡做、值多少錢」；建議埋在 Findings 卡片裡 |
| 數字一致性 | — | 多處加總對不起來（見 §4），讀者一旦發現就會開始懷疑整份分析 |

**最有效的三項改動：**
1. 開頭加一段 **BLUF（Bottom Line Up Front）**：用 3 個數字 + 3 個建議，讓讀者先知道結論。
2. **每個 step 的標題改成結論句**，每張地圖加上 legend 和「How to read this map」。
3. **大幅精簡 Ch4**，把篇幅挪去做真正回答「去哪裡成長」的空間分析（penetration、hot spot、distance-to-office）。

---

## 1. 敘事結構（Storytelling Flow）

### 1.1 問題與章節對不上
Intro 的 5 個問題跟章節的對應很鬆散：

| Intro 問題 | 目前在哪裡回答 | 問題 |
|---|---|---|
| Q1 高價值客戶是誰、住在哪 | Ch1 | ✅ |
| Q2 哪些 ZIP 有成長潛力 | Ch2 | 只有一張 bivariate map，沒有列出具體 ZCTA，也沒有潛力的定義 |
| Q3 地理怎麼隨時間改變 | Ch3 前半 | 跟 churn、cohort 混在同一章 |
| Q4 哪些 practice/billing/channel 最賺 | Ch4 | ✅ 但篇幅過長 |
| Q5 誰沉寂了 + 哪位律師帶最多案 | churn 在 Ch3、attorney 在 Ch4 最後 | **一個問題被拆到兩章** |

**建議**：讓問題數 = 章節數，每章開頭顯示「❓ Question 2 of 5」，結尾放一個 **Answer box**（1–2 句話回答該章問題）。讀者就算只看 answer box，也能拼出完整故事。

### 1.2 建議的新結構

```
Hero
└─ BLUF：3 個關鍵數字 + 3 個行動建議（讀者 30 秒內就知道重點）

Ch1  How do we measure a "good" client?        （tier 定義 + scatter，合併成 1–2 steps）
Ch2  Where do the best clients live today?     （區域總覽 → 三個市場的 KPI 比較 → hot spot）
Ch3  Where should the firm grow next?          （penetration + bivariate + Top-10 目標 ZCTA 清單 + San Diego）
Ch4  How has the footprint changed?            （small multiples + 與據點距離的趨勢 + cohort）
Ch5  What makes a client valuable?             （精簡後的營運分析，只保留有空間訊號的地圖）
Ch6  What revenue is at risk?                  （dormant clients + 律師集中度風險）
Action Plan                                   （依優先序排列的建議：做什麼 / 在哪裡 / 預期價值）
Limitations → Methodology → SQL Appendix
```

### 1.3 標題改成結論句（Headline = Takeaway）
讀者掃標題就能拿到重點，不需要有人講解。範例：

| 現在 | 建議 |
|---|---|
| Defining Value: The Client Tier System | Only 8% of clients are "Stars" — but they bring in ~1/3 of revenue |
| Los Angeles: The Core Market | LA's best clients cluster within ~X miles south of the office |
| Mapping the Territory: Volume × Quality | 12 ZIP areas have high-value clients but little market share — start here |
| Total Revenue by Practice Area | Civil Litigation earns the most — but not the most per hour |
| Who Has Gone Silent? | 7 in 10 lucrative clients haven't returned in 2+ years |
| Client Acquisition Channel: Where Clients Come From | Referrals spread outward from past clients; Google fills the gaps |

### 1.4 把 SQL 從主要動線移開
每個 step 都有 `View SQL`，對商業讀者是干擾，而且會讓 step 變很長，sticky panel 切換時容易錯位。
- 在主要動線只保留一個小的 `🔍 Method` 連結；
- SQL 集中放到頁尾的 **Technical Appendix**（按章節編號），或維持 modal 但把按鈕縮小、放在右上角。

### 1.5 開頭補上 context
讀者目前不知道：資料涵蓋的**時間範圍**（2021–2026？）、**事務所規模**（幾位律師、幾個據點）、**營收總額**。Intro 加一排 KPI tiles：`1,071 clients · $7.1M net revenue · 3 offices · 2021–2026`。

### 1.6 移除或降級的內容
| 內容 | 理由 | 建議 |
|---|---|---|
| Continental US map（`tier-us`） | 故事的重點是南加州；全美地圖的點太小，看不出任何訊息 | 改成**南加州區域總覽**，標出三個據點和各自的服務範圍 |
| Corporate vs. Individual map | 只有 8 個 corporate 客戶，地圖沒有訊息量；「cluster near commercial corridors」用 8 個點撐不起來 | 刪除地圖，圖表縮成一句話 |
| Scope of Representation map | 內文也承認大部分是 Unspecified | 刪除地圖，保留「data gap」的論點 |
| Practice Area map / Retainer map | 結論都是「沒有空間 pattern」，但只靠肉眼判讀 | 合併成一個 step：「Case type is not geographic」，用 LQ 或 chi-square 支撐（見 §5.4） |
| Scatter 下方被註解掉的 note（248 位無工時客戶） | 這是重要的方法說明 | 恢復顯示；讀者需要知道 scatter 上看不到哪些人 |

精簡後，Ch4 預計從 20 steps 減到約 8 steps。

---

## 2. 地圖可讀性（Self-guided Map Reading）

實際看過 `LucrativeCustomerTier_LA.png`、`InactiveLucrativeClient.png`、`PracticeArea.png`、`VolumeAndQuality.png` 後的問題：

1. **沒有圖例**：顏色只靠內文彩色文字解釋，讀者一邊看圖一邊回頭找顏色，而且地圖放大（lightbox）之後完全沒有圖例。**圓圈大小代表什麼（net revenue？）完全沒有說明。**
   → 在每張地圖右下角加上 legend（QGIS layout 加，或用 HTML overlay 放在 `#viz-panel` 上）；圓圈大小加一組 3 個參考圓（$5K / $20K / $50K）。
2. **沒有比例尺**：南加州的尺度對外地讀者（例如 Madison 的老師、同學）不直觀；「Pomona–Ontario corridor」在哪裡、有多遠也不清楚。→ 加 scale bar（miles）。
3. **地圖上沒有標註**：內文說「South LA」「Pomona–Ontario corridor」「hidden gems」，但地圖上沒有圈出來。→ 在地圖上直接用虛線框 + 文字標出內文提到的區域。這一項對「不用人講解」影響最大。
4. **點重疊（overplotting）**：LA 和 Ontario 的點大量重疊，顏色混在一起。→ 考慮 hexbin／ZCTA aggregation，或至少依大小排序（大圓在下）。
5. **Bivariate map 的面積偏誤**：大塊沙漠 ZCTA（例如 Victorville 東側、Riverside County 東部）面積大、顏色重，視覺上變成最顯眼的區塊，但實際上可能只有 1–2 位客戶。→ 見 §3.2 的 small-number 問題；可以把客戶數 < 3 的 ZCTA 設為灰色或加斜線。
6. **GIF 無法控制**：讀者無法暫停或回看特定年份，也難以比較兩個年份。→ 改成 **small multiples**（5 個年份並排），或 HTML slider + 年份 PNG。All vs. Lucrative 可以上下兩排對照。
7. 每張地圖加一行 **「How to read this map」**（例如：*Each circle is one client. Color = tier, size = net revenue. ◆ = office.*），放在 caption 上方。
8. 顏色一致性：tier 色（Star 深藍 / High Value 紅 / Efficient 淺藍 / Standard 灰）要在所有地圖、圖表和卡片中保持一致；目前 bivariate 的藍紫色跟 tier 色系容易混淆。

---

## 3. 分析方法上需要修正或補充說明的地方

### 3.1 Tier 分類
- `NTILE(4)` 把**沒有工時的客戶**（NULL rev/hr）也排進去，因為 `NULLS LAST` 會落到最後一個 quartile → Standard 裡混了「沒資料」和「真的表現差」兩種人。建議明確說明，或把沒有資料的客戶另外歸成 `Insufficient data` 類。
- 卡片上的 `avg $555/hr` 是**客戶 rev/hr 的平均值**（mean of ratios），而 Ch4 的 rev/hr 是 `SUM(rev)/SUM(hours)`（ratio of sums）。兩種算法混用，讀者會發現 Star 的 $555 跟全所 ~$192 差很多卻不知道原因。→ 統一算法，或在註解中說明。
- 建議在 Ch1 加上 **revenue share by tier**（例如 Star 8% 的客戶貢獻 ~33% 營收），這是最有商業衝擊力的一個數字，目前沒有呈現。

### 3.2 Volume × Quality（Ch2）
- **Small-number problem**：只有 1 位客戶、而且剛好是 lucrative 的 ZCTA，quality = 100%，會被排進最高 tercile → 所謂的 hidden gem 很可能只是雜訊。
  → 設定最低門檻（例如 ≥ 3 clients），或改用 **Empirical Bayes smoothing**（往全體平均 42% 收縮）。
- **Volume 沒有人口分母**：客戶數多，可能只是那個 ZCTA 人口多。「untapped growth potential」一定要有 **population denominator**（見 §5.1）。
- 目前沒有列出 hidden gem **是哪些 ZCTA**。讀者沒辦法照著行動 → 在地圖旁加 Top-10 表格（ZCTA、城市、clients、lucrative %、距最近據點距離）。

### 3.3 Temporal / Cohort
- **Left-censoring**：資料從 2021 年開始，所以「2021 cohort」其實包含了 2021 年以前就已經是客戶的舊客戶 → 2021 表現最好，很可能是資料截斷造成的假象，不是那一年做對了什麼。需要在內文中說明。
- 建議比較 cohort 時用**固定觀察期**（例如「前 12 個月的 revenue」），這樣 2021 和 2024 才能公平比較。
- 「outward from downtown cores to suburban corridors」目前只靠 GIF 肉眼判斷 → 用 **mean center / standard deviational ellipse 逐年變化**，或「新案件與最近據點的中位數距離逐年趨勢」來量化（見 §5.3）。

### 3.4 Churn（Ch3 §3.3）
- 313 / 450 = **70% 的 lucrative 客戶**都被標成 at-risk，Star 則是 63/86 = 73%。對民事律師事務所來說，多數客戶本來就是**一次性需求**，這比較像是正常的業務型態，而不是流失。
  → 建議改成：
  - 先算 **repeat-client rate**（有 ≥2 個 matter 的客戶比例）作為 baseline；
  - 把故事從「re-engage dormant clients」改成「**turn past clients into referral sources**」，這跟 Ch4 的 Referral 是最大管道的結論剛好可以串起來，敘事會更有說服力。
- `$4.73M in revenue from their last active matters`：SQL 用的是 `ct.net_revenue`（**lifetime** revenue），不是最後一個 matter 的 revenue → 文字需要修正。
- `CURRENT_DATE` 讓結果每天都會變動 → 改成固定的 snapshot date（例如資料匯出日），並寫在 Methodology 裡。

### 3.5 其他
- Seasonal SQL 的 `IN (...)` 清單**漏掉 `'Negotiations'`**，但內文和圖表都在討論 Negotiations → SQL 和圖表的資料不一致。
- Channel 正規化用 `ILIKE '%client%'`，可能誤抓到像 "Google client" 這類字串 → 建議列出原始值 → 分組的對照表放在 Appendix。
- 空間 join 用 `ST_Within`：點剛好落在 ZCTA 邊界上時會被漏掉 → 可考慮 `ST_Intersects`，或說明漏掉的點數。

---

## 4. 數字一致性（需要逐一核對）

讀者自己看、沒有人可以即時回答問題時，數字對不上會直接損害可信度。

| 位置 | 數字 | 問題 |
|---|---|---|
| Tier 卡片 | 86×$27K + 182×$20K + 182×$2K + 621×$1.2K ≈ **$7.1M** | 作為基準 |
| Corporate vs. Individual | $7.09M + $59.4K ≈ **$7.15M** | ✅ 接近 |
| Practice Area | 5.02 + 1.24 + 0.71 + 0.62 + 0.22 + 0.17 + 0.16 ≈ **$8.1M** | ❌ 比總額多約 $1M |
| Scope of Representation | 4.93 + 2.73 + 0.82 + 0.68 + 0.32 + 0.06 + … ≥ **$9.5M** | ❌ 比總額多約 $2.4M，可能有重複計算 |
| Client Language | 327 Spanish clients = "**19%** of the client base" | ❌ 327 / 1,071 = **30.5%**；如果分母不同，需要寫出來 |
| Corporate vs. Individual | 1,060 + 8 = **1,068** | 跟 1,071 差 3，要說明 |
| Channel / Retainer 的 client count | Hourly-No Bonus 988 + Flat Fee 707 > 1,071 | 一位客戶有多個 matter 時會重複計算 → 要註明「clients may appear in multiple categories」 |
| Cohort vs. Temporal | Temporal 寫 2021–2025，Cohort 有 2026* | 統一時間範圍 |

建議加一個 **"Numbers at a glance" 對照表**（放在 Appendix），所有章節的總額都對回同一個基準。

---

## 5. 值得進一步做的分析（依優先序）

### ⭐ 5.1 Market Penetration（最高優先）
**問題**：「哪裡還有成長空間？」目前沒有人口分母，所以答不出來。
- 資料：ACS 5-year ZCTA 人口（B01003）、家戶數，也可以加上 median income（B19013）、homeownership（B25003）。
- 指標：`clients per 10,000 residents`、`lucrative clients per 10,000 residents`。
- 呈現：choropleth + **penetration gap**（跟同樣距離圈內的平均 penetration 比較）。
- 商業產出：「這 10 個 ZCTA 人口多、離據點近，但 penetration 低於平均 → 優先投放廣告」。
- 這會讓 Ch2 的 bivariate map 有更扎實的基礎（Volume 可以直接換成 penetration rate）。

### ⭐ 5.2 Hot Spot Analysis（取代肉眼判讀「cluster」）
- 對 ZCTA 層級的 lucrative rate（或 revenue per resident）做 **Getis-Ord Gi\*** 或 **Local Moran's I (LISA)**。
- 工具：PySAL (`esda`)、GeoDa，或 QGIS 的 Hotspot Analysis plugin。
- 產出：統計顯著的 hot / cold spot 地圖 → 內文的「South LA」「Pomona–Ontario corridor」就有了依據。
- 加分：Global Moran's I 可以用一個數字回答「lucrative 客戶到底有沒有空間群聚」。

### ⭐ 5.3 Distance to Office / Service Area（最有地理味的商業問題）
- PostGIS：`ST_Distance(client.geom::geography, office.geom::geography)` → 每位客戶到最近據點的距離。
- 分析：
  - **Distance-decay curve**：客戶數和 revenue 隨距離如何遞減？
  - lucrative 客戶是否比 Standard 客戶住得更遠（代表願意為好律師移動）？
  - **Office catchment**：Voronoi（`ST_VoronoiPolygons`）或 drive-time isochrone（OpenRouteService）→ 每個據點的 KPI 表（clients、revenue、lucrative %、rev/hr、penetration）。
- 這會讓 Ch1 的三個市場比較從「看起來」變成「有數字」（例如「Ontario is the highest-volume market」目前完全沒有數據支撐）。
- 延伸：逐年的中位數距離 → 量化「footprint 往外擴張」。

### 5.4 Spanish-language Opportunity Gap
- ACS `C16001`（Language spoken at home）→ 每個 ZCTA 的 Spanish-speaking population。
- 比較：firm 的 Spanish-speaking clients 比例 vs. 當地 Spanish-speaking 人口比例 → **gap map**。
- 商業產出：Spanish Google 廣告和雙語 outreach 應該投放在哪些 ZCTA。這會把 §4.5 從「描述現況」升級成「可以執行的建議」。
- 也可以回答 Spanish Google 的 lucrative rate 為什麼只有 33%：是投放區域不對，還是案件類型不同？

### 5.5 Location Quotient（LQ）
- 對 practice area、channel、language 算 ZCTA 層級的 LQ（該類在當地的比例 ÷ 全體比例）。
- 用一個數字取代「no strong spatial clustering」這種肉眼判斷；LQ > 1.5 的地方才是真正的專區。
- 特別適合 **Referral vs. Google 的空間分工**：referral 是否集中在舊客戶附近（口碑擴散），Google 是否補足沒有既有客戶的地區？

### 5.6 Referral Spatial Diffusion
- 對每位 referral 客戶，計算他跟**更早期**客戶的最近距離（`ST_DWithin` + 時間條件），再跟 Google 客戶的同一指標比較。
- 如果 referral 客戶明顯更接近舊客戶 → 有「口碑的空間擴散」證據 → 支撐「把舊客戶變成推薦來源」的策略（接 §3.4 的 churn reframing）。

### 5.7 San Diego 深入分析
- 目前的結論（「underdeveloped」）只是推測。可以比較三個市場在**相同距離圈內**的 penetration、lucrative rate、channel mix。
- 如果 San Diego 的 penetration 低、但 lucrative rate 不差 → 支持加碼投資；如果兩者都低 → 可能是結構性原因（競爭、據點位置）。
- 可以加入簡單的 **site suitability**：San Diego County 內哪些 ZCTA 人口多、收入中上、離現有據點遠 → 衛星辦公室或 outreach 的候選地點。

### 5.8 Priority Re-engagement / Outreach List
- 把 dormant Star/High Value 客戶依 `value × recency × proximity to office` 打分數。
- 產出：地圖 + Top-N 表格（匿名化），這是讀者最直觀的「下一步」。

### 5.9 Revenue Sizing（讓建議有金額）
每個建議都附上粗估的 upside，例如：
- hidden gem ZCTA 若 penetration 提升到區域平均 → 預估新增 X 位客戶 × 平均 lucrative revenue = $Y；
- dormant 客戶 5% 回流 / 產生推薦 → $Z。
即使只是粗估，也會讓 Action Plan 的說服力大很多（假設要寫清楚）。

---

## 6. Findings → Action Plan 的改寫方向

目前 Findings 卡片把「發現」和「建議」混在一起，而且沒有指回證據。建議拆成兩層：

**Key Findings**（每張卡片）
- 一句結論 + 一個關鍵數字；
- `→ See Chapter 2` 連結，點了跳回對應的 step（讀者可以自己驗證，不需要有人解釋）。

**Action Plan**（表格）

| Priority | Action | Where | Evidence | Est. impact | Effort |
|---|---|---|---|---|---|
| 1 | 投放 Spanish Google ads | Top-10 Spanish gap ZCTAs | §5.4 | $… | Low |
| 2 | Past-client referral program | LA core + Pomona–Ontario | §3.4, §5.6 | $… | Low |
| 3 | San Diego targeted outreach | Chula Vista / National City | §5.1, §5.7 | $… | Med |
| 4 | 補齊 scope / retainer 欄位 | Intake form | Ch5 | 改善決策品質 | Low |
| 5 | 分散 business development | Attorneys ≠ #2, #4 | Ch6 | 降低風險 | Med |

另外加一個 **Limitations** 段落：資料時間範圍與 left-censoring、ZCTA ≠ 實際 ZIP、單一事務所的資料無法推論到其他事務所、rev/hr 沒有考慮律師成本差異、geocoding 精度。這些寫出來反而會提升可信度。

---

## 7. 互動與 UX 小修

- **Progress indicator**：sticky nav 顯示「Chapter 3 of 6」或側邊進度條，讓讀者知道還剩多少。
- **Nav 名稱**跟新的章節標題同步，改成問句（*Where to grow?*）比名詞（*Market Map*）更容易理解。
- 在第一個 scroll step 加一行提示：*Scroll to explore — the map on the right updates as you read.*
- Lightbox 放大後應該連同 legend 一起顯示。
- 圖表：scatter 的 revenue 軸建議用 **log scale**（$1K 和 $50K 客戶目前可能擠在一起）；小樣本類別（RERM n=5、Attorney #19 n=5、Cantonese n=1）統一用淺色或斜線標示「small sample」，而不是只在內文中提醒。
- 手機版：sticky panel 和文字重疊的問題要實際測試；26 個 step 在手機上會非常長，精簡 Ch4 後也能改善。
- 所有地圖圖檔補上有意義的 `alt` text（目前 alt 是 caption，可以再寫一句描述主要 pattern）。

---

## 8. 建議執行順序

| 階段 | 工作 | 預期效果 |
|---|---|---|
| A. 快速修正（1–2 天） | 核對 §4 的數字；修正 churn 文字和 seasonal SQL；標題改成結論句；補上 BLUF 和 KPI tiles | 可信度和可讀性大幅提升 |
| B. 地圖（2–3 天） | legend、scale bar、內文提到的區域加標註；GIF → small multiples；刪掉 4 張低資訊量地圖 | 讀者不需要有人講解就能看懂 |
| C. 新分析（3–5 天） | §5.1 penetration → §5.3 distance/catchment → §5.2 hot spot → §5.4 Spanish gap | Geospatial + Business 的核心價值 |
| D. 收尾（1 天） | Action Plan 表格、Limitations、SQL appendix | 故事有完整的結尾 |

如果時間有限：**A + B + §5.1 + §5.3** 是 CP 值最高的組合。
