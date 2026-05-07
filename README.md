# Where Are Your Best Clients?
### A PostGIS-Driven Spatial Analysis of Client Value, Geography and Growth Strategy

**Geog 574 · Advanced GIS Applications · University of Wisconsin–Madison · Spring 2026**  
**Eugenie Huang & Reid Osborn**

---

## Overview

This project applies PostGIS spatial analysis to a California law firm's client database to answer five business-critical questions:

1. Who are the high-value clients — and where do they live?
2. Which ZIP code markets have the most untapped potential for growth?
3. How has the firm's client geography shifted over time — and which intake cohorts produced the most value?
4. Which practice areas, billing structures, and acquisition channels generate the highest revenue per hour?
5. Which valuable clients are going silent — and which attorneys drive the most business?

The result is an interactive scrollytelling web page where each scroll step reveals a new map or chart alongside the narrative analysis.

---

## Live Demo

Open `index.html` in any modern browser — no server required. All map exports are pre-rendered as static images; interactive charts are built client-side with Chart.js.

---

## Repository Structure

```
SpatialBusinessIntelligence/
├── index.html              # Main scrollytelling page
├── css/
│   └── style.css           # All styles (layout, nav, charts, responsive)
├── js/
│   └── main.js             # Scrollytelling logic, Chart.js chart functions
├── lib/
│   └── chart.min.js        # Chart.js 4 (bundled offline copy)
├── data/
│   ├── *.png / *.gif       # QGIS-exported map images and animated GIFs
│   ├── ERDiagram.PNG       # Entity-relationship diagram
│   └── RelationalSchema.PNG
├── PostGIS_Functions.md    # Full SQL reference for every analysis query
└── README.md               
```

---

## Tech Stack

| Layer | Tool |
|---|---|
| Spatial database | PostgreSQL 18 + PostGIS 3.4 |
| Map authoring | QGIS 3.x (DB Manager, Temporal Controller, Bivariate Renderer) |
| Interactive charts | Chart.js 4 |
| Scrollytelling | Vanilla JS — `IntersectionObserver` API |
| Front-end | HTML5 · CSS3 · Vanilla JS (no build step, no framework) |

---

## Database Schema

Four relational tables are joined to a ZIP Code Tabulation Area (`zcta`) geometry layer:

```
contact  ──ST_Within──►  zcta
   │
   └──► matter ──► transaction  (funds_in, funds_out)
              └──► activity     (billable hours)
```

All client geometries are stored as Points in **EPSG:4326**. Spatial joins use `ST_Within(contact.geom, zcta.geom)` to assign each client to a ZIP code polygon.

---

## Analysis Chapters

### Chapter 1 — Defining Value: The Client Tier System

`NTILE(4)` window functions rank all 1,071 clients independently on two axes — **net revenue** and **revenue per hour** — producing four tiers:

| Tier | Criteria | Count | Avg Revenue | Avg $/hr |
|---|---|---|---|---|
| **Star** | Top quartile on both dimensions | 86 | $27K | $555 |
| **High Value** | Top quartile revenue only | 182 | $20K | $187 |
| **Efficient** | Top quartile hourly yield only | 182 | $2K | $366 |
| **Standard** | All others | 621 | $1.2K | $171 |

*Star + High Value + Efficient = **Lucrative** (450 clients, 42% of base)*

Maps zoom from the continental US into the three core markets: Los Angeles, Ontario/Inland Empire, and San Diego.

### Chapter 2 — Mapping the Territory: Volume × Quality

Each ZCTA is ranked independently on two dimensions using `NTILE(3)`:
- **Volume rank** — total client count
- **Quality rank** — share of Lucrative clients

The resulting 3×3 bivariate choropleth (rendered with QGIS's Bivariate Renderer plugin) identifies "hidden gem" ZCTAs with high lucrative share but still-low client count — the firm's highest-priority outreach zones.

### Chapter 3 — The Story Over Time

- **3.1 / 3.2 Temporal shift** — `DATE_TRUNC('year', open_date)` + QGIS Temporal Controller animates new matter counts per ZCTA from 2021–2025 for all clients and Lucrative clients separately.
- **3.3 Churn risk** — Lucrative clients with no new matter in 730+ days: 313 clients representing $4.73M in potentially recoverable revenue.
- **3.4 Cohort analysis** — Clients grouped by year of first matter. The 2021 cohort leads with a 56% Lucrative rate and $9,719 average revenue per client.

### Chapter 4 — Revenue & Operations

Consistent aggregation template (`SUM(funds_in - funds_out)` + `SUM(hours)`) applied across six dimensions:

| § | Dimension | Key Finding |
|---|---|---|
| 4.1 | Practice area | Civil Litigation dominates at $1.98B; Case Review leads efficiency at $4,869/hr |
| 4.1 | Seasonal demand | February peak (289 matters); December trough (122 matters) |
| 4.2 | Scope of representation | Estate Planning scope: $9,455/hr; $1.67B sits under "Unspecified" |
| 4.3 | Corporate vs. individual | Revenue per hour nearly identical ($4,038 vs $3,770) |
| 4.4 | Acquisition channel | Referral leads at $4,258/hr and 43% Lucrative rate; RERM converts 75% |
| 4.5 | Client language | Spanish-speaking clients: $4,144/hr — on par with English at $4,094/hr |
| 4.6 | Retainer type | Flat Fee: $4,756/hr at <8 hrs/matter; Hourly-Bonus weakest at $3,024/hr |
| 4.7 | Attorney performance | Attorney #2: 733 clients, $4,384/hr; Attorney #5: lowest yield at $2,232/hr |

---

## Key Findings

1. **42% of clients are Lucrative — but they cluster.** Geography-blind marketing wastes budget on structurally low-conversion areas.
2. **Target quality over volume.** Bivariate analysis reveals underpenetrated premium ZCTAs, especially in San Diego.
3. **Client geography is expanding.** The 2021 cohort ($9,719/client, 56% Lucrative) is the strongest vintage on record.
4. **$4.73M in dormant revenue.** 313 Lucrative clients have been silent for 2+ years, concentrated near the LA core and Pomona–Ontario corridor.
5. **Referral and the Spanish-speaking segment deserve first priority.** Both deliver premium efficiency and represent the firm's highest-ROI growth levers.
6. **Fix billing mix and data gaps.** Flat Fee is the most efficient retainer structure; over $1.67B in revenue is unclassified by scope, obscuring strategy.

---

## Running Locally

```bash
git clone <repo-url>
cd SpatialBusinessIntelligence
# Open index.html in a browser — no npm, no server needed
open index.html   # macOS
start index.html  # Windows
```

Chart.js is bundled in `lib/chart.min.js` so the page works fully offline.

---

## Reproducing the Analysis

All SQL queries are documented in [PostGIS_Functions.md](PostGIS_Functions.md), organized by research question. To re-run against a live PostGIS database:

1. Connect QGIS to your PostgreSQL instance via DB Manager.
2. Execute each query from `PostGIS_Functions.md` to create or refresh the views.
3. Export spatial views as PNG/GIF from QGIS and place them in `data/`.
4. Update the inline data arrays in `js/main.js` with fresh aggregated values.

See [data/README.md](data/README.md) for GeoJSON export instructions if you want to replace the static images with a live Leaflet/MapLibre layer.

---

## Acknowledgements

- **PostGIS** — spatial join and window function engine
- **QGIS** — map rendering, Temporal Controller animation, Bivariate Renderer plugin
- **Chart.js** — client-side interactive charts
- **Google Fonts** — Oswald & Roboto typefaces
- Data: law firm client records (anonymized for academic use)

---

*Geog 574 · Advanced GIS Applications · University of Wisconsin–Madison · Spring 2026*
