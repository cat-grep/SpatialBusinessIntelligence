# Outline: Where Are Your Best Clients?
**Law Firm Spatial Analysis — Geog 574 Final Project, Spring 2026**
*Eugenie Huang & Reid Osborn*


Maps in this project: 15 total (marked `[MAP]` throughout). All produced in QGIS from PostGIS views.

---

# ACT #1 — Set-Up

> *Characters · Setting · Problem Context · Hook · Problem*

## 1. Setting & Characters

**Setting:** A Southern California civil law firm operating across three regional markets — Los Angeles, Ontario/Inland Empire, and San Diego — with 1,071 clients on record.

**Characters:**
- **Clients** — 1,071 contacts, ranging from high-value Stars to low-yield Standard cases.
- **Attorneys** — originating attorneys who bring in clients; responsible attorneys who execute cases.
- **Data** — four relational tables (`contact`, `matter`, `transaction`, `activity`) joined to a ZIP Code Tabulation Area (`zcta`) geometry layer via `ST_Within` spatial joins.

*(Hero section + Introduction)*

---

## 2. Problem Context & Hook

Not all clients are financially equal. Revenue alone is a poor measure of value — a $50K client requiring 800 hours may be less profitable than a $20K client requiring 60 hours.

**The hook — five unanswered business questions:**
1. Who are the high-value clients and where do they live?
2. Which ZIP codes have the most untapped growth potential?
3. How has the firm's client geography shifted over time?
4. Which practice areas, billing structures, and acquisition channels generate the highest revenue per hour?
5. Which valuable clients are going silent and which attorneys drive the most business?

*(Introduction — "The Question")*

---

## 3. The Framework: Client Tier System *(Chapter 1)*

**Problem:** The firm needs a consistent way to measure client value before it can answer any of those questions.

**Solution:** Combine net revenue and revenue-per-hour using `NTILE(4)` window functions to classify every client into one of four tiers.

| Tier | Count | Avg Revenue | Avg $/hr |
|------|-------|-------------|----------|
| Star | 86 | $27K | $555 |
| High Value | 182 | $20K | $187 |
| Efficient | 182 | $2K | $366 |
| Standard | 621 | $1.2K | $171 |

**42% of clients (450 of 1,071) qualify as Lucrative** (Star + High Value + Efficient). This `v_client_tier` view underpins every subsequent analysis.

> **[MAP 1]** `LucrativeCustomerTier_US.png` — Continental US overview: all client locations colored by tier, establishing the national distribution before zooming into the three core markets.

A scatter plot (net revenue × revenue per hour) then makes the four-tier separation visible as a chart. Classification thresholds: top-25% revenue ≥ $6,095; top-25% hourly rate ≥ $261/hr.

---

# ACT #2 — Conflict

> *Plot Line · Plot Point · Rising Action · Tension*

## 4. Where Do Lucrative Clients Live? *(Chapter 1 — Regional Maps)*

**Plot line:** Mapping the tiers spatially reveals that value is not evenly distributed — it clusters.

- **Los Angeles:** Lucrative clients concentrate in South Los Angeles; Standard clients spread broadly across the basin.

> **[MAP 2]** `LucrativeCustomerTier_LA.png` — Los Angeles basin client locations colored by tier.

- **Ontario / Inland Empire:** The firm's highest-volume market. High Value clients stretch from Pomona and Rancho Cucamonga through Fontana, San Bernardino, and Moreno Valley — growth driven by breadth rather than individual Star clients.

> **[MAP 3]** `LucrativeCustomerTier_ON.png` — Inland Empire / Ontario client locations colored by tier.

- **San Diego:** The least-saturated market. All four tiers appear in roughly equal, sparse measure — a signal that this market is underdeveloped and potentially wide open.

> **[MAP 4]** `LucrativeCustomerTier_SD.png` — San Diego client locations colored by tier.

---

## 5. Where Should the Firm Look Next? *(Chapter 2 — Volume × Quality Map)*

**Plot point:** A bivariate choropleth reveals "hidden gem" ZIP Code areas — high Lucrative share, still-low client count — that are not yet on the firm's radar.

Each ZCTA is ranked on two independent axes via `NTILE(3)`:
- **Volume rank (1–3):** total client count.
- **Quality rank (1–3):** share of clients who are Lucrative.

The nine-cell color matrix surfaces four strategic zone types:

| Zone | Color | Meaning |
|------|-------|---------|
| Core market | Blue | High volume + High quality — defend and retain |
| Hidden gems | Purple | Low volume + High quality — highest-priority outreach |
| High volume | Teal | High volume + Low quality — review intake selectivity |
| Low priority | Gray | Low volume + Low quality — deprioritize |

> **[MAP 5]** `VolumeAndQuality.png` — Bivariate choropleth: ZCTA volume rank (x) × quality rank (y). Produced with the QGIS Bivariate Renderer plugin.

---

## 6. How Has the Geography Shifted? *(Chapter 3 — Temporal Analysis)*

**Rising action:** A year-by-year animation of new matter intake (2021–2025) reveals two trends:
1. A gradual shift **outward from downtown cores to suburban corridors.**
2. The total geographic footprint **grows larger every year** — the firm is reaching new communities continuously.

> **[MAP 6]** `SpatialTemporalAllClient.gif` — Animated choropleth: new matters per ZCTA, all clients, 2021–2025.

Running the same animation for **Lucrative clients only** tests whether high-value geography follows the same expansion pattern.

> **[MAP 7]** `SpatialTemporalLucrativeClient.gif` — Animated choropleth: new matters per ZCTA, Lucrative clients only, 2021–2025.

---

## 7. Which Intake Cohort Was the Best? *(Chapter 3 — Cohort Analysis)*

Grouping clients by the year of their first matter reveals which cohorts generated the most durable value.

- **2021 cohort** leads on both dimensions: 56% Lucrative rate and $9,719 average revenue per client.
- More recent cohorts appear weaker, but 2024–2026 cases may not have fully matured yet.

*(Chart only — bar chart of cohort size, total revenue, and Lucrative rate by intake year.)*

---

## 8. Tension: $4.73M in Revenue Has Gone Silent *(Chapter 3 — Churn Risk)*

**Tension:** Among the firm's most valuable clients, **313 Lucrative clients** have had no activity for 730+ days — representing $4.73M in prior revenue.

| Tier | At-Risk Count | Avg Last Revenue | Avg Inactivity |
|------|--------------|-----------------|----------------|
| Star | 63 | $30K | 4.1 yrs |
| High Value | 126 | $20K | 3.9 yrs |
| Efficient | 124 | $2K | 4.1 yrs |

These dormant clients concentrate around the LA urban core and the Pomona–Ontario corridor — the firm's earliest markets. This is recoverable revenue.

> **[MAP 8]** `InactiveLucrativeClient.png` — Churn-risk map: Lucrative clients inactive for 2+ years, showing geographic concentration near urban cores.

---

## 9. What Drives Profitability? *(Chapter 4 — Operations)*

**Rising action continues:** Across six operational dimensions, the analysis reveals which factors make cases more or less profitable per attorney hour.

### Practice Area (§ 4.1)
- **By total revenue:** Civil Litigation leads at $5.02M across 457 clients. *(Bar chart)*
- **By hourly efficiency:** Case Review ($229.82/hr), Drafting ($221.17/hr), Negotiations ($220.74/hr) outperform Civil Litigation ($195.77/hr). *(Bar chart)*
- **Seasonally:** February peak (289 matters); December trough (122 matters). Estate Planning spikes in spring; Probate surges in February. *(Stacked bar chart)*
- **Spatially:** No geographic clustering by practice type — case type is driven by client need, not location.

> **[MAP 9]** `PracticeArea.png` — Geographic distribution of client locations colored by dominant practice area.

### Scope of Representation (§ 4.2)
- **Data gap:** $4.93M in revenue sits under "Unspecified" scope — a classification problem obscuring strategy. *(Bar chart)*
- **By efficiency:** Estate Planning scope ($295.39/hr) and Negotiations ($235.12/hr) outperform Full Litigation ($187.05/hr). *(Bar chart)*
- Unspecified matters average $188.69/hr — not low-value work, just unlabeled.

> **[MAP 10]** `ScopeOfRepresentation.png` — Geographic distribution of client locations colored by scope of representation; Unspecified records dominate uniformly across the service area.

### Corporate vs. Individual (§ 4.3)
- Individuals: 99.3% of clients, $7.09M revenue, $192.32/hr. *(Bar chart)*
- Corporate: 8 clients, $59.4K, $175.26/hr — sample too thin for firm conclusions.

> **[MAP 11]** `CorporateVsIndividual.png` — Client locations colored by corporate vs. individual status; corporate clients cluster near commercial corridors.

### Acquisition Channel (§ 4.4)
- **Volume leaders:** Referral ($1.63M, 300 clients) and Google ($1.55M, 330 clients) — the twin workhorses. *(Bar chart)*
- **Efficiency leader:** RERM at $255.70/hr with a 75% Lucrative conversion rate (small sample). *(Bar chart)*
- **Lucrative conversion rates:** RERM 75%, Official Website & Yelp 50%, Referral & Google 43%, Spanish Google 33%. *(Stacked bar chart)*

> **[MAP 12]** `ClientAcquisitionChannel.png` — Client locations colored by acquisition channel; Referral and Google clients are widespread across the service area.

### Client Language (§ 4.5)
- **Spanish-speaking clients:** 327 clients (19% of the base), $195.82/hr — marginally higher than English ($194.38/hr). *(Bar chart)*
- Spatially distinct: Spanish-language clients cluster in specific communities, not simply mirroring the overall distribution.

> **[MAP 13]** `ClientLanguage.png` — Point map: client locations colored by language preference, revealing spatially distinct Spanish-speaking communities.

> **[MAP 14]** `ClientLanguageZCTA.png` — ZCTA choropleth: Spanish-speaking client count aggregated by ZIP Code area, sharpening the community-level spatial signal.

### Retainer Type (§ 4.6)
- **Most efficient:** Flat Fee at $222.61/hr (707 clients); Hourly - Bonus at $222.43/hr. *(Bar chart)*
- **Least efficient:** Unspecified ($135.69/hr) and Probate retainer ($137.31/hr).
- Hourly - No Bonus dominates volume (988 clients, $6.46M) but at mid-pack efficiency.

> **[MAP 15]** `RetainerType.png` — Client locations colored by retainer type; Flat Fee cases — the most efficient structure — appear across a wide geographic spread.

### Attorney Performance (§ 4.7)
- **Business development (originating):** Attorney #2 (733 clients, $4.83M) and Attorney #4 (389 clients, $3.77M) account for the vast majority of client acquisition — a concentration risk. *(Bar chart)*
- **Execution efficiency (responsible):** Among high-volume attorneys, #4 leads at $199.86/hr across 369 matters; #2 manages 674 matters at $188.92/hr. *(Bar chart)*

*(No map for attorney performance — attorney data is not geocoded.)*

---

# ACT #3 — Resolution

> *Climax · Falling Action · Denouement · Cliffhanger*

## 10. Climax: Six Key Findings

Answering the five opening questions:

| # | Finding |
|---|---------|
| 01 | **42% of clients are Lucrative — but they cluster.** Star and High Value clients concentrate in South LA, the Pomona–Ontario corridor, and select San Diego ZCTAs. |
| 02 | **Target quality over volume in geographic markets.** Bivariate analysis reveals "hidden gem" ZCTAs with high Lucrative share but still-low client count — the highest-priority outreach zones. |
| 03 | **Client geography is expanding.** Intake has shifted outward from downtown cores since 2021. The 2021 cohort remains the strongest — 56% Lucrative, $9,719 avg revenue. |
| 04 | **$4.73M in recoverable revenue is sitting dormant.** 313 Lucrative clients have gone silent for 2+ years, concentrated near the LA core and Pomona–Ontario corridor. |
| 05 | **Referral and the Spanish-speaking segment merit prioritization.** RERM has the strongest efficiency and conversion; Spanish-speaking clients rival English profitability and show clear spatial clustering. |
| 06 | **Fix billing mix, close data gaps, and diversify business development.** Flat Fee is the most efficient retainer. Over $4.93M sits under "Unspecified" scope. Attorney #2 and #4 together originate most new business — a risk. |

*(Key Findings & Recommendations section — no new maps)*

---

## 11. Falling Action: Recommendations

1. **Re-engage dormant Lucrative clients** — targeted outreach to the 313 silent clients, prioritizing 63 Stars who averaged $30K per last matter.
2. **Expand into "hidden gem" ZCTAs** — especially in San Diego, where all four tiers exist in sparse, undifferentiated form, suggesting an underdeveloped market.
3. **Invest in the Spanish-speaking segment** — dedicated bilingual outreach in the high-density ZCTA clusters; efficiency already rivals the English-speaking base.
4. **Shift billing mix toward Flat Fee** — most efficient retainer structure at $222.61/hr; not geographically constrained.
5. **Classify "Unspecified" scopes and sources** — $4.93M in unclassified revenue makes strategy opaque.
6. **Broaden business development** — structured team-wide referral incentives to reduce dependence on Attorney #2 and #4.

---

## 12. Denouement: Methodology

**Database:** PostgreSQL 18 + PostGIS 3.6. Four relational tables joined to a `zcta` geometry layer. EPSG:4326. `COALESCE` normalizes NULLs; `ILIKE` consolidates acquisition channel variants.

**Client Tier Classification:** `NTILE(4)` window functions on net revenue and revenue-per-hour independently. Results stored as `v_client_tier` view — the foundation of all subsequent analyses.

**Visualization:** QGIS 3.x (DB Manager) for all 15 spatial map exports, including the bivariate choropleth (Bivariate Renderer plugin) and animated GIF series. Chart.js 4 for the 14 interactive charts. `IntersectionObserver` API drives the scrollytelling sticky-panel layout.

**Data model:**
- ER Diagram: `Contact` –[Within]→ `ZipCodeArea`; `Matter` –[Incurs]→ `Activity`; `Matter` –[Bills]→ `Transaction`; `Employee` as originating and responsible attorney.
- Relational Schema: `MATTER` is the central table, linking `CONTACT`, `EMPLOYEE`, `ACTIVITY`, `TRANSACTION`, and `ZIPCODEAREA`.

---

## 13. Cliffhanger

Several questions remain open:

- **San Diego** has shown no dominant client type — is the market genuinely underdeveloped, or is there a structural reason the firm hasn't penetrated it?
- **Recent cohorts (2024–2026)** look weak, but their cases are still active. Will their final revenue match 2021's strength?
- **Business development concentration** in two attorneys is a structural risk. What happens if either Attorney #2 or #4 leaves?
- **Data quality gaps** — $4.93M in unclassified scope and significant NULL fields in retainer type — may be hiding important patterns.

---

### Map Index

| # | File | Section | Description |
|---|------|---------|-------------|
| 1 | `LucrativeCustomerTier_US.png` | §3 | Continental US — client locations by tier |
| 2 | `LucrativeCustomerTier_LA.png` | §4 | Los Angeles — client locations by tier |
| 3 | `LucrativeCustomerTier_ON.png` | §4 | Inland Empire / Ontario — client locations by tier |
| 4 | `LucrativeCustomerTier_SD.png` | §4 | San Diego — client locations by tier |
| 5 | `VolumeAndQuality.png` | §5 | Bivariate ZCTA choropleth — volume × quality |
| 6 | `SpatialTemporalAllClient.gif` | §6 | Animated — all client matters per ZCTA, 2021–2025 |
| 7 | `SpatialTemporalLucrativeClient.gif` | §6 | Animated — Lucrative client matters per ZCTA, 2021–2025 |
| 8 | `InactiveLucrativeClient.png` | §8 | Churn-risk — Lucrative clients inactive 2+ years |
| 9 | `PracticeArea.png` | §9 | Client locations by practice area |
| 10 | `ScopeOfRepresentation.png` | §9 | Client locations by scope of representation |
| 11 | `CorporateVsIndividual.png` | §9 | Client locations by corporate vs. individual status |
| 12 | `ClientAcquisitionChannel.png` | §9 | Client locations by acquisition channel |
| 13 | `ClientLanguage.png` | §9 | Client locations by language (point map) |
| 14 | `ClientLanguageZCTA.png` | §9 | Spanish-speaking clients by ZCTA (choropleth) |
| 15 | `RetainerType.png` | §9 | Client locations by retainer type |

---

*Built with PostGIS, QGIS, and Chart.js. Data: proprietary law firm records (anonymized).*
*Geog 574 — Advanced GIS Applications · University of Wisconsin–Madison · Spring 2026*
