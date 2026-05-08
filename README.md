# Where Are Your Best Clients?
### A PostGIS-Driven Spatial Analysis of Client Value, Geography and Growth Strategy

**Geog 574 · Advanced GIS Applications · University of Wisconsin–Madison · Spring 2026**  
**Eugenie Huang & Reid Osborn**

---

## Overview

This project applies PostGIS spatial analysis to a California law firm's client database to answer five business-critical questions:

1. Who are the high-value clients and where do they live?
2. Which ZIP codes have the most untapped growth potential?
3. How has the firm's client geography shifted over time and which characteristics do each year's client base possess?
4. Which practice areas, billing structures and acquisition channels generate the highest revenue per hour?
5. Which valuable clients are going silent and which attorneys drive the most business?

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
└── data/
    ├── *.png / *.gif       # QGIS-exported map images and animated GIFs
    ├── ERDiagram.PNG       # Entity-relationship diagram
    └── RelationalSchema.PNG
```

---

## Tech Stack

| Layer | Tool |
|---|---|
| Spatial database | PostgreSQL 18 + PostGIS 3.6 |
| Map authoring | QGIS 3.x (DB Manager, Temporal Controller, Bivariate Renderer) |
| Interactive charts | Chart.js 4 |
| Scrollytelling | Vanilla JS — `IntersectionObserver` API |
| Front-end | HTML5 · CSS3 · Vanilla JS (no build step, no framework) |

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

---

## Acknowledgements

- **PostGIS** — spatial join and window function engine
- **QGIS** — map rendering, Temporal Controller animation, Bivariate Renderer plugin
- **Chart.js** — client-side interactive charts
- **Google Fonts** — Oswald & Roboto typefaces

---

## Data Source
- Proprietary law firm records (anonymized)  
- [US Census - 2020 ZIP Code Tabulation Areas (ZCTAs)](https://www2.census.gov/geo/tiger/GENZ2020/shp/cb_2020_us_zcta520_500k.zip)  
- [California Department of Technology - California City Boundaries](https://gis.data.ca.gov/datasets/California::california-city-boundaries-and-identifiers/)  
- Other Tutorials:  
   - [Animated GIF Maker](https://ezgif.com/maker)  
   - [Animating Time Series Data (QGIS3) — QGIS Tutorials and Tips](https://www.qgistutorials.com/en/docs/3/animating_time_series.html)  
   - [Bivariate choropleth maps in QGIS - BNHR](https://bnhr.xyz/2019/09/15/bivariate-choropleths-in-qgis.html)  
---

*Geog 574 · Advanced GIS Applications · University of Wisconsin–Madison · Spring 2026*
