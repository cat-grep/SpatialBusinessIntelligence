# PostGIS Functions
**Project: Small Business / Marketing - Law Firm Client Spatial Analysis**
**Team: Reid Osborn, Eugenie Huang**

---

This document mirrors the SQL and analysis shown in `index.html`. Revenue and
hour metrics are aggregated before they are joined together so totals are not
inflated by many-to-many joins between `transaction` and `activity`.

---

## Research Questions Mapped to PostGIS Functions

| Research Question | Section | Primary Tools |
|---|---|---|
| Who are the high-value clients (Star / High Value / Efficient)? | 1 | `NTILE` + `CASE` + pre-aggregated revenue and hours |
| How does the spatial distribution of high-value clients differ from the general client base? | 2 | `ST_Within` + ZCTA + `NTILE(3)` volume/quality matrix |
| Has the geographic clustering of clients shifted over time? | 3 / 3.1-3.2 | `DATE_TRUNC` + `ST_Within` + Temporal Controller |
| Which clients have been inactive for an extended period (churn risk)? | 3.3 | `MAX(open_date)` + `CURRENT_DATE` day difference |
| What is the long-term cumulative value of clients acquired each year? | 3.4 | `MIN(open_date)` cohort + `net_revenue` |
| Are there seasonal patterns in case intake? | 4.1 | `EXTRACT(MONTH)` + `practice_area` |
| Which practice areas / scopes of representation / retainer types generate the most revenue? | 4.1 / 4.2 / 4.6 | `GROUP BY` + `revenue_per_hour` |
| Are corporate clients or individual clients more valuable? | 4.3 | `iscompany` + `revenue_per_hour` |
| Which acquisition channel brings in the most high-value clients? | 4.4 | `client_source` + `v_client_tier` lucrative rate |
| Which ZIP code areas have concentrations of non-English-speaking clients? | 4.5 | `client_language` + `ST_Within` + ZCTA |
| Which attorneys perform best at client development or execution? | 4.7 | `originating_attorney` / `responsible_attorney` |

---

## 1. Identifying High-Value Clients (Revenue x Efficiency)

Aggregate `transaction` by client to calculate net revenue, and aggregate
`activity` through `matter` to calculate total hours. These two client-level
summaries are then joined to `contact` to calculate revenue per hour. Use
`NTILE(4)` window functions to rank clients into four tiers.

The page treats all non-Standard tiers as **Lucrative**. In this dataset, 450 of
1,071 clients (42%) are Lucrative.

```sql
CREATE OR REPLACE VIEW public.v_client_tier AS
WITH client_revenue AS (
  SELECT
    client_id,
    SUM(funds_in - funds_out) AS net_revenue
  FROM transaction
  GROUP BY client_id
),
client_hours AS (
  SELECT
    m.client_id,
    SUM(a.hours) AS total_hours
  FROM activity a
  JOIN matter m ON a.matter_id = m.id
  GROUP BY m.client_id
)
SELECT
  c.id                                                                              AS client_id,
  c.geom,
  COALESCE(r.net_revenue, 0)                                                        AS net_revenue,
  COALESCE(h.total_hours, 0)                                                        AS total_hours,
  ROUND((r.net_revenue / NULLIF(h.total_hours, 0))::numeric, 2)                     AS revenue_per_hour,
  NTILE(4) OVER (ORDER BY r.net_revenue DESC NULLS LAST)                            AS revenue_quartile,
  NTILE(4) OVER (ORDER BY r.net_revenue / NULLIF(h.total_hours, 0) DESC NULLS LAST) AS efficiency_quartile,
  CASE
    WHEN NTILE(4) OVER (ORDER BY r.net_revenue DESC NULLS LAST) = 1
     AND NTILE(4) OVER (ORDER BY
           r.net_revenue / NULLIF(h.total_hours, 0) DESC NULLS LAST) = 1
      THEN 'Star'
    WHEN NTILE(4) OVER (ORDER BY r.net_revenue DESC NULLS LAST) = 1
      THEN 'High Value'
    WHEN NTILE(4) OVER (ORDER BY
           r.net_revenue / NULLIF(h.total_hours, 0) DESC NULLS LAST) = 1
      THEN 'Efficient'
    ELSE 'Standard'
  END AS client_tier
FROM contact c
LEFT JOIN client_revenue r ON c.id = r.client_id
LEFT JOIN client_hours   h ON c.id = h.client_id
WHERE c.isclient = true;
```

| client_tier | Description |
|---|---|
| `Star` | Top-quartile revenue AND top-quartile efficiency - highest retention priority |
| `High Value` | High total revenue but time-intensive |
| `Efficient` | High revenue per hour but smaller total value |
| `Standard` | All remaining clients |

> **Lucrative** = Star + High Value + Efficient combined (all non-Standard tiers).

---

## 2. Area Quality Matrix (Volume x Quality)

Rank each ZCTA independently on two dimensions using `NTILE(3)` (1 = low, 2 = mid, 3 = high). This allows a 3 x 3 strategic matrix rather than a simple binary split.

This matches the page's "Mapping the Territory: Volume x Quality" section:
high-volume/high-quality ZIP areas are already strong markets, while low-volume
but high-quality areas are treated as hidden growth opportunities.

```sql
-- CREATE OR REPLACE VIEW public.v_map_comparison AS
WITH counts AS (
  SELECT
    z.zcta5ce20,
    z.geom,
    COUNT(*)                                              AS all_clients,
    COUNT(*) FILTER (WHERE ct.client_tier != 'Standard') AS lucrative_clients
  FROM v_client_tier ct
  JOIN zcta z ON ST_Within(ct.geom, z.geom)
  GROUP BY z.zcta5ce20, z.geom
)
SELECT
  ROW_NUMBER() OVER ()                                    AS gid,
  zcta5ce20,
  all_clients,
  lucrative_clients,
  ROUND(lucrative_clients::numeric
        / NULLIF(all_clients, 0) * 100, 1)               AS lucrative_pct,
  NTILE(3) OVER (ORDER BY all_clients)                   AS volume_rank,
  NTILE(3) OVER (ORDER BY lucrative_clients::numeric
                          / NULLIF(all_clients, 0))       AS quality_rank,
  geom
FROM counts;
```

| Column | Value | Description |
|---|---|---|
| `volume_rank` | 1 | Bottom-third ZCTAs by total client count |
| `volume_rank` | 2 | Middle-third |
| `volume_rank` | 3 | Top-third ZCTAs by total client count |
| `quality_rank` | 1 | Bottom-third ZCTAs by share of Lucrative clients |
| `quality_rank` | 2 | Middle-third |
| `quality_rank` | 3 | Top-third ZCTAs by share of Lucrative clients |

[QGIS Bivariate Map](https://bnhr.xyz/2019/09/15/bivariate-choropleths-in-qgis.html)

---

## 3. Temporal Spatial Analysis (Has Client Clustering Shifted Over Time?)

Group matters by year and ZCTA using `matter.open_date` to observe how the spatial distribution of cases and clients changes over time.

The page emphasizes a shift from downtown cores toward suburban corridors in
2021-2025, especially the Inland Empire and wider Los Angeles region.

### 3.1 All Clients

```sql
SELECT
  DATE_TRUNC('year', m.open_date)::date   AS year_date,
  z.zcta5ce20,
  COUNT(*)                                AS new_matters,
  z.geom
FROM matter m
JOIN contact c   ON m.client_id = c.id
JOIN zcta z      ON ST_Within(c.geom, z.geom)
WHERE m.open_date IS NOT NULL
GROUP BY year_date, z.zcta5ce20, z.geom
ORDER BY year_date, new_matters DESC;
```

### 3.2 Lucrative Clients Only

Retain only Star, High Value, and Efficient tiers (from `v_client_tier`):

```sql
SELECT
  DATE_TRUNC('year', m.open_date)::date   AS year_date,
  z.zcta5ce20,
  COUNT(*)                                AS new_matters,
  z.geom
FROM matter m
JOIN v_client_tier ct ON m.client_id = ct.client_id
JOIN zcta z           ON ST_Within(ct.geom, z.geom)
WHERE m.open_date IS NOT NULL
  AND ct.client_tier != 'Standard'
GROUP BY year_date, z.zcta5ce20, z.geom
ORDER BY year_date, new_matters DESC;
```

Comparing 3.1 and 3.2 reveals whether the geographic centre of gravity of high-value clients moves in sync with the overall client base, or shows a distinct pattern of dispersal or concentration.

> `DATE_TRUNC('year', ...)::date` returns `2021-01-01` as a proper `date` type. QGIS Temporal Controller requires a `date` or `timestamp` column - `EXTRACT(YEAR ...)` returns `double precision` and will not work.

Output can be loaded directly into QGIS and animated using the Temporal Controller.
[QGIS Temporal Controller](https://www.qgistutorials.com/en/docs/3/animating_time_series.html)

### 3.3 Client Retention and Churn Risk Analysis

Identify clients who have generated revenue in the past but have not opened a new matter within a defined window, with a focus on Lucrative-tier churn:

In the page narrative, 313 Lucrative clients have been inactive for more than
two years. Star clients are the highest-priority dormant group because each
averaged roughly $30K in revenue.

```sql
WITH last_activity AS (
  SELECT
    client_id,
    MAX(open_date)                              AS last_matter_date,
    COUNT(*)                                    AS total_matters
  FROM matter
  WHERE open_date IS NOT NULL
  GROUP BY client_id
)
SELECT
  ct.client_id,
  ct.client_tier,
  ct.net_revenue,
  la.last_matter_date,
  la.total_matters,
  (CURRENT_DATE - la.last_matter_date::date)   AS days_inactive,
  ct.geom
FROM v_client_tier ct
JOIN last_activity la ON ct.client_id = la.client_id
WHERE (CURRENT_DATE - la.last_matter_date::date) > 730   -- inactive for more than 2 years
  AND ct.client_tier != 'Standard'
ORDER BY ct.net_revenue DESC;
```

> Change `730` to adjust the inactivity threshold (e.g. `365` = 1 year). Mapping these clients by ZCTA identifies which areas have the highest concentration of lapsed Lucrative clients - the priority zones for a re-engagement campaign.

### 3.4 Cohort Analysis (Long-Term Value by Intake Year)

Group clients by the year of their first matter to compare cohort size, cumulative revenue, and Lucrative conversion rate across intake years:

The page calls out 2021 as the strongest cohort by long-term value: fewer
clients than later years, but much higher cumulative value per client.

```sql
WITH first_matter AS (
  SELECT
    client_id,
    MIN(open_date)                              AS first_open_date
  FROM matter
  WHERE open_date IS NOT NULL
  GROUP BY client_id
),
cohort AS (
  SELECT
    DATE_TRUNC('year', fm.first_open_date)::date   AS cohort_year,
    ct.client_id,
    ct.net_revenue,
    ct.client_tier
  FROM first_matter fm
  JOIN v_client_tier ct ON fm.client_id = ct.client_id
)
SELECT
  cohort_year,
  COUNT(DISTINCT client_id)                                                              AS cohort_size,
  ROUND(SUM(net_revenue)::numeric, 2)                                                   AS total_revenue,
  ROUND(AVG(net_revenue)::numeric, 2)                                                   AS avg_revenue_per_client,
  COUNT(DISTINCT client_id) FILTER (WHERE client_tier != 'Standard')                   AS lucrative_count,
  ROUND(
    COUNT(DISTINCT client_id) FILTER (WHERE client_tier != 'Standard')::numeric
    / NULLIF(COUNT(DISTINCT client_id), 0) * 100, 1
  )                                                                                     AS lucrative_rate_pct
FROM cohort
WHERE cohort_year IS NOT NULL
GROUP BY cohort_year
ORDER BY cohort_year;
```

| Column | Description |
|---|---|
| `cohort_size` | Number of clients who opened their first matter that year |
| `avg_revenue_per_client` | Average cumulative net revenue per client in the cohort |
| `lucrative_rate_pct` | Share of the cohort that ultimately became Lucrative clients |

Which intake year produced the highest long-term value? Which cohort had the best Lucrative conversion rate? This analysis helps identify whether a specific year's marketing or intake approach is worth replicating.

---

## 4. Multi-Dimensional Revenue Analysis

The same aggregation template applies across six dimensions - swap the `GROUP BY` field to answer a different business question.

Important: summary queries first aggregate revenue and hours separately at the
matter grain (`matter_revenue`, `matter_hours`) before joining them. Directly
joining `transaction` and `activity` to `matter` can multiply rows and inflate
both revenue and hour totals.

### 4.1 Practice Area (`practice_area`)

Which practice areas generate the highest total revenue, and which are most efficient?

The page identifies Civil Litigation as the dominant total-revenue practice.
Case Review, Drafting, and Negotiations lead hourly efficiency, while Civil
Litigation remains the scale leader with a mid-range revenue-per-hour yield.

```sql
-- summary
WITH matter_revenue AS (
  SELECT matter_id,
         SUM(funds_in - funds_out) AS net_revenue
  FROM transaction
  GROUP BY matter_id
),
matter_hours AS (
  SELECT matter_id,
         SUM(hours) AS total_hours
  FROM activity
  GROUP BY matter_id
),
matter_metrics AS (
  SELECT
    m.id,
    m.client_id,
    CASE
      WHEN TRIM(m.practice_area) IN (
        'Civil Litigation', 'Negotiations', 'Drafting',
        'Estate Planning', 'Case Review', 'Probate'
      ) THEN TRIM(m.practice_area)
      ELSE 'Other'
    END AS practice_area_group,
    COALESCE(r.net_revenue, 0) AS net_revenue,
    COALESCE(h.total_hours, 0) AS total_hours
  FROM matter m
  LEFT JOIN matter_revenue r ON r.matter_id = m.id
  LEFT JOIN matter_hours   h ON h.matter_id = m.id
  WHERE m.practice_area IS NOT NULL
)
SELECT
  practice_area_group,
  COUNT(DISTINCT client_id)                                AS client_count,
  ROUND(SUM(net_revenue)::numeric, 2)                      AS total_revenue,
  ROUND(SUM(total_hours)::numeric, 2)                      AS total_hours,
  ROUND((SUM(net_revenue)
         / NULLIF(SUM(total_hours), 0))::numeric, 2)       AS revenue_per_hour
FROM matter_metrics
GROUP BY practice_area_group
ORDER BY total_revenue DESC;
```

- Sort by `total_revenue DESC` - which practice areas earn the most overall
- Sort by `revenue_per_hour DESC` - which practice areas are the most efficient

```sql
-- per-client breakdown
WITH revenue_per_area AS (
    SELECT 
        m.client_id, 
        m.practice_area,
        SUM(t.funds_in - t.funds_out) AS area_net_revenue
    FROM transaction t
    JOIN matter m ON t.matter_id = m.id
    GROUP BY m.client_id, m.practice_area
),
hours_per_area AS (
    SELECT 
        m.client_id, 
        m.practice_area,
        SUM(a.hours) AS area_total_hours
    FROM activity a
    JOIN matter m ON a.matter_id = m.id
    GROUP BY m.client_id, m.practice_area
)
SELECT 
    c.id,
    c.geom,
    r.practice_area,
    COALESCE(r.area_net_revenue, 0) AS net_revenue,
    COALESCE(h.area_total_hours, 0) AS total_hours,
    ROUND(CAST(
        COALESCE(r.area_net_revenue, 0) / NULLIF(h.area_total_hours, 0) 
    AS numeric), 2) AS rev_per_hour
FROM contact c
JOIN revenue_per_area r ON c.id = r.client_id
LEFT JOIN hours_per_area h ON r.client_id = h.client_id 
    AND r.practice_area IS NOT DISTINCT FROM h.practice_area
ORDER BY c.id, net_revenue DESC;
```
Seasonal Demand Patterns

Aggregate by month to identify peak and off-peak periods for case intake, allowing marketing efforts to be timed ahead of high-demand seasons:

The page notes February as the highest-volume month and December as the lowest.
Civil Litigation and Negotiations account for much of the month-to-month volume.

```sql
-- summary
SELECT
  EXTRACT(MONTH FROM open_date)::int AS month,
  CASE
    WHEN TRIM(practice_area) IN (
      'Civil Litigation', 'Negotiations', 'Drafting',
      'Estate Planning', 'Case Review', 'Probate'
    ) THEN TRIM(practice_area)
    ELSE 'Other'
  END AS practice_area_group,
  COUNT(*) AS matter_count
FROM matter
WHERE open_date IS NOT NULL
GROUP BY month, practice_area_group
ORDER BY month, matter_count DESC;
```

### 4.2 Scope of Representation (`scope_of_representation`)

Which representation scope generates the highest total revenue and best hourly efficiency?

The page highlights a data-quality issue: "Unspecified" scope represents the
largest revenue share. Among labeled scopes, Full Litigation and related
litigation categories drive much of the volume.

```sql
-- summary
WITH matter_revenue AS (
  SELECT matter_id,
         SUM(funds_in - funds_out) AS net_revenue
  FROM transaction
  GROUP BY matter_id
),
matter_hours AS (
  SELECT matter_id,
         SUM(hours) AS total_hours
  FROM activity
  GROUP BY matter_id
),
matter_metrics AS (
  SELECT
    m.id,
    m.client_id,
    COALESCE(m.scope_of_representation, 'Unspecified') AS scope_of_representation,
    COALESCE(r.net_revenue, 0) AS net_revenue,
    COALESCE(h.total_hours, 0) AS total_hours
  FROM matter m
  LEFT JOIN matter_revenue r ON r.matter_id = m.id
  LEFT JOIN matter_hours   h ON h.matter_id = m.id
)
SELECT
  scope_of_representation,
  COUNT(DISTINCT client_id)                                AS client_count,
  ROUND(SUM(net_revenue)::numeric, 2)                      AS total_revenue,
  ROUND(SUM(total_hours)::numeric, 2)                      AS total_hours,
  ROUND((SUM(net_revenue)
         / NULLIF(SUM(total_hours), 0))::numeric, 2)       AS revenue_per_hour
FROM matter_metrics
GROUP BY scope_of_representation
ORDER BY revenue_per_hour DESC;
```

- Sort by `total_revenue DESC` - which scope earns the most overall
- Sort by `revenue_per_hour DESC` - which scope is the most efficient

```sql
-- per-client breakdown
WITH revenue_per_area AS (
    SELECT 
        m.client_id, 
        m.scope_of_representation,
        SUM(t.funds_in - t.funds_out) AS area_net_revenue
    FROM transaction t
    JOIN matter m ON t.matter_id = m.id
    GROUP BY m.client_id, m.scope_of_representation
),
hours_per_area AS (
    SELECT 
        m.client_id, 
        m.scope_of_representation,
        SUM(a.hours) AS area_total_hours
    FROM activity a
    JOIN matter m ON a.matter_id = m.id
    GROUP BY m.client_id, m.scope_of_representation
)
SELECT 
    c.id,
    c.geom,
    r.scope_of_representation,
    COALESCE(r.area_net_revenue, 0) AS net_revenue,
    COALESCE(h.area_total_hours, 0) AS total_hours,
    ROUND(CAST(
        COALESCE(r.area_net_revenue, 0) / NULLIF(h.area_total_hours, 0) 
    AS numeric), 2) AS rev_per_hour
FROM contact c
JOIN revenue_per_area r ON c.id = r.client_id
LEFT JOIN hours_per_area h ON r.client_id = h.client_id 
    AND r.scope_of_representation IS NOT DISTINCT FROM h.scope_of_representation
ORDER BY c.id, net_revenue DESC;
```

### 4.3 Corporate vs. Individual Clients (`iscompany`)

Are corporate clients or individual clients more valuable in terms of total revenue and hourly efficiency?

The page emphasizes that individual clients dominate the client base, while
corporate and individual clients have relatively similar revenue-per-hour
performance.

```sql
-- summary
WITH matter_revenue AS (
  SELECT matter_id,
         SUM(funds_in - funds_out) AS net_revenue
  FROM transaction
  GROUP BY matter_id
),
matter_hours AS (
  SELECT matter_id,
         SUM(hours) AS total_hours
  FROM activity
  GROUP BY matter_id
),
matter_metrics AS (
  SELECT
    m.id,
    m.client_id,
    c.iscompany,
    COALESCE(r.net_revenue, 0) AS net_revenue,
    COALESCE(h.total_hours, 0) AS total_hours
  FROM matter m
  JOIN contact c ON m.client_id = c.id
  LEFT JOIN matter_revenue r ON r.matter_id = m.id
  LEFT JOIN matter_hours   h ON h.matter_id = m.id
)
SELECT
  iscompany,
  COUNT(DISTINCT client_id)                                AS client_count,
  ROUND(SUM(net_revenue)::numeric, 2)                      AS total_revenue,
  ROUND(SUM(total_hours)::numeric, 2)                      AS total_hours,
  ROUND((SUM(net_revenue)
         / NULLIF(SUM(total_hours), 0))::numeric, 2)       AS revenue_per_hour
FROM matter_metrics
GROUP BY iscompany
ORDER BY total_revenue DESC;
```

- Sort by `total_revenue DESC` - which client type earns more overall
- Sort by `revenue_per_hour DESC` - which client type is more efficient

```sql
-- per-client breakdown
WITH revenue_per_area AS (
    SELECT 
        m.client_id, 
        c.iscompany,
        SUM(t.funds_in - t.funds_out) AS area_net_revenue
    FROM transaction t
    JOIN matter m ON t.matter_id = m.id
    JOIN contact c     ON m.client_id = c.id
    GROUP BY m.client_id, c.iscompany
),
hours_per_area AS (
    SELECT 
        m.client_id, 
        c.iscompany,
        SUM(a.hours) AS area_total_hours
    FROM activity a
    JOIN matter m ON a.matter_id = m.id
    JOIN contact c     ON m.client_id = c.id
    GROUP BY m.client_id, c.iscompany
)
SELECT 
    c.id,
    c.geom,
    r.iscompany,
    COALESCE(r.area_net_revenue, 0) AS net_revenue,
    COALESCE(h.area_total_hours, 0) AS total_hours,
    ROUND(CAST(
        COALESCE(r.area_net_revenue, 0) / NULLIF(h.area_total_hours, 0) 
    AS numeric), 2) AS rev_per_hour
FROM contact c
JOIN revenue_per_area r ON c.id = r.client_id
LEFT JOIN hours_per_area h ON r.client_id = h.client_id 
    AND r.iscompany IS NOT DISTINCT FROM h.iscompany
ORDER BY c.id, net_revenue DESC;
```

### 4.4 Client Acquisition Channel (`client_source`)

Which acquisition channel generates the highest total revenue and best hourly efficiency?

The page highlights Referral and Google as the highest-volume acquisition
engines by clients and total revenue. RERM has the strongest hourly yield, but
only across a very small client sample.

```sql
-- summary (with source normalisation + top-5, rest -> 'Others')
WITH matter_revenue AS (
  SELECT matter_id,
         SUM(funds_in - funds_out) AS net_revenue
  FROM transaction
  GROUP BY matter_id
),
matter_hours AS (
  SELECT matter_id,
         SUM(hours) AS total_hours
  FROM activity
  GROUP BY matter_id
),
normalised AS (
  SELECT
    CASE
      WHEN m.client_source ILIKE '%web%'       THEN 'Official Website'
      WHEN m.client_source ILIKE '%refer%'
        OR m.client_source ILIKE '%client%'
        OR m.client_source ILIKE '%former%'
        OR m.client_source ILIKE '%family%'
	      OR m.client_source ILIKE '%network%'
        OR m.client_source ILIKE '%previous%'  THEN 'Referral'
      ELSE m.client_source
    END                                         AS source_group,
    m.client_id,
    COALESCE(r.net_revenue, 0)                  AS net_revenue,
    COALESCE(h.total_hours, 0)                  AS total_hours
  FROM matter m
  LEFT JOIN matter_revenue r ON r.matter_id = m.id
  LEFT JOIN matter_hours   h ON h.matter_id = m.id
  WHERE m.client_source IS NOT NULL
),
aggregated AS (
  SELECT
    source_group,
    COUNT(DISTINCT client_id)                                        AS client_count,
    SUM(net_revenue)                                                 AS total_revenue,
    SUM(total_hours)                                                 AS total_hours
  FROM normalised
  GROUP BY source_group
),
ranked AS (
  SELECT *,
    RANK() OVER (ORDER BY total_revenue DESC)                        AS revenue_rank
  FROM aggregated
)
SELECT
  CASE WHEN revenue_rank <= 5 THEN source_group ELSE 'Others' END   AS client_source,
  SUM(client_count)                                                  AS client_count,
  ROUND(SUM(total_revenue)::numeric, 2)                             AS total_revenue,
  ROUND(SUM(total_hours)::numeric, 2)                               AS total_hours,
  ROUND((SUM(total_revenue)
         / NULLIF(SUM(total_hours), 0))::numeric, 2)                AS revenue_per_hour
FROM ranked
GROUP BY 1
ORDER BY total_revenue DESC;
```

- Sort by `total_revenue DESC` - which channel earns the most overall
- Sort by `revenue_per_hour DESC` - which channel is the most efficient

```sql
-- per-client breakdown (normalised + top-5, rest -> 'Others')
WITH matter_revenue AS (
  SELECT matter_id,
         SUM(funds_in - funds_out) AS net_revenue
  FROM transaction
  GROUP BY matter_id
),
matter_hours AS (
  SELECT matter_id,
         SUM(hours) AS total_hours
  FROM activity
  GROUP BY matter_id
),
normalised AS (
  SELECT
    m.client_id,
    CASE
      WHEN m.client_source ILIKE '%web%'       THEN 'Official Website'
      WHEN m.client_source ILIKE '%refer%'
        OR m.client_source ILIKE '%client%'
        OR m.client_source ILIKE '%former%'
        OR m.client_source ILIKE '%family%'
		    OR m.client_source ILIKE '%network%'
        OR m.client_source ILIKE '%previous%'  THEN 'Referral'
      ELSE m.client_source
    END                                         AS source_group,
    COALESCE(r.net_revenue, 0)                  AS net_revenue,
    COALESCE(h.total_hours, 0)                  AS total_hours
  FROM matter m
  LEFT JOIN matter_revenue r ON r.matter_id = m.id
  LEFT JOIN matter_hours   h ON h.matter_id = m.id
  WHERE m.client_source IS NOT NULL
),
top5 AS (
  SELECT source_group
  FROM (
    SELECT source_group,
           RANK() OVER (ORDER BY SUM(net_revenue) DESC) AS rk
    FROM normalised
    GROUP BY source_group
  ) sub
  WHERE rk <= 5
),
client_agg AS (
  SELECT
    n.client_id,
    CASE WHEN t5.source_group IS NOT NULL
         THEN n.source_group ELSE 'Others' END  AS source_group,
    SUM(n.net_revenue)                           AS net_revenue,
    SUM(n.total_hours)                           AS total_hours
  FROM normalised n
  LEFT JOIN top5 t5 ON n.source_group = t5.source_group
  GROUP BY n.client_id,
           CASE WHEN t5.source_group IS NOT NULL
                THEN n.source_group ELSE 'Others' END
)
SELECT
  c.id,
  c.geom,
  ca.source_group                                                  AS client_source,
  ROUND(ca.net_revenue::numeric, 2)                                AS net_revenue,
  ROUND(ca.total_hours::numeric, 2)                                AS total_hours,
  ROUND((ca.net_revenue / NULLIF(ca.total_hours, 0))::numeric, 2)  AS rev_per_hour
FROM contact c
JOIN client_agg ca ON c.id = ca.client_id
ORDER BY c.id, net_revenue DESC;
```

**Channel x Tier Cross-Tab**

Answers "which acquisition channel brings in the highest share of Lucrative clients?" - directly informing marketing budget allocation ROI:

The page calls out RERM, Official Website, and Yelp as high-conversion channels,
while Referral and Google remain important because they deliver the largest
absolute client volumes.

```sql
WITH source_by_client AS (
  SELECT
    m.client_id,
    CASE
      WHEN m.client_source ILIKE '%web%'       THEN 'Official Website'
      WHEN m.client_source ILIKE '%refer%'
        OR m.client_source ILIKE '%client%'
        OR m.client_source ILIKE '%former%'
        OR m.client_source ILIKE '%family%'
		    OR m.client_source ILIKE '%network%'
        OR m.client_source ILIKE '%previous%'  THEN 'Referral'
      ELSE m.client_source
    END                                         AS source_group
  FROM matter m
  WHERE m.client_source IS NOT NULL
  GROUP BY m.client_id, source_group
),
normalised AS (
  SELECT
    s.source_group,
    ct.client_id,
    ct.client_tier,
    ct.net_revenue
  FROM source_by_client s
  JOIN v_client_tier ct ON s.client_id = ct.client_id
),
top5 AS (
  SELECT source_group
  FROM (
    SELECT source_group,
           RANK() OVER (ORDER BY COUNT(DISTINCT client_id) DESC) AS rk
    FROM normalised
    GROUP BY source_group
  ) sub
  WHERE rk <= 5
),
aggregated AS (
  SELECT
    CASE WHEN t5.source_group IS NOT NULL
         THEN n.source_group ELSE 'Others' END              AS source_group,
    COUNT(DISTINCT n.client_id)                             AS total_clients,
    COUNT(DISTINCT n.client_id)
      FILTER (WHERE n.client_tier != 'Standard')            AS lucrative_clients
  FROM normalised n
  LEFT JOIN top5 t5 ON n.source_group = t5.source_group
  GROUP BY 1
)
SELECT
  source_group                                              AS client_source,
  total_clients,
  lucrative_clients,
  ROUND(lucrative_clients::numeric
        / NULLIF(total_clients, 0) * 100, 1)               AS lucrative_rate_pct
FROM aggregated
ORDER BY lucrative_rate_pct DESC;
```

| Column | Description |
|---|---|
| `lucrative_rate_pct` | Percentage of clients from this channel who are Lucrative |

### 4.5 Client Language (`client_language`)

Which client language groups generate the most revenue and highest efficiency?

The page compares English- and Spanish-speaking clients and notes that Spanish
clients are both a substantial share of the client base and similarly profitable
per hour.

```sql
-- summary
WITH matter_revenue AS (
  SELECT matter_id,
         SUM(funds_in - funds_out) AS net_revenue
  FROM transaction
  GROUP BY matter_id
),
matter_hours AS (
  SELECT matter_id,
         SUM(hours) AS total_hours
  FROM activity
  GROUP BY matter_id
),
matter_metrics AS (
  SELECT
    m.id,
    m.client_id,
    m.client_language,
    COALESCE(r.net_revenue, 0) AS net_revenue,
    COALESCE(h.total_hours, 0) AS total_hours
  FROM matter m
  LEFT JOIN matter_revenue r ON r.matter_id = m.id
  LEFT JOIN matter_hours   h ON h.matter_id = m.id
  WHERE m.client_language IS NOT NULL
)
SELECT
  client_language,
  COUNT(DISTINCT client_id)                                AS client_count,
  ROUND(SUM(net_revenue)::numeric, 2)                      AS total_revenue,
  ROUND(SUM(total_hours)::numeric, 2)                      AS total_hours,
  ROUND((SUM(net_revenue)
         / NULLIF(SUM(total_hours), 0))::numeric, 2)       AS revenue_per_hour
FROM matter_metrics
GROUP BY client_language
ORDER BY total_revenue DESC;
```

- Sort by `total_revenue DESC` - which language group earns the most overall
- Sort by `revenue_per_hour DESC` - which language group is the most efficient

```sql
-- per-client breakdown
WITH revenue_per_area AS (
    SELECT 
        m.client_id, 
        m.client_language,
        SUM(t.funds_in - t.funds_out) AS area_net_revenue
    FROM transaction t
    JOIN matter m ON t.matter_id = m.id
    GROUP BY m.client_id, m.client_language
),
hours_per_area AS (
    SELECT 
        m.client_id, 
        m.client_language,
        SUM(a.hours) AS area_total_hours
    FROM activity a
    JOIN matter m ON a.matter_id = m.id
    GROUP BY m.client_id, m.client_language
)
SELECT 
    c.id,
    c.geom,
    r.client_language,
    COALESCE(r.area_net_revenue, 0) AS net_revenue,
    COALESCE(h.area_total_hours, 0) AS total_hours,
    ROUND(CAST(
        COALESCE(r.area_net_revenue, 0) / NULLIF(h.area_total_hours, 0) 
    AS numeric), 2) AS rev_per_hour
FROM contact c
JOIN revenue_per_area r ON c.id = r.client_id
LEFT JOIN hours_per_area h ON r.client_id = h.client_id 
    AND r.client_language IS NOT DISTINCT FROM h.client_language
ORDER BY c.id, net_revenue DESC;
```

**Language x Geographic Distribution**

Identify ZCTAs and clients language, helping the firm decide whether to assign bilingual staff to specific service areas:

```sql
SELECT
  z.zcta5ce20,
  m.client_language,
  COUNT(DISTINCT m.client_id)   AS client_count,
  z.geom
FROM matter m
JOIN contact c ON m.client_id = c.id
JOIN zcta z    ON ST_Within(c.geom, z.geom)
WHERE m.client_language IS NOT NULL
GROUP BY z.zcta5ce20, m.client_language, z.geom
ORDER BY client_count DESC;
```

In QGIS, use `client_language` as the category field for symbology to visualise the geographic hot spots of each language community.

### 4.6 Retainer Type (`retainer_type`)

Which billing arrangement generates the highest total revenue and best hourly efficiency?

The page highlights Flat Fee matters as efficient, structured engagements with
low average hours. It also flags "Unspecified" retainer type as a category that
needs data cleanup before making strong operational conclusions.

```sql
-- summary
WITH matter_revenue AS (
  SELECT matter_id,
         SUM(funds_in - funds_out) AS net_revenue
  FROM transaction
  GROUP BY matter_id
),
matter_hours AS (
  SELECT matter_id,
         SUM(hours) AS total_hours
  FROM activity
  GROUP BY matter_id
),
matter_metrics AS (
  SELECT
    m.id,
    m.client_id,
    COALESCE(m.retainer_type, 'Unspecified') AS retainer_type,
    COALESCE(r.net_revenue, 0) AS net_revenue,
    COALESCE(h.total_hours, 0) AS total_hours
  FROM matter m
  LEFT JOIN matter_revenue r ON r.matter_id = m.id
  LEFT JOIN matter_hours   h ON h.matter_id = m.id
)
SELECT
  retainer_type,
  COUNT(DISTINCT client_id)                                AS client_count,
  ROUND(SUM(net_revenue)::numeric, 2)                      AS total_revenue,
  ROUND(SUM(total_hours)::numeric, 2)                      AS total_hours,
  ROUND((SUM(net_revenue)
         / NULLIF(SUM(total_hours), 0))::numeric, 2)       AS revenue_per_hour
FROM matter_metrics
GROUP BY retainer_type
ORDER BY total_revenue DESC;
```

- Sort by `total_revenue DESC` - which retainer type earns the most overall
- Sort by `revenue_per_hour DESC` - which retainer type is the most efficient

```sql
-- per-client breakdown
WITH revenue_per_area AS (
    SELECT 
        m.client_id, 
        m.retainer_type,
        SUM(t.funds_in - t.funds_out) AS area_net_revenue
    FROM transaction t
    JOIN matter m ON t.matter_id = m.id
    GROUP BY m.client_id, m.retainer_type
),
hours_per_area AS (
    SELECT 
        m.client_id, 
        m.retainer_type,
        SUM(a.hours) AS area_total_hours
    FROM activity a
    JOIN matter m ON a.matter_id = m.id
    GROUP BY m.client_id, m.retainer_type
)
SELECT 
    c.id,
    c.geom,
    r.retainer_type,
    COALESCE(r.area_net_revenue, 0) AS net_revenue,
    COALESCE(h.area_total_hours, 0) AS total_hours,
    ROUND(CAST(
        COALESCE(r.area_net_revenue, 0) / NULLIF(h.area_total_hours, 0) 
    AS numeric), 2) AS rev_per_hour
FROM contact c
JOIN revenue_per_area r ON c.id = r.client_id
LEFT JOIN hours_per_area h ON r.client_id = h.client_id 
    AND r.retainer_type IS NOT DISTINCT FROM h.retainer_type
ORDER BY c.id, net_revenue DESC;
```

### 4.7 Attorney Performance Analysis

**Originating Attorney (Business Development)** - measures how much revenue each attorney brings in through client acquisition:

```sql
SELECT
  m.originating_attorney                                    AS attorney_no,
  COUNT(DISTINCT m.client_id)                               AS clients_originated,
  COUNT(DISTINCT m.id)                                      AS matters_originated,
  ROUND(SUM(t.funds_in - t.funds_out)::numeric, 2)          AS total_revenue_generated
FROM matter m
JOIN transaction t ON t.matter_id = m.id
WHERE m.originating_attorney IS NOT NULL
GROUP BY m.originating_attorney
ORDER BY total_revenue_generated DESC;
```

**Responsible Attorney (Execution Efficiency)** - measures each attorney's revenue per hour while executing cases:

```sql
WITH matter_revenue AS (
  SELECT matter_id,
         SUM(funds_in - funds_out) AS net_revenue
  FROM transaction
  GROUP BY matter_id
),
matter_hours AS (
  SELECT matter_id,
         SUM(hours) AS total_hours
  FROM activity
  GROUP BY matter_id
),
matter_metrics AS (
  SELECT
    m.id,
    m.responsible_attorney,
    COALESCE(r.net_revenue, 0) AS net_revenue,
    COALESCE(h.total_hours, 0) AS total_hours
  FROM matter m
  LEFT JOIN matter_revenue r ON r.matter_id = m.id
  LEFT JOIN matter_hours   h ON h.matter_id = m.id
  WHERE m.responsible_attorney IS NOT NULL
)
SELECT
  responsible_attorney                                      AS attorney_no,
  COUNT(DISTINCT id)                                        AS matters_managed,
  ROUND(SUM(net_revenue)::numeric, 2)                       AS total_revenue,
  ROUND(SUM(total_hours)::numeric, 2)                       AS total_hours,
  ROUND((SUM(net_revenue)
         / NULLIF(SUM(total_hours), 0))::numeric, 2)        AS revenue_per_hour
FROM matter_metrics
GROUP BY responsible_attorney
ORDER BY revenue_per_hour DESC;
```

| Query | Metric | Sort By |
|---|---|---|
| Originating Attorney | Clients and revenue brought in | `total_revenue_generated` |
| Responsible Attorney | Execution efficiency (revenue per hour) | `revenue_per_hour` |

---

## 5. Key Findings Reflected in the Page

These findings summarize the narrative in `index.html` and connect the SQL
outputs to business recommendations.

| Finding | Evidence / Interpretation |
|---|---|
| 42% of clients are Lucrative | The four-tier model identifies 450 of 1,071 clients as Star, High Value, or Efficient. |
| Lucrative clients are spatially clustered | High-value clients concentrate in South Los Angeles, the Pomona-Ontario corridor, and selected San Diego ZCTAs. |
| Some low-volume areas are high-quality | The Volume x Quality matrix helps identify hidden-gem ZIP areas for targeted growth. |
| Client geography is shifting outward | New matter intake expands from downtown cores into suburban corridors from 2021-2025. |
| Dormant Lucrative clients are a retention priority | 313 Lucrative clients have gone silent for 2+ years, with Star clients representing the highest-value re-engagement group. |
| Referrals are the strongest acquisition channel | Referral combines high total revenue, strong hourly efficiency, and a high Lucrative conversion rate. |
| Flat Fee matters are operationally efficient | Flat Fee matters average relatively low hours while producing strong revenue per hour. |

## 6. Methodology Notes

The page uses PostgreSQL/PostGIS queries and QGIS visualization:

| Component | Role |
|---|---|
| `contact` | Client identity, geometry, and client/company flags |
| `matter` | Central case table linking clients to dates, practice dimensions, attorneys, and intake attributes |
| `transaction` | Revenue source, aggregated as `funds_in - funds_out` |
| `activity` | Time source, aggregated as billable/work hours |
| `zcta` | ZIP Code Tabulation Area polygons used for spatial joins |

Core analytical choices:

- Revenue and hours are pre-aggregated before being joined together.
- `ST_Within` assigns client points to ZCTA polygons.
- `NTILE(4)` creates the client tier model.
- `NTILE(3)` creates the Volume x Quality area matrix.
- `DATE_TRUNC('year', open_date)` supports temporal animation in QGIS.
