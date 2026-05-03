# Data Files

Place your PostGIS export files here. The StoryMap expects two GeoJSON files.

## clients.geojson
Export from `v_client_tier` view with the following properties:
- `client_id`
- `client_tier`  ("Star" / "High Value" / "Efficient" / "Standard")
- `net_revenue`
- `revenue_per_hour`
- `days_inactive`  (optional — needed for Chapter 5 retention layer)
- geometry: Point (EPSG:4326)

**Export from QGIS:** DB Manager → Execute SQL → run v_client_tier →
Layer → Export → Save Features As → GeoJSON, CRS EPSG:4326

## zcta.geojson
Export from the `v_map_comparison` view (or the raw ZCTA table joined with quality ranks):
- `zcta5ce20`
- `all_clients`
- `lucrative_clients`
- `lucrative_pct`
- `volume_rank`   (1–3)
- `quality_rank`  (1–3)
- geometry: Polygon/MultiPolygon (EPSG:4326)

Keep both files under ~20 MB for smooth browser rendering.
