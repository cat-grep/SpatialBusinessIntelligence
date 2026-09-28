"""
Build the data and maps behind the StoryMap.

Steps
  1. (optional, --export) pull client / matter / transaction tables out of PostGIS
     with read-only queries. Needs PGPASSWORD in the environment.
  2. join clients to ZCTAs and to 2022 ACS 5-year estimates (population,
     Spanish spoken at home, median household income).
  3. compute every number the page quotes -> data/story.json
  4. render the new maps (legend, scale bar and call-outs baked in) -> data/maps/

Usage
  set PGPASSWORD=...        (only needed with --export)
  python analysis/build_story.py --export
  python analysis/build_story.py            (re-use the last export)

Raw exports stay OUTSIDE the repo (../Analysis/StoryBuild) because they hold
client-level records. Only aggregated numbers and rendered maps land in data/.
"""
import argparse
import json
import os
import subprocess
import urllib.request
from pathlib import Path

import numpy as np
import pandas as pd
import geopandas as gpd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import matplotlib.patheffects
from matplotlib.colors import ListedColormap, BoundaryNorm
from matplotlib.lines import Line2D
from matplotlib.patches import Patch

REPO = Path(__file__).resolve().parents[1]
PROJECT = REPO.parent
WORK = PROJECT / 'Analysis' / 'StoryBuild'
ZCTA_SHP = PROJECT / 'DB' / 'cb_2020_us_zcta520_500k_wgs84.shp'
COUNTY_SHP = PROJECT / 'Analysis' / 'ImportData' / 'cb_2025_us_county_500k.shp'
PLACE_SHP = PROJECT / 'Analysis' / 'ImportData' / 'cb_2025_us_place_500k.shp'
BIG_CITY = PROJECT / 'Analysis' / 'ExportData' / 'california_big_city.geojson'
OFFICE_CSV = PROJECT / 'Analysis' / 'ImportData' / 'office_location.csv'
OUT_JSON = REPO / 'data' / 'story.json'           # story.js is written next to it
MAP_DIR = REPO / 'data' / 'maps'

PSQL = r'C:\Program Files\PostgreSQL\18\bin\psql.exe'
DB = dict(user='postgres', host='localhost', dbname='final_project_sbm')

SNAPSHOT = pd.Timestamp('2026-04-09')      # last matter open date in the extract
DORMANT_DAYS = 730
STUDY_MILES = 60                           # ZCTAs considered part of the service region
CATCHMENT_MILES = 30                       # "market" = within 30 mi of the nearest office
OPPORTUNITY_MILES = 20

ACS_URL = 'https://www2.census.gov/programs-surveys/acs/summary_file/2022/table-based-SF/data/5YRData/acsdt5y2022-{}.dat'

TIER_COLORS = {'Star': '#434b8b', 'High Value': '#cc586f', 'Efficient': '#368acc', 'Standard': '#9a9a9a'}
OFFICE_COLOR = '#e8740c'
OCEAN = '#dfe6ea'
LAND = '#f6f4f0'

EXPORTS = {
    'clients.csv': """
        select ct.client_id, st_x(ct.geom) lon, st_y(ct.geom) lat, ct.client_tier tier,
               ct.net_revenue, ct.total_hours, ct.revenue_per_hour rph, c.iscompany,
               z.zcta5ce20 zcta
        from v_client_tier ct
        join contact c on c.id = ct.client_id
        left join zcta z on st_within(ct.geom, z.geom)""",
    'matters.csv': """
        select m.id matter_id, m.client_id, m.open_date, m.close_date, m.status,
               m.practice_area, m.retainer_type, m.scope_of_representation,
               m.client_language, m.client_source, m.originating_attorney,
               m.responsible_attorney, coalesce(r.rev, 0) net_revenue, coalesce(h.hrs, 0) hours
        from matter m
        left join (select matter_id, sum(funds_in - funds_out) rev from transaction group by 1) r
               on r.matter_id = m.id
        left join (select matter_id, sum(hours) hrs from activity group by 1) h
               on h.matter_id = m.id""",
    'tx.csv': 'select client_id, matter_id, date, funds_in - funds_out net from transaction',
}


# ── helpers ────────────────────────────────────────────────────────────────
def export_from_db():
    WORK.mkdir(parents=True, exist_ok=True)
    if 'PGPASSWORD' not in os.environ:
        raise SystemExit('Set PGPASSWORD before running with --export')
    for name, sql in EXPORTS.items():
        q = ' '.join(sql.split())
        cmd = [PSQL, '-U', DB['user'], '-h', DB['host'], '-d', DB['dbname'], '-v', 'ON_ERROR_STOP=1',
               '-c', f"\\copy ({q}) to '{(WORK / name).as_posix()}' csv header"]
        subprocess.run(cmd, check=True, stdin=subprocess.DEVNULL)
        print('exported', name)


def acs_table(table, cols):
    path = WORK / f'acs_{table}.dat'
    if not path.exists():
        print('downloading ACS', table)
        urllib.request.urlretrieve(ACS_URL.format(table), path)
    d = pd.read_csv(path, sep='|', dtype=str)
    d = d[d.GEO_ID.str.startswith('860Z200US')].copy()
    d['zcta'] = d.GEO_ID.str[-5:]
    for src, dst in cols.items():
        d[dst] = pd.to_numeric(d[src], errors='coerce')
    return d[['zcta'] + list(cols.values())]


def haversine(lat1, lon1, lat2, lon2):
    p = np.pi / 180
    a = np.sin((lat2 - lat1) * p / 2) ** 2 + np.cos(lat1 * p) * np.cos(lat2 * p) * np.sin((lon2 - lon1) * p / 2) ** 2
    return 2 * 3958.8 * np.arcsin(np.sqrt(a))


def nearest_office(lat, lon, offices):
    d = np.stack([haversine(lat, lon, o.lat, o.lon) for o in offices.itertuples()], 1)
    return d.min(1), offices.office.values[d.argmin(1)]


def source_group(s):
    if pd.isna(s):
        return None
    t = s.lower()
    if 'web' in t:
        return 'Official Website'
    if any(k in t for k in ('refer', 'client', 'former', 'family', 'network', 'previous')):
        return 'Referral'
    return s.strip()


def eb_rate(count, pop):
    """Global empirical-Bayes smoothed rate (Marshall 1991): small populations shrink to the mean."""
    ok = pop > 0
    safe = np.where(ok, pop, 1)
    raw = np.where(ok, count / safe, 0)
    m = count[ok].sum() / pop[ok].sum()
    s2 = (pop[ok] * (raw[ok] - m) ** 2).sum() / pop[ok].sum() - m / pop[ok].mean()
    s2 = max(s2, 0)
    w = np.where(ok, s2 / (s2 + m / safe), 0)
    return w * raw + (1 - w) * m


def gi_star(x, neighbors):
    """Getis-Ord Gi* with binary queen weights (self included)."""
    n = len(x)
    xbar = x.mean()
    s = np.sqrt((x ** 2).mean() - xbar ** 2)
    z = np.zeros(n)
    for i in range(n):
        w = [i] + neighbors[i]
        W = len(w)
        z[i] = (x[w].sum() - xbar * W) / (s * np.sqrt((n * W - W ** 2) / (n - 1)))
    return z


def r(x, nd=0):
    return None if x is None or (isinstance(x, float) and np.isnan(x)) else round(float(x), nd) if nd else int(round(float(x)))


# ── load ───────────────────────────────────────────────────────────────────
def load():
    offices = pd.read_csv(OFFICE_CSV, encoding='utf-8-sig')
    offices['office'] = offices.name.str.replace(' OFFICE', '').str.title()

    c = pd.read_csv(WORK / 'clients.csv', dtype={'zcta': str})
    m = pd.read_csv(WORK / 'matters.csv', parse_dates=['open_date', 'close_date'])
    tx = pd.read_csv(WORK / 'tx.csv', parse_dates=['date'])

    c['luc'] = c.tier != 'Standard'
    c['dist'], c['office'] = nearest_office(c.lat.values, c.lon.values, offices)
    span_ids = m[m.client_language.fillna('').str.startswith('Span')].client_id.unique()
    c['spanish'] = c.client_id.isin(span_ids)
    fm = m.groupby('client_id').open_date.agg(first='min', last='max', n_matters='size')
    c = c.merge(fm, left_on='client_id', right_index=True, how='left')
    c['year'] = c['first'].dt.year
    m['src'] = m.client_source.map(source_group)
    first_src = m.sort_values('open_date').dropna(subset=['src']).groupby('client_id').src.first()
    c['src'] = c.client_id.map(first_src)

    acs = (acs_table('b01003', {'B01003_E001': 'pop'})
           .merge(acs_table('c16001', {'C16001_E001': 'pop5', 'C16001_E003': 'spanish_spk'}), on='zcta')
           .merge(acs_table('b19013', {'B19013_E001': 'mhi'}), on='zcta'))
    acs.loc[acs.mhi < 0, 'mhi'] = np.nan

    z = gpd.read_file(ZCTA_SHP, bbox=(-119.6, 32.5, -114.4, 35.2)).rename(columns={'ZCTA5CE20': 'zcta'})
    z = z[['zcta', 'geometry']].merge(acs, on='zcta', how='left')
    z[['pop', 'pop5', 'spanish_spk']] = z[['pop', 'pop5', 'spanish_spk']].fillna(0)
    rep = z.to_crs(3310).geometry.representative_point().to_crs(4326)
    z['clat'], z['clon'] = rep.y.values, rep.x.values
    z['dist'], z['office'] = nearest_office(z.clat.values, z.clon.values, offices)
    agg = c.groupby('zcta').agg(n=('client_id', 'size'), nluc=('luc', 'sum'), rev=('net_revenue', 'sum'),
                                nspan=('spanish', 'sum'))
    z = z.merge(agg, left_on='zcta', right_index=True, how='left')
    z[['n', 'nluc', 'rev', 'nspan']] = z[['n', 'nluc', 'rev', 'nspan']].fillna(0)

    places = gpd.read_file(PLACE_SHP, bbox=(-119.6, 32.5, -114.4, 35.2))
    places = places[places.STATEFP == '06'][['NAME', 'geometry']].to_crs(4326)
    pts = gpd.GeoDataFrame(z[['zcta']], geometry=gpd.points_from_xy(z.clon, z.clat), crs=4326)
    named = gpd.sjoin(pts, places, predicate='within', how='left').drop_duplicates('zcta')
    z['place'] = z.zcta.map(named.set_index('zcta').NAME)
    return offices, c, m, tx, z


# ── analysis ───────────────────────────────────────────────────────────────
def analyse(offices, c, m, tx, z):
    S = z[z.dist <= STUDY_MILES].copy().reset_index(drop=True)
    out = {}

    # headline scope — two populations, stated up front
    out['scope'] = {
        'clients_mapped': len(c),
        'revenue_mapped': r(c.net_revenue.sum()),
        'clients_all': int(m.client_id.nunique()),
        'matters_all': len(m),
        'revenue_all': r(tx.net.sum()),
        'clients_unmapped': int((~pd.Series(m.client_id.unique()).isin(c.client_id)).sum()),
        'first_matter': str(m.open_date.min().date()),
        'last_matter': str(m.open_date.max().date()),
        'clients_region': int((c.dist <= STUDY_MILES).sum()),
        'clients_far': int((c.dist > 100).sum()),
    }

    # tiers
    t = c.groupby('tier').agg(n=('client_id', 'size'), rev=('net_revenue', 'sum'), hours=('total_hours', 'sum'),
                              avg_rev=('net_revenue', 'mean'), avg_rph=('rph', 'mean'))
    tot_rev, tot_n = t.rev.sum(), t.n.sum()
    out['tiers'] = {k: {'n': int(v.n), 'client_share': r(v.n / tot_n * 100, 1), 'rev': r(v.rev),
                        'rev_share': r(v.rev / tot_rev * 100, 1), 'avg_rev': r(v.avg_rev),
                        'avg_rph': r(v.avg_rph), 'repeat_rate': r((c[c.tier == k].n_matters >= 2).mean() * 100, 1)}
                    for k, v in t.iterrows()}
    out['lucrative'] = {'n': int(c.luc.sum()), 'share': r(c.luc.mean() * 100, 1),
                        'rev_share': r(c[c.luc].net_revenue.sum() / tot_rev * 100, 1)}
    q = c[c.rph.notna() & (c.net_revenue > 0)]
    out['scatter'] = [[round(a, 2), round(b, 2), k] for a, b, k in zip(q.net_revenue, q.rph, q.tier)]
    out['thresholds'] = {'rev': 6095, 'rph': 261}
    out['no_hours'] = int(c.rph.isna().sum())

    # markets (30-mile catchments)
    near_c = c[c.dist <= CATCHMENT_MILES]
    near_z = S[S.dist <= CATCHMENT_MILES]
    zm = near_z.groupby('office').agg(pop=('pop', 'sum'), spk=('spanish_spk', 'sum'), pop5=('pop5', 'sum'))
    cm = near_c.groupby('office').agg(n=('client_id', 'size'), nluc=('luc', 'sum'), rev=('net_revenue', 'sum'),
                                      star=('tier', lambda s: (s == 'Star').sum()), med_dist=('dist', 'median'),
                                      nspan=('spanish', 'sum'))
    mk = zm.join(cm)
    mk['per100k'] = mk.n / mk['pop'] * 1e5
    mk['luc_rate'] = mk.nluc / mk.n * 100
    mk['avg_rev'] = mk.rev / mk.n
    mk['span_per100k'] = mk.nspan / mk.spk * 1e5
    mk['nonspan_per100k'] = (mk.n - mk.nspan) / (mk.pop5 - mk.spk) * 1e5
    bench = mk.loc['Ontario', 'per100k']
    mk['clients_at_half_bench'] = (mk['pop'] * (mk.per100k + (bench - mk.per100k) / 2) / 1e5 - mk.n).clip(lower=0)
    mk['rev_at_half_bench'] = mk.clients_at_half_bench * mk.avg_rev
    out['markets'] = {o: {'pop': r(v['pop']), 'clients': r(v.n), 'per100k': r(v.per100k, 1),
                          'luc_rate': r(v.luc_rate, 1), 'revenue': r(v.rev), 'avg_rev': r(v.avg_rev),
                          'stars': r(v.star), 'med_dist': r(v.med_dist, 1),
                          'spanish_speakers': r(v.spk), 'spanish_clients': r(v.nspan),
                          'span_per100k': r(v.span_per100k, 1), 'nonspan_per100k': r(v.nonspan_per100k, 1),
                          'upside_clients': r(v.clients_at_half_bench), 'upside_rev': r(v.rev_at_half_bench)}
                      for o, v in mk.iterrows()}
    out['catchment_miles'] = CATCHMENT_MILES

    # distance decay
    bands = [0, 5, 10, 20, 30, 45, 60]
    labels = ['0–5', '5–10', '10–20', '20–30', '30–45', '45–60']
    S['band'] = pd.cut(S.dist, bands, labels=labels)
    b = S.groupby('band', observed=False).agg(pop=('pop', 'sum'), n=('n', 'sum'), nluc=('nluc', 'sum'), rev=('rev', 'sum'))
    out['distance'] = [{'band': k, 'per100k': r(v.n / v['pop'] * 1e5, 1), 'luc_rate': r(v.nluc / v.n * 100, 1),
                        'clients': r(v.n), 'rev_per_client': r(v.rev / v.n)} for k, v in b.iterrows()]

    # smoothed penetration, hot spots
    pop, n, nl = S['pop'].values, S.n.values, S.nluc.values
    S['cli_eb'] = eb_rate(n, pop) * 1e5
    S['luc_eb'] = eb_rate(nl, pop) * 1e5
    sp = S.to_crs(3310)
    j = gpd.sjoin(sp[['geometry']], sp[['geometry']], predicate='intersects')
    j = j[j.index != j.index_right]
    nbrs = {i: [] for i in range(len(S))}
    for i, k in zip(j.index, j.index_right):
        nbrs[i].append(k)
    S['gi'] = gi_star(S.luc_eb.values, nbrs)
    S['hot'] = np.select([S.gi >= 2.58, S.gi >= 1.96, S.gi <= -1.96], ['hot99', 'hot95', 'cold'], 'ns')
    hs = S.groupby(['office', 'hot']).size().unstack(fill_value=0)
    out['hotspots'] = {o: {k: int(hs.loc[o].get(k, 0)) for k in ('hot99', 'hot95', 'cold')} for o in hs.index}
    top_hot = S[S.hot == 'hot99'].groupby('place').size().sort_values(ascending=False).head(8)
    out['hot_places'] = list(top_hot.index)

    # growth opportunity: expected clients from the firm-wide distance-decay rate
    rate = (b.n / b['pop']).to_dict()
    S['expected'] = S['pop'] * S.band.map(rate).astype(float)
    S['gap'] = S.expected - S.n
    opp = S[(S.dist <= OPPORTUNITY_MILES) & (S['pop'] >= 15000)].sort_values('gap', ascending=False).head(10)
    out['opportunity'] = [{'rank': i + 1, 'zcta': v.zcta, 'place': v.place if isinstance(v.place, str) else 'Unincorporated',
                           'office': v.office, 'dist': r(v.dist, 1), 'pop': r(v['pop']), 'clients': r(v.n),
                           'expected': r(v.expected, 1), 'gap': r(v.gap, 1),
                           'spanish_pct': r(v.spanish_spk / v.pop5 * 100 if v.pop5 else np.nan, 0),
                           'mhi': r(v.mhi)} for i, (_, v) in enumerate(opp.iterrows())]
    S['opp_rank'] = S.index.map({ix: i + 1 for i, ix in enumerate(opp.index)})
    out['opportunity_by_office'] = S[(S.dist <= OPPORTUNITY_MILES) & (S.gap > 0)].groupby('office').gap.sum().round(0).astype(int).to_dict()

    # Spanish gap (catchment ZCTAs with most Spanish speakers, few Spanish-speaking clients)
    span_rate = S[S.dist <= CATCHMENT_MILES].nspan.sum() / S[S.dist <= CATCHMENT_MILES].spanish_spk.sum()
    S['span_gap'] = S.spanish_spk * span_rate - S.nspan
    sg = S[(S.dist <= OPPORTUNITY_MILES)].sort_values('span_gap', ascending=False).head(8)
    out['spanish_gap'] = [{'zcta': v.zcta, 'place': v.place if isinstance(v.place, str) else 'Unincorporated',
                           'office': v.office, 'speakers': r(v.spanish_spk), 'clients': r(v.nspan),
                           'expected': r(v.spanish_spk * span_rate, 1)} for _, v in sg.iterrows()]
    out['spanish'] = {'clients_mapped': int(c.spanish.sum()),
                      'share_mapped': r(c.spanish.mean() * 100, 1),
                      'lang_known': int(m[m.client_language.notna()].client_id.nunique()),
                      'spanish_all': int(m[m.client_language.fillna('').str.startswith('Span')].client_id.nunique())}

    # time
    reg = c[c.dist <= 100]
    yrs = []
    seen = set()
    for y in range(2021, 2027):
        g = reg[reg.year == y]
        zs = set(g.zcta.dropna())
        new = len(zs - seen)
        seen |= zs
        yrs.append({'year': y, 'clients': len(g), 'med_dist': r(g.dist.median(), 1),
                    'la': r((g.office == 'Los Angeles').mean() * 100, 1),
                    'on': r((g.office == 'Ontario').mean() * 100, 1),
                    'sd': r((g.office == 'San Diego').mean() * 100, 1),
                    'new_zcta': new, 'cum_zcta': len(seen), 'luc_rate': r(g.luc.mean() * 100, 1)})
    out['years'] = yrs

    fm = m.groupby('client_id').open_date.min().rename('first')
    t12 = tx.merge(fm, left_on='client_id', right_index=True)
    t12 = t12[(t12.date >= t12['first']) & (t12.date < t12['first'] + pd.DateOffset(months=12))]
    rev12 = t12.groupby('client_id').net.sum()
    coh = fm.to_frame()
    coh['rev12'] = rev12
    coh['rev12'] = coh.rev12.fillna(0)
    coh['year'] = coh['first'].dt.year
    coh['mature'] = coh['first'] <= pd.Timestamp('2026-03-31') - pd.DateOffset(months=12)
    lt = c.groupby('year').agg(n=('client_id', 'size'), lifetime=('net_revenue', 'mean'), luc=('luc', 'mean'))
    out['cohorts'] = []
    for y in range(2021, 2027):
        g = coh[(coh.year == y) & coh.mature]
        out['cohorts'].append({'year': y, 'lifetime_avg': r(lt.lifetime.get(y, np.nan)),
                               'luc_rate': r(lt.luc.get(y, np.nan) * 100, 1),
                               'first12_avg': r(g.rev12.mean()) if len(g) >= 30 else None,
                               'mature_n': len(g)})

    # repeat business and dormant clients
    dormant = c[c.luc & ((SNAPSHOT - c['last']).dt.days > DORMANT_DAYS)]
    out['dormant'] = {'n': len(dormant), 'rev': r(dormant.net_revenue.sum()),
                      'by_tier': {k: {'n': int(len(g)), 'rev': r(g.net_revenue.sum()),
                                      'avg_rev': r(g.net_revenue.mean()),
                                      'yrs': r(((SNAPSHOT - g['last']).dt.days / 365.25).mean(), 1)}
                                  for k, g in dormant.groupby('tier')},
                      'within10': int((dormant.dist <= 10).sum()),
                      'snapshot': str(SNAPSHOT.date())}
    out['repeat'] = {'all_clients': r((m.groupby('client_id').size() >= 2).mean() * 100, 1),
                     'mapped': r((c.n_matters >= 2).mean() * 100, 1),
                     'lucrative': r((c[c.luc].n_matters >= 2).mean() * 100, 1)}

    # referral diffusion: distance from each new client to the nearest EARLIER client
    cc = c.dropna(subset=['first']).sort_values('first').reset_index(drop=True)
    xy = np.c_[cc.lon * np.cos(np.radians(34)) * 69.17, cc.lat * 69.17]
    dprev = np.full(len(cc), np.nan)
    for i in range(20, len(cc)):
        dprev[i] = np.sqrt(((xy[:i] - xy[i]) ** 2).sum(1)).min()
    cc['dprev'] = dprev
    reg_cc = cc[cc.dist <= STUDY_MILES]
    out['diffusion'] = {k: {'n': int(g.dprev.notna().sum()), 'median_mi': r(g.dprev.median(), 2),
                            'within1': r((g.dprev <= 1).mean() * 100, 1)}
                        for k, g in reg_cc.groupby('src') if k in ('Referral', 'Google', 'Spanish Google')}

    # operations (all matters, all clients — 1,874 clients / $9.57M)
    def ops(col, keep=None, other='Other', fill=None):
        d = m.copy()
        d['k'] = d[col].str.strip()
        if keep:
            d['k'] = d.k.where(d.k.isin(keep) | d.k.isna(), other)
        if fill:
            d['k'] = d.k.fillna(fill)
        d = d.dropna(subset=['k'])
        g = d.groupby('k').agg(clients=('client_id', 'nunique'), matters=('matter_id', 'size'),
                               rev=('net_revenue', 'sum'), hours=('hours', 'sum'))
        g['rph'] = g.rev / g.hours
        return [{'label': k, 'clients': int(v.clients), 'matters': int(v.matters), 'rev': r(v.rev),
                 'hours': r(v.hours), 'rph': r(v.rph, 2)} for k, v in g.sort_values('rev', ascending=False).iterrows()]

    m['practice_area'] = m.practice_area.str.strip()
    out['ops'] = {
        'practice': ops('practice_area', ['Civil Litigation', 'Negotiations', 'Drafting', 'Estate Planning', 'Case Review', 'Probate'], fill='Unspecified'),
        'retainer': ops('retainer_type', fill='Unspecified'),
        'scope': ops('scope_of_representation', fill='Unspecified'),
        'language': ops('client_language'),
    }
    m['src5'] = m.src.where(m.src.isin(['Referral', 'Google', 'Spanish Google', 'Official Website', 'Yelp', 'RERM']) | m.src.isna(), 'Others')
    out['ops']['channel'] = ops('src5', fill='Not recorded')
    ch = c[c.dist <= 100].groupby('src').agg(n=('client_id', 'size'), luc=('luc', 'mean'), avg=('net_revenue', 'mean'))
    out['channel_quality'] = [{'label': k, 'clients': int(v.n), 'luc_rate': r(v.luc * 100, 1), 'avg_rev': r(v.avg)}
                              for k, v in ch.sort_values('n', ascending=False).iterrows() if v.n >= 4]
    orig = m.groupby('originating_attorney').agg(clients=('client_id', 'nunique'), rev=('net_revenue', 'sum')).sort_values('rev', ascending=False)
    out['attorneys'] = {'orig': [{'label': f'#{int(k)}', 'clients': int(v.clients), 'rev': r(v.rev)} for k, v in orig.head(8).iterrows()],
                        'orig_top2_share': r(orig.rev.head(2).sum() / orig.rev.sum() * 100, 1),
                        'orig_n': int(len(orig))}
    resp = m.groupby('responsible_attorney').agg(matters=('matter_id', 'size'), rev=('net_revenue', 'sum'), hours=('hours', 'sum'))
    resp['rph'] = resp.rev / resp.hours
    out['attorneys']['resp'] = [{'label': f'#{int(k)}', 'matters': int(v.matters), 'rph': r(v.rph, 2), 'rev': r(v.rev)}
                                for k, v in resp[resp.matters >= 20].sort_values('rph', ascending=False).iterrows()]
    seas = m.dropna(subset=['open_date']).assign(mo=lambda d: d.open_date.dt.month).groupby('mo').size()
    out['seasonal'] = {int(k): int(v) for k, v in seas.items()}
    unspec = next(x for x in out['ops']['scope'] if x['label'] == 'Unspecified')
    out['data_gaps'] = {'scope_unspecified_rev_share': r(unspec['rev'] / tx.net.sum() * 100, 1),
                        'scope_unspecified_matters': unspec['matters'],
                        'source_missing_pct': r(m.client_source.isna().mean() * 100, 1),
                        'language_missing_pct': r(m.client_language.isna().mean() * 100, 1)}
    return out, S


# ── maps ───────────────────────────────────────────────────────────────────
class Basemap:
    def __init__(self, offices):
        self.counties = gpd.read_file(COUNTY_SHP, bbox=(-120, 32.3, -114, 35.5)).to_crs(3310)
        cities = gpd.read_file(BIG_CITY)
        cities = cities[cities.STATEFP == '06'].to_crs(3310)
        cities['pt'] = cities.geometry.representative_point()
        self.cities = cities
        self.offices = gpd.GeoDataFrame(offices, geometry=gpd.points_from_xy(offices.lon, offices.lat), crs=4326).to_crs(3310)

    def frame(self, ax, extent):
        ax.set_facecolor(OCEAN)
        self.counties.plot(ax=ax, color=LAND, edgecolor='none', zorder=0)
        ax.set_xlim(extent[0], extent[2])
        ax.set_ylim(extent[1], extent[3])
        ax.set_xticks([])
        ax.set_yticks([])
        for s in ax.spines.values():
            s.set_edgecolor('#b9b2a6')

    def overlay(self, ax, extent, labels=True, city_min_pop=150000, office_labels=True, fs=9):
        self.counties.boundary.plot(ax=ax, color='#a09a90', linewidth=.6, zorder=4)
        if labels:
            x0, y0, x1, y1 = extent
            placed = [(o.geometry.x, o.geometry.y) for _, o in self.offices.iterrows()]
            for _, cty in self.cities[self.cities.POP >= city_min_pop].sort_values('POP', ascending=False).iterrows():
                p = cty.pt
                if not (x0 < p.x < x1 and y0 < p.y < y1):
                    continue
                if any(np.hypot(p.x - a, p.y - b) < 13000 for a, b in placed):
                    continue
                placed.append((p.x, p.y))
                if True:
                    ax.annotate(cty.NAME, (p.x, p.y), fontsize=fs - 1.5, color='#4a4a4a', ha='center', va='center',
                                zorder=7, fontweight='semibold',
                                path_effects=[matplotlib.patheffects.withStroke(linewidth=2.5, foreground='white')])
        self.offices.plot(ax=ax, marker='D', color=OFFICE_COLOR, markersize=70, edgecolor='white', linewidth=1.2, zorder=9)
        if office_labels:
            for _, o in self.offices.iterrows():
                # San Diego sits on the coast near the frame edge: label it over the ocean instead
                left = o.office == 'San Diego'
                ax.annotate(o.office.upper() + ' OFFICE', (o.geometry.x, o.geometry.y), xytext=(-9 if left else 7, -12),
                            ha='right' if left else 'left',
                            textcoords='offset points', fontsize=fs, color=OFFICE_COLOR, fontweight='bold', zorder=9,
                            path_effects=[matplotlib.patheffects.withStroke(linewidth=3, foreground='white')])

    @staticmethod
    def scalebar(ax, miles=20, loc=(0.04, 0.05), fs=8):
        x0, x1 = ax.get_xlim()
        y0, y1 = ax.get_ylim()
        L = miles * 1609.34
        bx = x0 + (x1 - x0) * loc[0]
        by = y0 + (y1 - y0) * loc[1]
        h = (y1 - y0) * 0.008
        ax.add_patch(plt.Rectangle((bx, by), L / 2, h, color='#333', zorder=10))
        ax.add_patch(plt.Rectangle((bx + L / 2, by), L / 2, h, facecolor='white', edgecolor='#333', zorder=10))
        for frac, lab in ((0, '0'), (.5, str(miles // 2)), (1, f'{miles} mi')):
            ax.text(bx + L * frac, by + h * 2.2, lab, ha='center', va='bottom', fontsize=fs, zorder=10, color='#333')
        ax.annotate('N', xy=(bx + L * 1.35, by + h * 6), xytext=(bx + L * 1.35, by),
                    ha='center', va='bottom', fontsize=fs + 1, fontweight='bold', color='#333', zorder=10,
                    arrowprops=dict(arrowstyle='-|>', color='#333', lw=1.2))


def extent_from(lonlat_box):
    g = gpd.GeoSeries(gpd.points_from_xy([lonlat_box[0], lonlat_box[2]], [lonlat_box[1], lonlat_box[3]]), crs=4326).to_crs(3310)
    return (g.x.min(), g.y.min(), g.x.max(), g.y.max())


REGION = extent_from((-118.75, 32.52, -116.75, 34.45))


def legend_box(ax, handles, title, loc='lower left', fs=9, ncol=1, anchor=(0.02, 0.12)):
    # default sits over the Pacific, clear of every market
    lg = ax.legend(handles=handles, title=title, loc=loc, bbox_to_anchor=anchor, fontsize=fs, title_fontsize=fs + .5,
                   frameon=True, framealpha=.95, edgecolor='#cfc8bc', ncol=ncol, alignment='left')
    lg.set_zorder(20)
    return lg


def save(fig, name):
    MAP_DIR.mkdir(parents=True, exist_ok=True)
    fig.savefig(MAP_DIR / name, dpi=170, bbox_inches='tight', pad_inches=0.05, facecolor='white')
    plt.close(fig)
    print('map', name)


def rings(ax, bm, miles=(10, 20, 30)):
    for _, o in bm.offices.iterrows():
        for mi in miles:
            ax.add_patch(plt.Circle((o.geometry.x, o.geometry.y), mi * 1609.34, fill=False, ls=(0, (4, 3)),
                                    lw=.8, ec='#6b5b45', alpha=.55, zorder=6))


def draw_maps(offices, c, S, out):
    bm = Basemap(offices)
    Sp = S.to_crs(3310)
    cp = gpd.GeoDataFrame(c, geometry=gpd.points_from_xy(c.lon, c.lat), crs=4326).to_crs(3310)

    # 1. where clients are, by tier (replaces the continental-US overview)
    fig, ax = plt.subplots(figsize=(11, 10))
    bm.frame(ax, REGION)
    Sp.boundary.plot(ax=ax, color='#e2ddd4', linewidth=.3, zorder=1)
    for tier in ['Standard', 'Efficient', 'High Value', 'Star']:
        g = cp[cp.tier == tier]
        size = 6 + np.sqrt(g.net_revenue.clip(lower=0)) / 4
        g.plot(ax=ax, color=TIER_COLORS[tier], markersize=size, alpha=.75 if tier != 'Standard' else .45,
               edgecolor='white', linewidth=.3, zorder=5)
    rings(ax, bm, (30,))
    bm.overlay(ax, REGION)
    bm.scalebar(ax)
    h = [Line2D([], [], marker='o', ls='', color=TIER_COLORS[k], ms=8, label=f"{k}  ({out['tiers'][k]['n']})") for k in ['Star', 'High Value', 'Efficient', 'Standard']]
    h += [Line2D([], [], marker='D', ls='', color=OFFICE_COLOR, ms=7, label='Office'),
          Line2D([], [], ls=(0, (4, 3)), color='#6b5b45', label='30-mile market')]
    legend_box(ax, h, 'Client tier  ·  circle size = net revenue')
    save(fig, 'region_tiers.png')

    # 2. penetration choropleth
    fig, ax = plt.subplots(figsize=(11, 10))
    bm.frame(ax, REGION)
    bins = [0, 1, 3, 6, 10, 1e9]
    cols = ['#f2efe9', '#c9e3d8', '#86c3b0', '#3f9383', '#1c5c55']
    cm = ListedColormap(cols)
    Sp.plot(ax=ax, column='cli_eb', cmap=cm, norm=BoundaryNorm(bins, cm.N), edgecolor='white', linewidth=.25, zorder=2)
    Sp[Sp['pop'] < 1000].plot(ax=ax, color='#e8e5df', hatch='////', edgecolor='#d7d2c9', linewidth=0, zorder=3)
    rings(ax, bm, (10, 20, 30))
    bm.overlay(ax, REGION)
    bm.scalebar(ax)
    labs = ['< 1', '1 – 3', '3 – 6', '6 – 10', '10 +']
    h = [Patch(color=cols[i], label=labs[i]) for i in range(5)] + [Patch(facecolor='#e8e5df', hatch='////', edgecolor='#cfc8bc', label='< 1,000 residents')]
    h += [Line2D([], [], ls=(0, (4, 3)), color='#6b5b45', label='10 / 20 / 30 mi from office')]
    legend_box(ax, h, 'Clients per 100,000 residents\n(smoothed, by ZIP area)')
    save(fig, 'penetration.png')

    # 3. hot spots
    fig, ax = plt.subplots(figsize=(11, 10))
    bm.frame(ax, REGION)
    hc = {'hot99': '#b2182b', 'hot95': '#ef8a62', 'ns': '#ece8e1', 'cold': '#67a9cf'}
    for k, col in hc.items():
        g = Sp[Sp.hot == k]
        if len(g):
            g.plot(ax=ax, color=col, edgecolor='white', linewidth=.25, zorder=2)
    bm.overlay(ax, REGION)
    bm.scalebar(ax)
    h = [Patch(color=hc['hot99'], label='Hot spot (99% confidence)'), Patch(color=hc['hot95'], label='Hot spot (95%)'),
         Patch(color=hc['ns'], label='Not significant'), Patch(color=hc['cold'], label='Cold spot (95%+)')]
    legend_box(ax, h, 'Getis-Ord Gi*  ·  lucrative clients\nper 100,000 residents')
    save(fig, 'hotspots.png')

    # 4. opportunity
    fig, ax = plt.subplots(figsize=(11, 10))
    bm.frame(ax, REGION)
    Sp.plot(ax=ax, color='#ece8e1', edgecolor='white', linewidth=.25, zorder=1)
    g = Sp[(Sp.dist <= OPPORTUNITY_MILES) & (Sp.gap > 0)]
    obins = [0, 1, 2, 3, 1e9]
    ocols = ['#fde4c8', '#f9b77a', '#ec7f38', '#b54a0a']
    ocm = ListedColormap(ocols)
    g.plot(ax=ax, column='gap', cmap=ocm, norm=BoundaryNorm(obins, ocm.N), edgecolor='white', linewidth=.25, zorder=2)
    rings(ax, bm, (OPPORTUNITY_MILES,))
    bm.overlay(ax, REGION, city_min_pop=250000)
    top = Sp[Sp.opp_rank.notna()]
    for _, v in top.iterrows():
        p = v.geometry.representative_point()
        ax.annotate(str(int(v.opp_rank)), (p.x, p.y), ha='center', va='center', fontsize=8.5, fontweight='bold',
                    color='white', zorder=12,
                    bbox=dict(boxstyle='circle,pad=0.25', fc='#1a2d22', ec='white', lw=1))
    bm.scalebar(ax)
    labs = ['0 – 1', '1 – 2', '2 – 3', '3 +']
    h = [Patch(color=ocols[i], label=labs[i]) for i in range(4)]
    h += [Line2D([], [], marker='o', ls='', mfc='#1a2d22', mec='white', ms=10, label='Top-10 target ZIP area'),
          Line2D([], [], ls=(0, (4, 3)), color='#6b5b45', label=f'{OPPORTUNITY_MILES} mi from office')]
    legend_box(ax, h, 'Missing clients\n(expected − actual, given distance)')
    save(fig, 'opportunity.png')

    # 5. Spanish-speaking market vs. Spanish-speaking clients
    fig, ax = plt.subplots(figsize=(11, 10))
    bm.frame(ax, REGION)
    Sp['span_pct'] = np.where(Sp.pop5 > 0, Sp.spanish_spk / Sp.pop5.replace(0, np.nan) * 100, np.nan)
    sbins = [0, 15, 30, 45, 60, 101]
    scols = ['#f3eef6', '#d6c6e4', '#b09bd0', '#8966d1', '#56379e']
    scm = ListedColormap(scols)
    Sp.plot(ax=ax, column='span_pct', cmap=scm, norm=BoundaryNorm(sbins, scm.N), edgecolor='white', linewidth=.25,
            zorder=2, missing_kwds={'color': '#ece8e1'})
    sc = cp[cp.spanish]
    sc.plot(ax=ax, color='#f2c14e', markersize=16, edgecolor='#5a4300', linewidth=.5, zorder=8)
    bm.overlay(ax, REGION)
    bm.scalebar(ax)
    labs = ['< 15%', '15 – 30%', '30 – 45%', '45 – 60%', '60% +']
    h = [Patch(color=scols[i], label=labs[i]) for i in range(5)]
    h += [Line2D([], [], marker='o', ls='', mfc='#f2c14e', mec='#5a4300', ms=7, label='Spanish-speaking client')]
    legend_box(ax, h, 'Residents who speak Spanish at home\n(ACS 2018–22)')
    save(fig, 'spanish_gap.png')

    # 6. new clients by year (small multiples, one file each)
    for y in range(2021, 2026):
        fig, ax = plt.subplots(figsize=(6, 5.6))
        bm.frame(ax, REGION)
        prev = cp[cp.year < y]
        if len(prev):
            prev.plot(ax=ax, color='#e2ddd3', markersize=5, zorder=3, alpha=.8)
        g = cp[cp.year == y]
        g[~g.luc].plot(ax=ax, color='#a9a397', markersize=10, zorder=5, alpha=.85, edgecolor='white', linewidth=.3)
        g[g.luc].plot(ax=ax, color='#1c5c55', markersize=16, zorder=6, alpha=.9, edgecolor='white', linewidth=.3)
        bm.overlay(ax, REGION, labels=False, office_labels=False)
        ax.text(.05, .95, str(y), transform=ax.transAxes, fontsize=26, fontweight='bold', color='#1a2d22', va='top', zorder=12)
        save(fig, f'year_{y}.png')

    # 7. dormant lucrative clients
    d = cp[cp.luc & ((SNAPSHOT - cp['last']).dt.days > DORMANT_DAYS)]
    fig, ax = plt.subplots(figsize=(11, 10))
    bm.frame(ax, REGION)
    Sp.boundary.plot(ax=ax, color='#e2ddd4', linewidth=.3, zorder=1)
    for tier in ['Efficient', 'High Value', 'Star']:
        g = d[d.tier == tier]
        g.plot(ax=ax, color=TIER_COLORS[tier], markersize=6 + np.sqrt(g.net_revenue.clip(lower=0)) / 3.2,
               alpha=.75, edgecolor='white', linewidth=.4, zorder=5)
    rings(ax, bm, (10,))
    bm.overlay(ax, REGION)
    bm.scalebar(ax)
    h = [Line2D([], [], marker='o', ls='', color=TIER_COLORS[k], ms=8, label=f"{k}  ({out['dormant']['by_tier'][k]['n']})") for k in ['Star', 'High Value', 'Efficient']]
    for v in (5000, 25000, 75000):
        h.append(Line2D([], [], marker='o', ls='', mfc='none', mec='#555', ms=np.sqrt(6 + np.sqrt(v) / 3.2) * 1.0,
                        label=f'${v // 1000}K lifetime revenue'))
    h.append(Line2D([], [], ls=(0, (4, 3)), color='#6b5b45', label='10 mi from office'))
    legend_box(ax, h, f'Lucrative clients with no new matter\nsince {(SNAPSHOT - pd.Timedelta(days=DORMANT_DAYS)).strftime("%b %Y")}')
    save(fig, 'dormant.png')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--export', action='store_true', help='re-export tables from PostGIS first')
    ap.add_argument('--no-maps', action='store_true')
    a = ap.parse_args()
    if a.export:
        export_from_db()
    offices, c, m, tx, z = load()
    out, S = analyse(offices, c, m, tx, z)
    OUT_JSON.write_text(json.dumps(out, indent=1, ensure_ascii=False), encoding='utf-8')
    # same payload as a script so index.html works from file:// (no fetch needed)
    OUT_JSON.with_suffix('.js').write_text('window.STORY = ' + json.dumps(out, ensure_ascii=False) + ';\n', encoding='utf-8')
    print('wrote', OUT_JSON, 'and story.js')
    if not a.no_maps:
        draw_maps(offices, c, S, out)


if __name__ == '__main__':
    main()
