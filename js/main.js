'use strict';

// All numbers come from data/story.js (window.STORY), written by analysis/build_story.py.
const S = window.STORY || {};

const TIER = { 'Star': '#434b8b', 'High Value': '#cc586f', 'Efficient': '#368acc', 'Standard': '#9a9a9a' };
const C = {
  good: '#1c5c55', gold: '#c0944c', goldDk: '#8a6429', bad: '#b2182b', grey: '#b9b3a8',
  la: '#434b8b', on: '#1c5c55', sd: '#e8740c'
};
const money = v => '$' + Math.round(v).toLocaleString();
const moneyK = v => v >= 1e6 ? '$' + (v / 1e6).toFixed(2) + 'M' : v >= 1e3 ? '$' + Math.round(v / 1e3) + 'K' : '$' + Math.round(v);

document.addEventListener('DOMContentLoaded', () => {
  initScrolly();
  initLightbox();
  initNav();
  initCharts();
});

// ── Scrollytelling (Chapter 2) ────────────────────────────────────────────
function initScrolly() {
  document.querySelectorAll('.scrolly').forEach(root => {
    const img = root.querySelector('.scrolly-img');
    const caption = root.querySelector('.scrolly-caption');
    const steps = [...root.querySelectorAll('.step')];
    let current = null;

    function activate(step) {
      if (step === current) return;
      current = step;
      steps.forEach(s => s.classList.toggle('active', s === step));
      caption.textContent = step.dataset.caption || '';
      img.alt = step.dataset.alt || '';
      if (img.getAttribute('src') === step.dataset.img) return;
      img.classList.add('fading');
      setTimeout(() => {
        img.src = step.dataset.img;
        const show = () => img.classList.remove('fading');
        if (img.complete) show(); else img.onload = show;
      }, 180);
    }

    const io = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) activate(e.target); });
    }, { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach(s => io.observe(s));
    activate(steps[0]);
    // preload the other maps so switching is instant
    steps.forEach(s => { const i = new Image(); i.src = s.dataset.img; });
  });
}

// ── Lightbox: any image marked data-zoom ──────────────────────────────────
function initLightbox() {
  const modal = document.getElementById('img-modal');
  const mImg = document.getElementById('img-modal-img');
  const mCap = document.getElementById('img-modal-caption');
  const closeBtn = document.getElementById('img-modal-close');
  let opener = null;

  function captionFor(img) {
    const scrolly = img.closest('.scrolly');
    if (scrolly) return scrolly.querySelector('.scrolly-caption').textContent;
    const fig = img.closest('figure');
    const label = fig && fig.querySelector('.exhibit-label');
    if (label) return label.textContent;
    const fc = fig && fig.querySelector('figcaption');
    return fc ? fc.textContent.trim() : img.alt;
  }

  function open(img) {
    opener = img;
    mImg.src = img.currentSrc || img.src;
    mImg.alt = img.alt;
    mCap.textContent = captionFor(img);
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  }
  function close() {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
    if (opener) opener.focus();
  }

  document.querySelectorAll('img[data-zoom]').forEach(img => {
    img.tabIndex = 0;
    img.setAttribute('role', 'button');
    img.addEventListener('click', () => open(img));
    img.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(img); }
    });
  });
  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !modal.classList.contains('hidden')) close(); });
}

// ── Nav: active chapter + reading progress ────────────────────────────────
function initNav() {
  const links = [...document.querySelectorAll('.nav-links a')];
  const targets = links.map(a => document.querySelector(a.getAttribute('href')));
  const bar = document.getElementById('progress-bar');

  function update() {
    const y = window.scrollY + window.innerHeight * 0.3;
    let active = -1;
    targets.forEach((t, i) => { if (t && t.getBoundingClientRect().top + window.scrollY <= y) active = i; });
    links.forEach((a, i) => a.classList.toggle('active', i === active));
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (max > 0 ? window.scrollY / max * 100 : 0) + '%';
  }
  window.addEventListener('scroll', update, { passive: true });
  update();
}

// ── Charts: each is built once, when it scrolls near the viewport ─────────
function initCharts() {
  if (typeof Chart === 'undefined' || !S.ops) return;
  Chart.defaults.font.family = "'Roboto', sans-serif";
  Chart.defaults.font.size = 13;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) Chart.defaults.animation = false;

  const builders = {
    'c-scatter': scatterChart,
    'c-distance': distanceChart,
    'c-yearshare': yearShareChart,
    'c-cohort': cohortChart,
    'c-practice': dark => rphChart(S.ops.practice, { grey: ['Unspecified', 'Other'] }, dark),
    'c-retainer': dark => rphChart(S.ops.retainer, { grey: ['Unspecified'] }, dark),
    'c-channel': channelChart,
    'c-language': dark => rphChart(S.ops.language.filter(d => d.clients >= 20), { showClients: true }, dark)
  };

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      new Chart(e.target, builders[e.target.id](!!e.target.closest('.chapter-dark')));
    });
  }, { rootMargin: '250px 0px' });
  Object.keys(builders).forEach(id => { const el = document.getElementById(id); if (el) io.observe(el); });
}

function theme(dark) {
  return {
    text: dark ? 'rgba(255,255,255,.85)' : '#3a463e',
    sub: dark ? 'rgba(255,255,255,.58)' : '#6b766e',
    grid: dark ? 'rgba(255,255,255,.1)' : 'rgba(31,42,36,.09)'
  };
}
function axis(t, extra = {}) {
  return Object.assign({ ticks: { color: t.sub }, grid: { color: t.grid }, border: { display: false } }, extra);
}
const axisTitle = (t, text) => ({ display: true, text, color: t.sub, font: { size: 12 } });
const legendBottom = t => ({ position: 'bottom', labels: { color: t.text, boxWidth: 12 } });

// prints each bar's value at its end, so readers don't need to hover
const barLabels = {
  id: 'barLabels',
  afterDatasetsDraw(chart, _args, opts) {
    const { ctx } = chart;
    ctx.save();
    ctx.font = '500 12px Roboto, sans-serif';
    ctx.fillStyle = opts.color || '#333';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    chart.getDatasetMeta(0).data.forEach((bar, i) => ctx.fillText(opts.format(i), bar.x + 6, bar.y));
    ctx.restore();
  }
};

// Exhibit 1.1
function scatterChart(dark) {
  const t = theme(dark);
  const order = ['Standard', 'Efficient', 'High Value', 'Star'];
  const pts = S.scatter.map(([rev, rph, tier]) => ({ x: rph, y: rev, tier }));
  const thr = S.thresholds;
  const quadrants = {
    id: 'quadrants',
    afterDraw(chart) {
      const { ctx, chartArea: a, scales } = chart;
      const x = scales.x.getPixelForValue(thr.rph);
      const y = scales.y.getPixelForValue(thr.rev);
      ctx.save();
      ctx.strokeStyle = C.goldDk; ctx.setLineDash([6, 4]); ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(x, a.top); ctx.lineTo(x, a.bottom); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(a.left, y); ctx.lineTo(a.right, y); ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = '700 13px Roboto, sans-serif';
      const tag = (txt, color, px, py, align) => { ctx.fillStyle = color; ctx.textAlign = align; ctx.fillText(txt, px, py); };
      tag('Star', TIER.Star, a.right - 8, a.top + 18, 'right');
      tag('High Value', TIER['High Value'], x - 8, a.top + 18, 'right');
      tag('Efficient', TIER.Efficient, a.right - 8, a.bottom - 10, 'right');
      tag('Standard', '#6f6f6f', x - 8, a.bottom - 10, 'right');
      ctx.font = '500 12px Roboto, sans-serif';
      tag(`top quarter: ${money(thr.rev)}`, C.goldDk, a.left + 8, y - 6, 'left');
      ctx.save(); ctx.translate(x + 14, a.bottom - 30); ctx.rotate(-Math.PI / 2);
      tag(`top quarter: ${money(thr.rph)}/hr`, C.goldDk, 0, 0, 'left');
      ctx.restore();
      ctx.restore();
    }
  };
  return {
    type: 'scatter',
    plugins: [quadrants],
    data: {
      datasets: order.map(tier => ({
        label: tier,
        data: pts.filter(p => p.tier === tier),
        backgroundColor: TIER[tier] + (tier === 'Standard' ? '88' : 'cc'),
        pointRadius: 3, pointHoverRadius: 6
      }))
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: t.text, usePointStyle: true, boxWidth: 8 } },
        tooltip: { callbacks: { label: i => ` ${i.dataset.label}: ${money(i.raw.y)} at ${money(i.raw.x)}/hr` } }
      },
      scales: {
        x: axis(t, {
          type: 'logarithmic', min: 5, max: 6000,
          title: axisTitle(t, 'Revenue per hour (log scale)'),
          ticks: { color: t.sub, callback: v => [10, 30, 100, 300, 1000, 3000].includes(v) ? '$' + v : '' }
        }),
        y: axis(t, {
          type: 'logarithmic', min: 30, max: 200000,
          title: axisTitle(t, 'Net revenue (log scale)'),
          ticks: { color: t.sub, callback: v => [100, 1000, 10000, 100000].includes(v) ? moneyK(v) : '' }
        })
      }
    }
  };
}

// Exhibit 3.1
function distanceChart(dark) {
  const t = theme(dark);
  const d = S.distance;
  return {
    data: {
      labels: d.map(x => x.band + ' mi'),
      datasets: [
        { type: 'bar', label: 'Clients per 100,000 residents', data: d.map(x => x.per100k), backgroundColor: C.good, borderRadius: 2, yAxisID: 'y', order: 2 },
        { type: 'line', label: 'Share of clients who are lucrative', data: d.map(x => x.luc_rate), borderColor: C.gold, backgroundColor: C.gold, pointRadius: 4, borderWidth: 2.5, yAxisID: 'y2', order: 1 }
      ]
    },
    options: {
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: legendBottom(t),
        tooltip: { callbacks: { label: i => i.datasetIndex === 0 ? ` ${i.raw} per 100,000 residents (${d[i.dataIndex].clients} clients)` : ` ${i.raw}% lucrative` } }
      },
      scales: {
        x: axis(t, { grid: { display: false }, title: axisTitle(t, 'Distance from the nearest office') }),
        y: axis(t, { beginAtZero: true, title: axisTitle(t, 'Clients per 100,000 residents') }),
        y2: axis(t, { position: 'right', min: 0, max: 60, grid: { display: false }, title: axisTitle(t, 'Share lucrative'), ticks: { color: t.sub, callback: v => v + '%' } })
      }
    }
  };
}

// Exhibit 4.2
function yearShareChart(dark) {
  const t = theme(dark);
  const y = S.years.filter(d => d.year <= 2025);
  const markets = [['Los Angeles', 'la', C.la], ['Ontario', 'on', C.on], ['San Diego', 'sd', C.sd]];
  return {
    type: 'bar',
    data: {
      labels: y.map(d => d.year),
      datasets: markets.map(([label, k, color]) => ({
        label, data: y.map(d => d[k]), backgroundColor: color, borderColor: dark ? '#1a2d22' : '#f5f2ec', borderWidth: 1
      }))
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: legendBottom(t),
        tooltip: { callbacks: { label: i => ` ${i.dataset.label}: ${i.raw}% of ${y[i.dataIndex].clients} new clients` } }
      },
      scales: {
        x: axis(t, { stacked: true, grid: { display: false } }),
        y: axis(t, { stacked: true, max: 100, ticks: { color: t.sub, callback: v => v + '%' }, title: axisTitle(t, 'Share of new clients (nearest office)') })
      }
    }
  };
}

// Exhibit 4.3
function cohortChart(dark) {
  const t = theme(dark);
  const c = S.cohorts.filter(d => d.year <= 2024);
  return {
    type: 'bar',
    data: {
      labels: c.map(d => d.year),
      datasets: [
        { label: 'Total revenue so far', data: c.map(d => d.lifetime_avg), backgroundColor: C.grey, borderRadius: 2 },
        { label: 'Revenue in first 12 months', data: c.map(d => d.first12_avg), backgroundColor: C.good, borderRadius: 2 }
      ]
    },
    options: {
      maintainAspectRatio: false,
      plugins: {
        legend: legendBottom(t),
        tooltip: { callbacks: { label: i => ` ${i.dataset.label}: ${money(i.raw)} per client` } }
      },
      scales: {
        x: axis(t, { grid: { display: false }, title: axisTitle(t, 'Year of first matter') }),
        y: axis(t, { beginAtZero: true, ticks: { color: t.sub, callback: v => moneyK(v) }, title: axisTitle(t, 'Average per client') })
      }
    }
  };
}

// Chapter 5: revenue per hour by category. Green = well above the firm average, red = well below.
function rphChart(rows, { grey = [], showClients = false }, dark) {
  const t = theme(dark);
  const data = [...rows].sort((a, b) => b.rph - a.rph);
  const firm = S.ops.practice.reduce((s, d) => s + d.rev, 0) / S.ops.practice.reduce((s, d) => s + d.hours, 0);
  const color = d => grey.includes(d.label) ? '#d6d0c6' : d.rph >= firm * 1.08 ? C.good : d.rph <= firm * 0.85 ? C.bad : '#8a948d';
  return {
    type: 'bar',
    plugins: [barLabels],
    data: {
      labels: data.map(d => d.label),
      datasets: [{ data: data.map(d => d.rph), backgroundColor: data.map(color), borderRadius: 2, barPercentage: .78, maxBarThickness: 30 }]
    },
    options: {
      indexAxis: 'y',
      maintainAspectRatio: false,
      layout: { padding: { right: showClients ? 110 : 50 } },
      plugins: {
        legend: { display: false },
        barLabels: { color: t.text, format: i => '$' + Math.round(data[i].rph) + (showClients ? ` · ${data[i].clients} clients` : '') },
        tooltip: { callbacks: { label: i => { const d = data[i.dataIndex]; return [` ${money(d.rph)}/hr`, ` ${moneyK(d.rev)} revenue`, ` ${d.clients} clients`]; } } }
      },
      scales: {
        x: axis(t, { beginAtZero: true, ticks: { color: t.sub, callback: v => '$' + v }, title: axisTitle(t, 'Revenue per hour') }),
        y: axis(t, { grid: { display: false }, ticks: { color: t.text } })
      }
    }
  };
}

function channelChart(dark) {
  const t = theme(dark);
  const rows = S.channel_quality;
  const small = d => d.clients < 20;
  return {
    type: 'bar',
    plugins: [barLabels],
    data: {
      labels: rows.map(d => d.label),
      datasets: [{
        data: rows.map(d => d.luc_rate),
        backgroundColor: rows.map(d => small(d) ? '#dcd6cc' : d.label === 'Spanish Google' ? C.bad : C.good),
        borderRadius: 2, barPercentage: .78
      }]
    },
    options: {
      indexAxis: 'y',
      maintainAspectRatio: false,
      layout: { padding: { right: 110 } },
      plugins: {
        legend: { display: false },
        barLabels: { color: t.text, format: i => `${rows[i].luc_rate}% · ${rows[i].clients} clients` },
        tooltip: { callbacks: { label: i => ` ${rows[i.dataIndex].luc_rate}% of ${rows[i.dataIndex].clients} mapped clients are lucrative` } }
      },
      scales: {
        x: axis(t, { min: 0, max: 100, ticks: { color: t.sub, callback: v => v + '%' }, title: axisTitle(t, 'Share of clients who are lucrative') }),
        y: axis(t, { grid: { display: false }, ticks: { color: t.text } })
      }
    }
  };
}
