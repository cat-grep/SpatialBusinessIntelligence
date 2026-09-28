# Where Are Your Best Clients?
### A PostGIS-Driven Spatial Analysis of Client Value, Geography and Growth Strategy

**Geog 574 · Advanced GIS Applications · University of Wisconsin–Madison · Spring 2026**  
**Eugenie Huang & Reid Osborn**

---

## Overview

This project applies PostGIS spatial analysis to a Southern California civil law firm's client database. The StoryMap is built to be read without a presenter: each chapter opens with a question and a one-line answer, then shows the evidence.

1. Who are the firm's best clients?
2. Where do they live?
3. Where should the firm grow next?
4. How has the client map changed since 2021?
5. What makes a client valuable?
6. Which revenue is at risk?

It ends with a ranked action plan, the method and its limits, and an SQL appendix.

---

## Live Demo

Open `index.html` in any modern browser. No server is required: chart data is loaded from `data/story.js`, and maps are pre-rendered images.

---

## Repository Structure

```
SpatialBusinessIntelligence/
├── index.html                # StoryMap page
├── css/style.css             # Layout and styles
├── js/main.js                # Scrollytelling, lightbox, Chart.js charts
├── lib/chart.min.js          # Chart.js 4 (offline copy)
├── analysis/build_story.py   # Rebuilds data/story.js and data/maps/* from PostGIS + ACS
├── data/
│   ├── story.js              # Every number the page quotes (generated)
│   ├── maps/*.png            # Generated maps with legend, scale bar and call-outs
│   ├── LucrativeCustomerTier_{LA,ON,SD}.png   # QGIS close-ups used in Chapter 2
│   └── ERDiagram.PNG, RelationalSchema.PNG
└── PostGIS_Functions.md      # All SQL, by research question
```

---

## Tech Stack

| Layer | Tool |
|---|---|
| Spatial database | PostgreSQL 18 + PostGIS 3.6 |
| Spatial statistics | Python: GeoPandas, NumPy (empirical Bayes smoothing, Getis-Ord Gi*) |
| Demographics | ACS 2018–2022 5-year: B01003 (population), C16001 (language at home), B19013 (income) |
| Map authoring | QGIS 3.x (Chapter 2 close-ups); matplotlib (all other maps) |
| Interactive charts | Chart.js 4 |
| Front-end | HTML, CSS, vanilla JS, no build step |

---

## Rebuilding the numbers and maps

```bash
# from the repository root; PGPASSWORD is only needed with --export
set PGPASSWORD=<your password>          # PowerShell: $env:PGPASSWORD = '...'
python analysis/build_story.py --export # pull fresh tables from PostGIS, then rebuild
python analysis/build_story.py          # rebuild from the last export
```

Raw exports, the ACS downloads and the office locations are kept outside the repository, because they contain client-level records or would identify the firm. Only aggregated numbers and rendered maps are written into `data/`.

The narrative text in `index.html` quotes numbers from `data/story.js`. If the data changes, update the text to match.

---

## Acknowledgements

- **PostGIS** — spatial join and window function engine
- **QGIS** — Chapter 2 market close-up maps
- **Chart.js** — client-side interactive charts
- **Google Fonts** — Oswald & Roboto typefaces

---

## Data Source
- Proprietary law firm records (anonymized)  
- [US Census - American Community Survey 2018–2022 5-year, table-based summary files](https://www2.census.gov/programs-surveys/acs/summary_file/2022/table-based-SF/)  
- [US Census - 2020 ZIP Code Tabulation Areas (ZCTAs)](https://www2.census.gov/geo/tiger/GENZ2020/shp/cb_2020_us_zcta520_500k.zip)  
- [California Department of Technology - California City Boundaries](https://gis.data.ca.gov/datasets/California::california-city-boundaries-and-identifiers/)

---

*Geog 574 · Advanced GIS Applications · University of Wisconsin–Madison · Spring 2026*
