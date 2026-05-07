'use strict';

// ── State ─────────────────────────────────────────────────────────────────
let chartInst  = null;
let currentViz = null;

const isMobile       = window.matchMedia('(max-width: 860px)').matches;
const LEGEND_SIZE    = isMobile ? 8 : 14;
const LEGEND_BOX     = isMobile ? 6  : 12;

// ── Init ──────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  if (typeof Chart !== 'undefined') {
    Chart.defaults.layout.padding.bottom = 16;
  }
  initLightbox();
  initScrollObserver();
});

// ── Lightbox ──────────────────────────────────────────────────────────────
function initLightbox() {
  const modal   = document.getElementById('img-modal');
  const mImg    = document.getElementById('img-modal-img');
  const mCap    = document.getElementById('img-modal-caption');
  const closeBtn = document.getElementById('img-modal-close');

  function openModal(src, alt, caption) {
    mImg.src = src;
    mImg.alt = alt;
    mCap.textContent = caption;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  document.querySelectorAll('.db-fig img').forEach(img => {
    img.addEventListener('click', () => {
      openModal(img.src, img.alt, img.closest('figure').querySelector('figcaption').textContent);
    });
  });

  const vizImg = document.getElementById('viz-img');
  vizImg.addEventListener('click', () => {
    if (!vizImg.classList.contains('visible')) return;
    openModal(vizImg.src, vizImg.alt, document.getElementById('viz-caption').textContent);
  });

  function close() {
    modal.classList.add('hidden');
    document.body.style.overflow = '';
  }

  closeBtn.addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
}

// ── Image fade helper ─────────────────────────────────────────────────────
function setVizImage(src, alt) {
  const img = document.getElementById('viz-img');
  img.classList.remove('visible');
  setTimeout(() => {
    img.src = src;
    img.alt = alt || '';
    if (img.complete && img.naturalWidth) {
      img.classList.add('visible');
    } else {
      img.onload = () => img.classList.add('visible');
    }
  }, 320);
}

// ── Viz switch ────────────────────────────────────────────────────────────
function showViz(name) {
  if (name === currentViz) return;
  currentViz = name;

  const imgEl   = document.getElementById('img-container');
  const chartEl = document.getElementById('chart-container');
  const caption = document.getElementById('viz-caption');

  // Destroy any existing chart and clear error overlays
  if (chartInst) { chartInst.destroy(); chartInst = null; }
  document.querySelectorAll('.chart-err').forEach(el => el.remove());
  chartEl.classList.remove('tall');
  caption.textContent = '';
  caption.classList.add('hidden');

  switch (name) {

    case 'tier-scatter':
      imgEl.classList.add('hidden');
      chartEl.classList.remove('hidden');
      chartEl.classList.add('tall');
      renderTierScatterChart();
      break;

    case 'tier-us':
    case 'tier-sd':
    case 'tier-la':
    case 'tier-on': {
      imgEl.classList.remove('hidden');
      chartEl.classList.add('hidden');
      const srcs = {
        'tier-us': 'data/LucrativeCustomerTier_US.png',
        'tier-sd': 'data/LucrativeCustomerTier_SD.png',
        'tier-la': 'data/LucrativeCustomerTier_LA.png',
        'tier-on': 'data/LucrativeCustomerTier_ON.png'
      };
      const captions = {
        'tier-us': 'Continental US — Lucrative Client Locations by Tier',
        'tier-sd': 'San Diego — Client Locations Colored by Tier',
        'tier-la': 'Los Angeles — Client Locations Colored by Tier',
        'tier-on': 'Inland Empire / Ontario — Client Locations Colored by Tier'
      };
      setVizImage(srcs[name], captions[name]);
      caption.classList.remove('hidden');
      caption.textContent = captions[name];
      break;
    }

    case 'quality':
      imgEl.classList.remove('hidden');
      chartEl.classList.add('hidden');
      setVizImage('data/VolumeAndQuality.png', 'ZCTA bivariate map — volume rank (columns) × quality rank (rows)');
      caption.classList.remove('hidden');
      caption.textContent = 'ZCTA bivariate map — volume rank (columns) × quality rank (rows)';
      break;

    case 'temporal-all':
    case 'temporal-lucrative': {
      imgEl.classList.remove('hidden');
      chartEl.classList.add('hidden');
      const tSrcs = {
        'temporal-all':       'data/SpatialTemporalAllClient.gif',
        'temporal-lucrative': 'data/SpatialTemporalLucrativeClient.gif'
      };
      const tCaptions = {
        'temporal-all':       'All clients — new matters per ZCTA, animated 2021–2025',
        'temporal-lucrative': 'Lucrative clients only — new matters per ZCTA, animated 2021–2025'
      };
      setVizImage(tSrcs[name], tCaptions[name]);
      caption.classList.remove('hidden');
      caption.textContent = tCaptions[name];
      break;
    }

    case 'churn':
      imgEl.classList.remove('hidden');
      chartEl.classList.add('hidden');
      setVizImage('data/InactiveLucrativeClient.png', 'Lucrative clients inactive for 2+ years — churn-risk map');
      caption.classList.remove('hidden');
      caption.textContent = 'Lucrative clients inactive for 2+ years — churn-risk map';
      break;

    case 'cohort':
      imgEl.classList.add('hidden');
      chartEl.classList.remove('hidden');
      chartEl.classList.add('tall');
      renderCohortChart();
      break;

    case 'seasonal':
      imgEl.classList.add('hidden');
      chartEl.classList.remove('hidden');
      chartEl.classList.add('tall');
      renderSeasonalChart();
      break;

    case 'practice-img':
      imgEl.classList.remove('hidden');
      chartEl.classList.add('hidden');
      setVizImage('data/PracticeArea.png', 'Geographic distribution of matters by practice area');
      caption.classList.remove('hidden');
      caption.textContent = 'Geographic distribution of matters by practice area';
      break;

    case 'practice-revenue':
      imgEl.classList.add('hidden');
      chartEl.classList.remove('hidden');
      chartEl.classList.add('tall');
      renderPracticeRevenueChart();
      break;

    case 'practice-chart':
      imgEl.classList.add('hidden');
      chartEl.classList.remove('hidden');
      chartEl.classList.add('tall');
      renderPracticeAreaChart();
      break;

    case 'scope-img':
      imgEl.classList.remove('hidden');
      chartEl.classList.add('hidden');
      setVizImage('data/ScopeOfRepresentation.png', 'Geographic distribution of matters by scope of representation');
      caption.classList.remove('hidden');
      caption.textContent = 'Geographic distribution of matters by scope of representation';
      break;

    case 'scope-revenue':
      imgEl.classList.add('hidden');
      chartEl.classList.remove('hidden');
      chartEl.classList.add('tall');
      renderScopeRevenueChart();
      break;

    case 'scope-chart':
      imgEl.classList.add('hidden');
      chartEl.classList.remove('hidden');
      chartEl.classList.add('tall');
      renderScopeChart();
      break;

    case 'corp-img':
      imgEl.classList.remove('hidden');
      chartEl.classList.add('hidden');
      setVizImage('data/CorporateVsIndividual.png', 'Geographic distribution of corporate vs. individual clients');
      caption.classList.remove('hidden');
      caption.textContent = 'Geographic distribution of corporate vs. individual clients';
      break;

    case 'corp-chart':
      imgEl.classList.add('hidden');
      chartEl.classList.remove('hidden');
      chartEl.classList.add('tall');
      renderCorpChart();
      break;

    case 'channel-img':
      imgEl.classList.remove('hidden');
      chartEl.classList.add('hidden');
      setVizImage('data/ClientAcquisitionChannel.png', 'Geographic distribution of clients by acquisition channel');
      caption.classList.remove('hidden');
      caption.textContent = 'Geographic distribution of clients by acquisition channel';
      break;

    case 'channel-chart':
      imgEl.classList.add('hidden');
      chartEl.classList.remove('hidden');
      chartEl.classList.add('tall');
      renderChannelChart();
      break;

    case 'channel-crosstab':
      imgEl.classList.add('hidden');
      chartEl.classList.remove('hidden');
      chartEl.classList.add('tall');
      renderChannelCrosstabChart();
      break;

    case 'language-img':
      imgEl.classList.remove('hidden');
      chartEl.classList.add('hidden');
      setVizImage('data/ClientLanguage.png', 'Client locations by language — point map');
      caption.classList.remove('hidden');
      caption.textContent = 'Client locations by language — point map';
      break;

    case 'language-zcta':
      imgEl.classList.remove('hidden');
      chartEl.classList.add('hidden');
      setVizImage('data/ClientLanguageZCTA.png', 'Spanish-speaking clients aggregated by ZIP Code Tabulation Area');
      caption.classList.remove('hidden');
      caption.textContent = 'Spanish-speaking clients aggregated by ZIP Code Tabulation Area';
      break;

    case 'language-chart':
      imgEl.classList.add('hidden');
      chartEl.classList.remove('hidden');
      chartEl.classList.add('tall');
      renderLanguageChart();
      break;

    case 'retainer-img':
      imgEl.classList.remove('hidden');
      chartEl.classList.add('hidden');
      setVizImage('data/RetainerType.png', 'Geographic distribution of clients by retainer type');
      caption.classList.remove('hidden');
      caption.textContent = 'Geographic distribution of clients by retainer type';
      break;

    case 'retainer-chart':
      imgEl.classList.add('hidden');
      chartEl.classList.remove('hidden');
      chartEl.classList.add('tall');
      renderRetainerChart();
      break;

    case 'attorney-orig':
      imgEl.classList.add('hidden');
      chartEl.classList.remove('hidden');
      chartEl.classList.add('tall');
      renderAttorneyOrigChart();
      break;

    case 'attorney-resp':
      imgEl.classList.add('hidden');
      chartEl.classList.remove('hidden');
      chartEl.classList.add('tall');
      renderAttorneyRespChart();
      break;


  }
}

function showChartUnavailable(msg) {
  const c = document.getElementById('chart-container');
  let el = c.querySelector('.chart-err');
  if (!el) {
    el = document.createElement('p');
    el.className = 'chart-err';
    el.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:rgba(255,255,255,.4);text-align:center;font-size:.85rem;margin:0;pointer-events:none;width:80%';
    c.appendChild(el);
  }
  el.textContent = msg || 'Chart.js not loaded — add lib/chart.min.js';
}

// ── § 1 Client Tier scatter ───────────────────────────────────────────────
function renderTierScatterChart() {
  if (typeof Chart === 'undefined') { showChartUnavailable(); return; }

  const COLORS = {
    'Star':       '#434b8b',
    'High Value': '#cc586f',
    'Efficient':  '#368acc',
    'Standard':   '#888888'
  };
  const ORDER = ['Standard', 'Efficient', 'High Value', 'Star'];

  // [net_revenue, revenue_per_hour, client_tier] — 823 clients with valid rev & rph
  const RAW = [[127795.24,308.68,"Star"],[121805,192.36,"High Value"],[104008.1,542.58,"Star"],[95716.76,283.01,"Star"],[93800,218.3,"High Value"],[88000,267.18,"Star"],[87896.79,193.69,"High Value"],[81267.8,277.68,"Star"],[79293.6,249.64,"High Value"],[78458.14,364.58,"Star"],[70462.2,283.42,"Star"],[59801.54,280.63,"Star"],[58466.42,277.22,"Star"],[57103.3,122.67,"High Value"],[53974.75,213.7,"High Value"],[52004.17,265.76,"Star"],[52001.33,279.73,"Star"],[51913,318.54,"Star"],[51288.44,206.06,"High Value"],[49332.8,255.93,"High Value"],[48421.98,257.99,"High Value"],[48403.63,342.68,"Star"],[48338.52,726.46,"Star"],[47450.85,254.77,"High Value"],[45025.15,267.75,"Star"],[45020.55,560.58,"Star"],[44559.29,151.67,"High Value"],[43812.33,206.51,"High Value"],[41751.14,214.79,"High Value"],[41744.37,719.36,"Star"],[41530.45,240.07,"High Value"],[40299.55,299.09,"Star"],[40211.45,248.14,"High Value"],[40159.45,158.06,"High Value"],[40000,207.87,"High Value"],[39252.25,204.47,"High Value"],[38377.5,70.85,"High Value"],[37655.6,210.63,"High Value"],[36456.65,284.26,"Star"],[35269.8,1123.24,"Star"],[34874.9,230.55,"High Value"],[34791.97,214.09,"High Value"],[34676.79,4737.27,"Star"],[33835.95,198.7,"High Value"],[33767.35,283.12,"Star"],[33610.75,266.24,"Star"],[33604.14,336.21,"Star"],[32197.11,238.66,"High Value"],[31705,507.52,"Star"],[31367.89,224.52,"High Value"],[30806.2,267.81,"Star"],[30750,293.61,"Star"],[30692.95,225.5,"High Value"],[29945.9,235.13,"High Value"],[29943.1,226.07,"High Value"],[29681.4,185.09,"High Value"],[29409.5,251.84,"High Value"],[29135.49,208.33,"High Value"],[28496.1,195.47,"High Value"],[28465.75,170.2,"High Value"],[28334.45,279.02,"Star"],[28247.97,137.94,"High Value"],[27254.8,158.68,"High Value"],[26665.41,219.14,"High Value"],[26500,201.51,"High Value"],[25578.45,357.99,"Star"],[25426.55,275.06,"Star"],[25392.9,246.51,"High Value"],[24947.5,261.29,"Star"],[24649.89,1121.47,"Star"],[24605.4,241.58,"High Value"],[24601.69,178.78,"High Value"],[24461.7,259.4,"High Value"],[24226,269.69,"Star"],[23937.25,158.06,"High Value"],[23577.6,356.26,"Star"],[23463.85,194.96,"High Value"],[23452.33,1067.47,"Star"],[23316.51,234.69,"High Value"],[22968.45,175.17,"High Value"],[22957.5,308.11,"Star"],[22787.49,255.06,"High Value"],[22334.65,236.1,"High Value"],[22229.4,338.4,"Star"],[22191.95,125.24,"High Value"],[21743.85,168.57,"High Value"],[21611.5,158.9,"High Value"],[21547.36,169.38,"High Value"],[21166.9,3307.33,"Star"],[20997.83,242.72,"High Value"],[20708.04,254.71,"High Value"],[20558.2,130.59,"High Value"],[20461,4175.71,"Star"],[20444.89,171.55,"High Value"],[20398.58,396.09,"Star"],[20290.1,62.49,"High Value"],[20186.8,306.14,"Star"],[20182.2,190.15,"High Value"],[20000,232.18,"High Value"],[20000,325.84,"Star"],[20000,83.92,"High Value"],[19887.84,121.88,"High Value"],[19870.5,201.49,"High Value"],[19802.95,286.58,"Star"],[19642.45,177.04,"High Value"],[19559,433.2,"Star"],[19409,237.94,"High Value"],[18968.8,233.4,"High Value"],[18925.99,135.53,"High Value"],[18817.85,288.35,"Star"],[18661.05,229.76,"High Value"],[18543.5,262.73,"Star"],[18359.95,220.3,"High Value"],[18317.25,254.05,"High Value"],[18178,177.73,"High Value"],[18048.15,266.2,"Star"],[17564.08,362.59,"Star"],[17528.75,134.92,"High Value"],[17499.4,199.58,"High Value"],[17468.55,259.56,"High Value"],[17381,251.35,"High Value"],[17377.45,205.31,"High Value"],[17231.91,91.53,"High Value"],[17050,221.46,"High Value"],[17021.7,208.75,"High Value"],[16745.6,198.76,"High Value"],[16643.55,184.27,"High Value"],[16544.15,268.14,"Star"],[16396.59,159.94,"High Value"],[16333.3,192.25,"High Value"],[16182.15,232.24,"High Value"],[16068.71,305.08,"Star"],[16005.28,101.86,"High Value"],[15907.5,129.78,"High Value"],[15828.03,194.85,"High Value"],[15694.45,232.17,"High Value"],[15549.1,192.13,"High Value"],[15500,363.25,"Star"],[15411.45,206.34,"High Value"],[15262.38,230.38,"High Value"],[15210.99,186.04,"High Value"],[15042,279.75,"Star"],[15021.32,478.54,"Star"],[15000,96.63,"High Value"],[15000,250.67,"High Value"],[15000,210.82,"High Value"],[15000,44.85,"High Value"],[14972.4,121.74,"High Value"],[14857.3,280.64,"Star"],[14850,148.77,"High Value"],[14654.06,233.34,"High Value"],[14398.5,135.07,"High Value"],[14300,206.71,"High Value"],[14190.9,112.01,"High Value"],[14119.07,187.08,"High Value"],[14034.53,330.85,"Star"],[13935.75,170.55,"High Value"],[13846.5,220.66,"High Value"],[13782.6,220.49,"High Value"],[13728.16,180.07,"High Value"],[13708.45,72.77,"High Value"],[13500,189.37,"High Value"],[13295.5,109.73,"High Value"],[13203.1,125.83,"High Value"],[13173.7,186.31,"High Value"],[13147.1,460.98,"Star"],[13135.36,172.65,"High Value"],[13049.94,167.41,"High Value"],[12751.72,389.6,"Star"],[12725.6,495.16,"Star"],[12644.15,211.48,"High Value"],[12604.95,188.05,"High Value"],[12582.1,342.84,"Star"],[12512.9,184.42,"High Value"],[12163.5,226.72,"High Value"],[12013.05,339.35,"Star"],[11864.25,271.49,"Star"],[11816.89,283.79,"Star"],[11811.12,124.33,"High Value"],[11801,276.76,"Star"],[11665.1,214.24,"High Value"],[11632.5,371.65,"Star"],[11576.18,253.36,"High Value"],[11568.2,219.51,"High Value"],[11504.49,108.63,"High Value"],[11415.39,195.7,"High Value"],[11404.7,308.24,"Star"],[11242.9,164.2,"High Value"],[11186.9,284.58,"Star"],[11089,113.2,"High Value"],[11000,104.46,"High Value"],[10500,563.91,"Star"],[10406.2,206.88,"High Value"],[10331.55,104.12,"High Value"],[10208.56,187.93,"High Value"],[10171.1,252.01,"High Value"],[10088.75,107.65,"High Value"],[10034,124.4,"High Value"],[9977.45,213.56,"High Value"],[9845.5,221.55,"High Value"],[9830.5,260.62,"High Value"],[9682.22,162.81,"High Value"],[9667.22,167.4,"High Value"],[9660.8,177.43,"High Value"],[9655,229.66,"High Value"],[9645.68,14.24,"High Value"],[9500,190.76,"High Value"],[9474.5,291.25,"Star"],[9398,261.27,"Star"],[9391.8,241.99,"High Value"],[9354.75,191.26,"High Value"],[9341.2,178.95,"High Value"],[9333.2,312.25,"Star"],[9286.9,263.83,"Star"],[9214.75,243.39,"High Value"],[9202.25,122.84,"High Value"],[9190,180.41,"High Value"],[9180,1275,"Star"],[9156.55,197.77,"High Value"],[9026.37,197.51,"High Value"],[9000,248.96,"High Value"],[9000,141.04,"High Value"],[8939,508.48,"Star"],[8817.3,211.34,"High Value"],[8776.1,245.21,"High Value"],[8773.15,292.54,"Star"],[8700,56.8,"High Value"],[8627.1,162.32,"High Value"],[8552.5,316.88,"Star"],[8547,220.28,"High Value"],[8540.91,230.84,"High Value"],[8500,1349.21,"Star"],[8500,71.24,"High Value"],[8422.05,160.05,"High Value"],[8300,123.35,"High Value"],[8257,162.06,"High Value"],[8220.16,228.53,"High Value"],[8185.74,203.63,"High Value"],[8002.87,366.77,"Star"],[8000,113.19,"High Value"],[7951,214.25,"High Value"],[7753.86,175.82,"High Value"],[7627.5,233.26,"High Value"],[7500,428.57,"Star"],[7500,1875,"Star"],[7500,95.37,"High Value"],[7500,241.94,"High Value"],[7500,139.02,"High Value"],[7293.5,203.22,"High Value"],[7159.3,241.7,"High Value"],[7143,267.33,"Star"],[7000,259.84,"High Value"],[7000,1489.36,"Star"],[6962.5,386.81,"Star"],[6775.9,253.3,"High Value"],[6746.03,667.92,"Star"],[6678.1,245.25,"High Value"],[6653.25,118.91,"High Value"],[6633.25,73.04,"High Value"],[6532.5,197.95,"High Value"],[6523.65,276.43,"Star"],[6497.5,169.82,"High Value"],[6396.2,276.06,"Star"],[6282.5,343.31,"Star"],[6272.5,133.6,"High Value"],[6237,250.99,"High Value"],[6095.1,135.42,"High Value"],[6034.7,153.95,"Standard"],[6000,218.98,"Standard"],[6000,1052.63,"Efficient"],[5951.75,192.55,"Standard"],[5947.5,233.51,"Standard"],[5930,156.05,"Standard"],[5909.6,248.3,"Standard"],[5900,182.89,"Standard"],[5837.5,199.1,"Standard"],[5745.5,174.58,"Standard"],[5738.5,195.19,"Standard"],[5683.67,144.62,"Standard"],[5587.19,139.26,"Standard"],[5500,94.13,"Standard"],[5500,129.5,"Standard"],[5500,150.27,"Standard"],[5499.25,139.19,"Standard"],[5464.5,272.82,"Efficient"],[5455.5,111.5,"Standard"],[5385,353.35,"Efficient"],[5115,306.84,"Efficient"],[5112,294.13,"Efficient"],[5000,119.9,"Standard"],[5000,515.46,"Efficient"],[5000,116.28,"Standard"],[5000,113.69,"Standard"],[5000,126.49,"Standard"],[5000,128.07,"Standard"],[5000,129.13,"Standard"],[5000,129.87,"Standard"],[5000,134.16,"Standard"],[5000,137.93,"Standard"],[5000,106.29,"Standard"],[5000,102.21,"Standard"],[5000,167.22,"Standard"],[5000,98.66,"Standard"],[5000,247.52,"Standard"],[5000,247.52,"Standard"],[5000,84.89,"Standard"],[5000,190.04,"Standard"],[5000,193.05,"Standard"],[5000,193.27,"Standard"],[5000,80.5,"Standard"],[5000,238.21,"Standard"],[5000,233.64,"Standard"],[5000,63,"Standard"],[5000,61.58,"Standard"],[5000,55.8,"Standard"],[4918.5,415.41,"Efficient"],[4887.18,220.14,"Standard"],[4820,233.75,"Standard"],[4750.5,235.52,"Standard"],[4750.2,165.51,"Standard"],[4645,603.25,"Efficient"],[4589,324.54,"Efficient"],[4542.5,237.58,"Standard"],[4500,90.36,"Standard"],[4500,291.45,"Efficient"],[4465,33.53,"Standard"],[4400.05,205.61,"Standard"],[4149.5,187.25,"Standard"],[4122.5,209.26,"Standard"],[4072.2,236.76,"Standard"],[4064,164.4,"Standard"],[4061.5,343.03,"Efficient"],[4000,303.72,"Efficient"],[4000,327.87,"Efficient"],[4000,96.62,"Standard"],[4000,151.98,"Standard"],[3976.9,217.32,"Standard"],[3956,320.06,"Efficient"],[3947,81.15,"Standard"],[3886,322.76,"Efficient"],[3825,231.82,"Standard"],[3730.77,291.47,"Efficient"],[3690,206.72,"Standard"],[3685,361.98,"Efficient"],[3667,256.25,"Standard"],[3643.6,112.18,"Standard"],[3577.5,301.39,"Efficient"],[3568,191.62,"Standard"],[3556.4,267.4,"Efficient"],[3533,347.05,"Efficient"],[3500.75,316.52,"Efficient"],[3500,74.42,"Standard"],[3500,20.75,"Standard"],[3500,278.44,"Efficient"],[3500,214.07,"Standard"],[3500,252.89,"Standard"],[3500,80.98,"Standard"],[3500,114.98,"Standard"],[3500,253.81,"Standard"],[3500,171.15,"Standard"],[3500,148.12,"Standard"],[3500,864.2,"Efficient"],[3500,225.08,"Standard"],[3498.6,267.07,"Efficient"],[3417.8,279.23,"Efficient"],[3408,211.94,"Standard"],[3400,523.08,"Efficient"],[3391.5,224.31,"Standard"],[3348,185.07,"Standard"],[3324.78,245.73,"Standard"],[3317.5,298.34,"Efficient"],[3293.5,211.12,"Standard"],[3200,220.08,"Standard"],[3173,245.78,"Standard"],[3049.5,227.74,"Standard"],[3049,441.88,"Efficient"],[3025,275,"Efficient"],[3010,153.18,"Standard"],[3000,38.94,"Standard"],[3000,151.52,"Standard"],[2998,242.95,"Standard"],[2997,243.66,"Standard"],[2897,295.61,"Efficient"],[2895,334.68,"Efficient"],[2843.3,249.41,"Standard"],[2839.5,277.57,"Efficient"],[2825,324.71,"Efficient"],[2800,118.64,"Standard"],[2785,284.18,"Efficient"],[2750,295.7,"Efficient"],[2740.5,309.31,"Efficient"],[2710,304.49,"Efficient"],[2702.45,285.37,"Efficient"],[2700,32.06,"Standard"],[2680,291.3,"Efficient"],[2675,242.74,"Standard"],[2661.5,324.97,"Efficient"],[2618.5,256.46,"Standard"],[2572.5,282.07,"Efficient"],[2555,250.49,"Standard"],[2545,446.49,"Efficient"],[2500,510.2,"Efficient"],[2500,316.46,"Efficient"],[2500,403.23,"Efficient"],[2500,438.6,"Efficient"],[2500,438.6,"Efficient"],[2500,438.6,"Efficient"],[2500,230.2,"Standard"],[2500,154.32,"Standard"],[2500,182.22,"Standard"],[2500,144.93,"Standard"],[2500,256.67,"Standard"],[2500,462.96,"Efficient"],[2500,43.29,"Standard"],[2500,223.21,"Standard"],[2500,471.7,"Efficient"],[2500,274.73,"Efficient"],[2500,220.85,"Standard"],[2500,581.4,"Efficient"],[2500,9.71,"Standard"],[2500,123.46,"Standard"],[2500,390.63,"Efficient"],[2500,115.74,"Standard"],[2475,252.55,"Standard"],[2468,296.63,"Efficient"],[2464,241.33,"Standard"],[2449.5,268.59,"Efficient"],[2432.4,152.79,"Standard"],[2390,222.95,"Standard"],[2388,326.23,"Efficient"],[2371.1,116.23,"Standard"],[2313,292.05,"Efficient"],[2281.11,88.35,"Standard"],[2280,330.43,"Efficient"],[2265,266.47,"Efficient"],[2250,218.45,"Standard"],[2240,355.56,"Efficient"],[2240,263.53,"Efficient"],[2200,231.58,"Standard"],[2175,401.29,"Efficient"],[2165,186.64,"Standard"],[2150,294.92,"Efficient"],[2125,461.96,"Efficient"],[2115,160.23,"Standard"],[2110,314.93,"Efficient"],[2092,445.11,"Efficient"],[2084.1,239.55,"Standard"],[2080,226.09,"Standard"],[2050,301.47,"Efficient"],[2040,226.67,"Standard"],[2040,275.68,"Efficient"],[2035,193.81,"Standard"],[2021.6,71.18,"Standard"],[2002.5,239.82,"Standard"],[2000,224.47,"Standard"],[2000,384.62,"Efficient"],[2000,56.69,"Standard"],[2000,392.16,"Efficient"],[2000,327.87,"Efficient"],[2000,181.82,"Standard"],[2000,256.41,"Standard"],[2000,75.16,"Standard"],[2000,377.36,"Efficient"],[2000,571.43,"Efficient"],[1995,167.65,"Standard"],[1995,343.97,"Efficient"],[1986.96,166.27,"Standard"],[1970,225.92,"Standard"],[1946,350.63,"Efficient"],[1932,327.46,"Efficient"],[1929.5,132.16,"Standard"],[1905,244.23,"Standard"],[1875.5,279.09,"Efficient"],[1870,322.41,"Efficient"],[1835,300.82,"Efficient"],[1832,253.04,"Standard"],[1830,139.69,"Standard"],[1810,402.22,"Efficient"],[1795,237.75,"Standard"],[1790,255.71,"Standard"],[1783,296.18,"Efficient"],[1770,198.88,"Standard"],[1770,226.92,"Standard"],[1770,281.85,"Efficient"],[1770,182.47,"Standard"],[1770,280.95,"Efficient"],[1770,192.39,"Standard"],[1770,242.47,"Standard"],[1765,311.84,"Efficient"],[1763.8,217.75,"Standard"],[1750.5,313.15,"Efficient"],[1750,500,"Efficient"],[1750,460.53,"Efficient"],[1750,208.33,"Standard"],[1747.5,319.47,"Efficient"],[1742,111.67,"Standard"],[1740,294.92,"Efficient"],[1740,322.22,"Efficient"],[1740,245.07,"Standard"],[1740,527.27,"Efficient"],[1730,192.87,"Standard"],[1721.5,178.02,"Standard"],[1715,142.44,"Standard"],[1680,218.18,"Standard"],[1673,334.6,"Efficient"],[1673,314.47,"Efficient"],[1647.5,249.62,"Standard"],[1640,321.57,"Efficient"],[1635,380.23,"Efficient"],[1635,206.96,"Standard"],[1620,234.78,"Standard"],[1618,311.15,"Efficient"],[1600,9.06,"Standard"],[1590,311.76,"Efficient"],[1587.5,198.44,"Standard"],[1575,242.31,"Standard"],[1575,167.2,"Standard"],[1570,193.35,"Standard"],[1565,37.51,"Standard"],[1526,231.21,"Standard"],[1500,13,"Standard"],[1500,227.27,"Standard"],[1500,227.27,"Standard"],[1500,225.23,"Standard"],[1500,230.77,"Standard"],[1500,217.39,"Standard"],[1500,217.39,"Standard"],[1500,216.76,"Standard"],[1500,312.5,"Efficient"],[1500,322.58,"Efficient"],[1500,233.64,"Standard"],[1500,324.68,"Efficient"],[1500,235.48,"Standard"],[1500,202.7,"Standard"],[1500,339.37,"Efficient"],[1500,241.94,"Standard"],[1500,348.84,"Efficient"],[1500,348.84,"Efficient"],[1500,194.81,"Standard"],[1500,194.81,"Standard"],[1500,348.84,"Efficient"],[1500,352.11,"Efficient"],[1500,191.82,"Standard"],[1500,357.14,"Efficient"],[1500,189.87,"Standard"],[1500,357.14,"Efficient"],[1500,187.5,"Standard"],[1500,375,"Efficient"],[1500,182.93,"Standard"],[1500,182.7,"Standard"],[1500,180.72,"Standard"],[1500,178.78,"Standard"],[1500,384.62,"Efficient"],[1500,176.47,"Standard"],[1500,303.03,"Efficient"],[1500,394.74,"Efficient"],[1500,170.45,"Standard"],[1500,400,"Efficient"],[1500,168.54,"Standard"],[1500,166.67,"Standard"],[1500,164.84,"Standard"],[1500,164.84,"Standard"],[1500,434.78,"Efficient"],[1500,159.57,"Standard"],[1500,155.93,"Standard"],[1500,154.64,"Standard"],[1500,253.81,"Standard"],[1500,446.43,"Efficient"],[1500,254.24,"Standard"],[1500,149.4,"Standard"],[1500,144.37,"Standard"],[1500,139.28,"Standard"],[1500,255.54,"Standard"],[1500,454.55,"Efficient"],[1500,135.87,"Standard"],[1500,454.55,"Efficient"],[1500,461.54,"Efficient"],[1500,129.87,"Standard"],[1500,261.32,"Efficient"],[1500,262.24,"Efficient"],[1500,652.17,"Efficient"],[1500,106.61,"Standard"],[1500,681.82,"Efficient"],[1500,681.82,"Efficient"],[1500,267.86,"Efficient"],[1500,810.81,"Efficient"],[1500,94.34,"Standard"],[1500,288.46,"Efficient"],[1500,75.38,"Standard"],[1500,75.19,"Standard"],[1500,63.24,"Standard"],[1500,286.26,"Efficient"],[1500,285.71,"Efficient"],[1500,39.82,"Standard"],[1500,38.13,"Standard"],[1500,32.15,"Standard"],[1500,25.99,"Standard"],[1500,21.34,"Standard"],[1500,283.02,"Efficient"],[1500,19.17,"Standard"],[1500,2500,"Efficient"],[1500,12.85,"Standard"],[1499,59.11,"Standard"],[1497.5,139.69,"Standard"],[1495,272.81,"Efficient"],[1481.5,284.9,"Efficient"],[1480,255.17,"Standard"],[1470,245,"Standard"],[1462.5,317.93,"Efficient"],[1450,148.72,"Standard"],[1440,261.82,"Efficient"],[1418,320.81,"Efficient"],[1412.5,371.71,"Efficient"],[1395,199.57,"Standard"],[1366,329.95,"Efficient"],[1358.75,262.81,"Efficient"],[1350,313.95,"Efficient"],[1350,166.67,"Standard"],[1348,177.37,"Standard"],[1345,260.15,"Standard"],[1340,231.03,"Standard"],[1335,121.14,"Standard"],[1335,205.38,"Standard"],[1333.25,182.64,"Standard"],[1330,266,"Efficient"],[1330,225.42,"Standard"],[1325,308.14,"Efficient"],[1320,227.59,"Standard"],[1320,203.08,"Standard"],[1310,247.17,"Standard"],[1305,150,"Standard"],[1295,304.71,"Efficient"],[1275,310.98,"Efficient"],[1270,264.58,"Efficient"],[1270,226.79,"Standard"],[1269.5,215.9,"Standard"],[1250,181.16,"Standard"],[1230,223.64,"Standard"],[1205,290.36,"Efficient"],[1200,292.68,"Efficient"],[1200,177.78,"Standard"],[1200,187.5,"Standard"],[1200,187.5,"Standard"],[1200,244.9,"Standard"],[1200,199.34,"Standard"],[1200,218.18,"Standard"],[1200,203.39,"Standard"],[1200,230.77,"Standard"],[1200,160,"Standard"],[1200,250,"Standard"],[1200,226.42,"Standard"],[1200,93.46,"Standard"],[1182.5,241.33,"Standard"],[1150,222.44,"Standard"],[1142.3,228.46,"Standard"],[1135,153.38,"Standard"],[1132.5,290.38,"Efficient"],[1120,180.65,"Standard"],[1100,186.44,"Standard"],[1100,169.23,"Standard"],[1080,257.14,"Standard"],[1070,231.6,"Standard"],[1065,287.84,"Efficient"],[1065,234.58,"Standard"],[1061.2,184.56,"Standard"],[1015,253.75,"Standard"],[1008.64,7.17,"Standard"],[1000,140.45,"Standard"],[1000,208.33,"Standard"],[1000,294.12,"Efficient"],[1000,141.84,"Standard"],[1000,263.16,"Efficient"],[1000,144.93,"Standard"],[1000,222.22,"Standard"],[1000,113.64,"Standard"],[1000,242.72,"Standard"],[1000,16.82,"Standard"],[1000,153.85,"Standard"],[1000,256.41,"Standard"],[1000,222.22,"Standard"],[1000,277.78,"Efficient"],[1000,333.33,"Efficient"],[1000,277.78,"Efficient"],[1000,196.08,"Standard"],[1000,194.17,"Standard"],[1000,222.22,"Standard"],[1000,169.49,"Standard"],[1000,215.05,"Standard"],[1000,166.67,"Standard"],[1000,370.37,"Efficient"],[997.5,184.72,"Standard"],[992.5,215.76,"Standard"],[977.7,139.67,"Standard"],[972.5,303.91,"Efficient"],[937.5,347.22,"Efficient"],[936.5,253.11,"Standard"],[930,226.83,"Standard"],[929,130.85,"Standard"],[922.5,179.13,"Standard"],[920,296.77,"Efficient"],[910,293.55,"Efficient"],[905,174.04,"Standard"],[900,147.54,"Standard"],[872.5,311.61,"Efficient"],[864,6.77,"Standard"],[862.5,287.5,"Efficient"],[855,231.08,"Standard"],[850,314.81,"Efficient"],[850,123.19,"Standard"],[827,172.29,"Standard"],[815,307.55,"Efficient"],[800,200,"Standard"],[800,145.45,"Standard"],[800,320,"Efficient"],[795,149.44,"Standard"],[780,354.55,"Efficient"],[780,110.8,"Standard"],[775.5,239.35,"Standard"],[774,342.48,"Efficient"],[770,265.52,"Efficient"],[770,385,"Efficient"],[769.5,240.47,"Standard"],[765,246.77,"Standard"],[765,204,"Standard"],[765,144.34,"Standard"],[765,253.31,"Standard"],[750,133.93,"Standard"],[750,288.46,"Efficient"],[750,289.58,"Efficient"],[750,288.46,"Efficient"],[750,158.9,"Standard"],[750,159.57,"Standard"],[750,100,"Standard"],[750,750,"Efficient"],[750,227.27,"Standard"],[750,227.27,"Standard"],[750,154,"Standard"],[750,113.64,"Standard"],[750,153.06,"Standard"],[750,219.3,"Standard"],[750,300,"Efficient"],[750,300,"Efficient"],[750,120.97,"Standard"],[750,122.95,"Standard"],[750,122.95,"Standard"],[750,187.5,"Standard"],[750,258.62,"Standard"],[750,127.12,"Standard"],[750,258.62,"Standard"],[750,258.62,"Standard"],[750,375,"Efficient"],[750,208.33,"Standard"],[750,133.69,"Standard"],[750,288.46,"Efficient"],[750,208.33,"Standard"],[750,208.33,"Standard"],[750,136.36,"Standard"],[750,306.12,"Efficient"],[750,138.89,"Standard"],[750,194.81,"Standard"],[750,194.81,"Standard"],[750,140.98,"Standard"],[750,394.74,"Efficient"],[750,141.51,"Standard"],[750,170.45,"Standard"],[750,170.45,"Standard"],[750,141.51,"Standard"],[750,250,"Standard"],[750,169.68,"Standard"],[749.33,32.02,"Standard"],[744.5,254.97,"Standard"],[742.5,184.7,"Standard"],[739.5,201.5,"Standard"],[728,300.83,"Efficient"],[725,250,"Standard"],[707,196.39,"Standard"],[700,128.44,"Standard"],[680,170,"Standard"],[661,324.02,"Efficient"],[650,196.97,"Standard"],[649,202.81,"Standard"],[635,302.38,"Efficient"],[619.05,108.23,"Standard"],[582,195.96,"Standard"],[577.5,108.96,"Standard"],[560,114.29,"Standard"],[500,204.92,"Standard"],[500,192.31,"Standard"],[500,74.4,"Standard"],[500,208.33,"Standard"],[500,208.33,"Standard"],[500,357.14,"Efficient"],[500,190.84,"Standard"],[500,181.82,"Standard"],[500,111.11,"Standard"],[500,101.01,"Standard"],[500,142.86,"Standard"],[500,156.25,"Standard"],[500,135.14,"Standard"],[500,215.52,"Standard"],[470,313.33,"Efficient"],[425,223.68,"Standard"],[425,8.47,"Standard"],[402.5,27.44,"Standard"],[400,153.85,"Standard"],[392,321.31,"Efficient"],[367.5,237.1,"Standard"],[344,181.05,"Standard"],[342,180,"Standard"],[324,68.94,"Standard"],[230,230,"Standard"],[200,133.33,"Standard"],[195,243.75,"Standard"],[133.95,11.24,"Standard"],[133,83.13,"Standard"],[125,46.3,"Standard"],[123,130.85,"Standard"],[115,95.83,"Standard"],[110,183.33,"Standard"],[99.5,85.04,"Standard"],[84,76.36,"Standard"],[70,64.81,"Standard"],[35,35,"Standard"]];
  const points = RAW.map(([rev, rph, tier]) => ({ rev, rph, tier }));

  if (chartInst) { chartInst.destroy(); chartInst = null; }

  const datasets = ORDER.map(tier => ({
    label: tier,
    data:  points.filter(d => d.tier === tier).map(d => ({ x: d.rph, y: d.rev })),
    backgroundColor: COLORS[tier] + (tier === 'Standard' ? 'aa' : 'dd'),
    pointRadius:     tier === 'Standard' ? 3 : 3,
    pointHoverRadius: 7
  }));

  // Compute actual data bounds so axes cover the full range
  const allRph = points.map(d => d.rph);
  const allRev = points.map(d => d.rev);
  const xMin = Math.max(1,  Math.floor(Math.min(...allRph) * 0.8));
  const xMax = Math.ceil(Math.max(...allRph) * 1.1);
  const yMin = Math.max(1,  Math.floor(Math.min(...allRev) * 0.8));
  const yMax = Math.ceil(Math.max(...allRev) * 1.1);

  // Threshold values (75th-percentile cutoffs used for tier classification)
  const RPH_THRESHOLD = 261;
  const REV_THRESHOLD = 6095;

  const thresholdPlugin = {
    id: 'thresholdLines',
    afterDraw(chart) {
      const { ctx: c, chartArea: { left, right, top, bottom }, scales } = chart;
      c.save();
      c.strokeStyle = 'rgba(192,148,76,0.65)';
      c.lineWidth = 1.5;
      c.setLineDash([6, 4]);

      const xPx = scales.x.getPixelForValue(RPH_THRESHOLD);
      if (xPx >= left && xPx <= right) {
        c.beginPath(); c.moveTo(xPx, top); c.lineTo(xPx, bottom); c.stroke();
      }
      const yPx = scales.y.getPixelForValue(REV_THRESHOLD);
      if (yPx >= top && yPx <= bottom) {
        c.beginPath(); c.moveTo(left, yPx); c.lineTo(right, yPx); c.stroke();
      }

      c.setLineDash([]);
      c.fillStyle = '#c0944c';
      c.font = 'bold 11px Roboto, sans-serif';
      if (xPx >= left && xPx <= right) {
        c.textAlign = 'left';
        c.fillText('$261/hr (top 25%)', xPx + 4, bottom - 10);
      }
      if (yPx >= top && yPx <= bottom) {
        c.textAlign = 'left';
        c.fillText('$6,095 (top 25%)', left + 4, yPx - 5);
      }
      c.restore();
    }
  };

  const ctx = document.getElementById('main-chart').getContext('2d');
  chartInst = new Chart(ctx, {
    type: 'scatter',
    data: { datasets },
    plugins: [thresholdPlugin],
    options: {
      responsive: true,
      aspectRatio: 1,
      animation: { duration: 400 },
      plugins: {
        legend: { labels: { color: '#ccc', font: { size: LEGEND_SIZE }, usePointStyle: true } },
        title: {
          display: true,
          text: 'Net Revenue vs. Revenue per Hour by Client Tier',
          color: '#ddd', font: { size: 16 }
        },
        tooltip: {
          callbacks: {
            label: item => [
              ` ${item.dataset.label}`,
              ` Revenue: $${Math.round(item.raw.y).toLocaleString()}`,
              ` Efficiency: $${Math.round(item.raw.x).toLocaleString()}/hr`
            ]
          }
        }
      },
      scales: {
        x: {
          type: 'logarithmic',
          min: xMin,
          max: xMax,
          ticks: {
            color: '#aaa', font: { size: 12 },
            callback: v => [10, 50, 100, 500, 1000, 5000].includes(v) ? '$' + v : ''
          },
          grid:  { color: 'rgba(255,255,255,.09)' },
          title: { display: true, text: 'Revenue per Hour ($/hr, log scale)', color: '#aaa', font: { size: 13 } }
        },
        y: {
          type: 'logarithmic',
          min: yMin,
          max: yMax,
          ticks: {
            color: '#aaa', font: { size: 12 },
            callback: v => [500, 1000, 5000, 10000, 50000, 100000, 200000].includes(v)
              ? '$' + (v >= 1000 ? (v / 1000).toFixed(0) + 'K' : v) : ''
          },
          grid:  { color: 'rgba(255,255,255,.09)' },
          title: { display: true, text: 'Net Revenue ($, log scale)', color: '#aaa', font: { size: 13 } }
        }
      }
    }
  });
}

// ── § 4.1 Practice Area revenue chart ────────────────────────────────────
function renderPracticeRevenueChart() {
  if (typeof Chart === 'undefined') { showChartUnavailable(); return; }

  const AREA_COLORS = {
    'Civil Litigation': '#6bdb7acc',
    'Negotiations':     '#637defcc',
    'Drafting':         '#f08f35cc',
    'Estate Planning':  '#d41f73cc',
    'Case Review':      '#d67dffcc',
    'Probate':          '#d4d738cc',
    'Other':            '#888888cc'
  };

  // Sorted ascending by totalRev so highest bar is at top
  const rows = [
    { label: 'Drafting',         totalRev:    3975012, clients: 118 },
    { label: 'Estate Planning',  totalRev:    4322409, clients: 148 },
    { label: 'Case Review',      totalRev:   51135511, clients:  65 },
    { label: 'Negotiations',     totalRev:   91247735, clients: 213 },
    { label: 'Probate',          totalRev:  217716185, clients:  73 },
    { label: 'Other',            totalRev:  309179344, clients: 142 },
    { label: 'Civil Litigation', totalRev: 1977326682, clients: 321 }
  ];

  const ctx = document.getElementById('main-chart').getContext('2d');
  chartInst = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: rows.map(r => r.label),
      datasets: rows.map((r, i) => ({
        label: r.label,
        data:  rows.map((_, j) => j === i ? r.totalRev : null),
        backgroundColor: AREA_COLORS[r.label] || '#888888cc',
        borderRadius: 3,
        skipNull: true
      }))
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      aspectRatio: 1,
      plugins: {
        legend: { labels: { color: '#ccc', font: { size: LEGEND_SIZE }, boxWidth: LEGEND_BOX } },
        title: { display: true, text: 'Total Revenue by Practice Area', color: '#ddd', font: { size: 16 } },
        tooltip: {
          callbacks: {
            label: item => {
              const r = rows[item.dataIndex];
              const rev = (r.totalRev / 1e6).toFixed(2);
              return [` $${rev}M total revenue`, ` ${r.clients} clients`];
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#aaa', font: { size: 12 }, callback: v => '$' + (v / 1e6).toFixed(0) + 'M' },
          grid:  { color: 'rgba(255,255,255,.07)' },
          title: { display: true, text: 'Total Revenue (USD)', color: '#888', font: { size: 13 } }
        },
        y: { ticks: { color: '#ccc', font: { size: 12 } }, grid: { color: 'rgba(255,255,255,.04)' } }
      }
    }
  });
}

// ── § 4.1 Practice Area efficiency chart ─────────────────────────────────────────────
function renderPracticeAreaChart() {
  if (typeof Chart === 'undefined') { showChartUnavailable(); return; }

  // Sorted ascending by rev/hr so highest appears at top of horizontal bar chart
  const rows = [
    { label: 'Negotiations',   revHr: 3179, clients: 213, totalRev:  91247735 },
    { label: 'Estate Planning', revHr: 3545, clients: 148, totalRev:   4322409 },
    { label: 'Probate',        revHr: 3584, clients:  73, totalRev: 217716185 },
    { label: 'Other',          revHr: 3707, clients: 142, totalRev: 309179344 },
    { label: 'Drafting',       revHr: 3769, clients: 118, totalRev:   3975012 },
    { label: 'Civil Litigation', revHr: 4035, clients: 321, totalRev: 1977326682 },
    { label: 'Case Review',    revHr: 4869, clients:  65, totalRev:  51135511 }
  ];

  const AREA_COLORS = {
    'Civil Litigation': '#6bdb7aaa',
    'Negotiations':     '#637defaa',
    'Drafting':         '#f08f35aa',
    'Estate Planning':  '#d41f73aa',
    'Case Review':      '#d67dffaa',
    'Probate':          '#d4d738aa',
    'Other':            '#888888aa'
  };
  const ctx = document.getElementById('main-chart').getContext('2d');
  chartInst = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: rows.map(r => r.label),
      datasets: rows.map((r, i) => ({
        label: r.label,
        data:  rows.map((_, j) => j === i ? r.revHr : null),
        backgroundColor: AREA_COLORS[r.label] || '#888888aa',
        borderRadius: 3,
        skipNull: true
      }))
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      aspectRatio: 1,
      plugins: {
        legend: { labels: { color: '#ccc', font: { size: LEGEND_SIZE }, boxWidth: LEGEND_BOX } },
        title: { display: true, text: 'Revenue per Hour by Practice Area', color: '#ddd', font: { size: 16 } },
        tooltip: {
          callbacks: {
            label: item => {
              const r = rows[item.datasetIndex];
              const rev = (r.totalRev / 1e6).toFixed(2);
              return [
                ` $${item.raw.toLocaleString()}/hr`,
                ` ${r.clients} clients`,
                ` $${rev}M total revenue`
              ];
            }
          }
        }
      },
      scales: {
        x: { ticks: { color: '#aaa', font: { size: 12 }, callback: v => '$' + v.toLocaleString() },
             grid: { color: 'rgba(255,255,255,.07)' },
             title: { display: true, text: 'Revenue per Hour ($)', color: '#888', font: { size: 13 } } },
        y: { ticks: { color: '#ccc', font: { size: 12 } }, grid: { color: 'rgba(255,255,255,.04)' } }
      }
    }
  });
}

// ── § 4.7 Originating Attorney chart ─────────────────────────────────────
function renderAttorneyOrigChart() {
  if (typeof Chart === 'undefined') { showChartUnavailable(); return; }

  // Sorted ascending by total_revenue_generated (highest at top)
  const rows = [
    { label: 'Attorney #13', rev: 765,       clients: 1,   matters: 1 },
    { label: 'Attorney #17', rev: 29997,     clients: 2,   matters: 2 },
    { label: 'Attorney #7',  rev: 38446,     clients: 9,   matters: 10 },
    { label: 'Attorney #19', rev: 52693,     clients: 6,   matters: 6 },
    { label: 'Attorney #12', rev: 66973,     clients: 7,   matters: 7 },
    { label: 'Attorney #14', rev: 131591,    clients: 21,  matters: 21 },
    { label: 'Attorney #10', rev: 280422,    clients: 99,  matters: 105 },
    { label: 'Attorney #5',  rev: 350864,    clients: 84,  matters: 88 },
    { label: 'Attorney #4',  rev: 3774105,   clients: 389, matters: 431 },
    { label: 'Attorney #2',  rev: 4830916,   clients: 733, matters: 767 }
  ];

  const datasets = [
    { label: '≥ 100 clients', backgroundColor: 'rgba(192,148,76,.9)',
      data: rows.map(r => r.clients >= 100 ? r.rev : null), borderRadius: 3, skipNull: true },
    { label: '20–99 clients',  backgroundColor: 'rgba(58,125,85,.85)',
      data: rows.map(r => r.clients >= 20 && r.clients < 100 ? r.rev : null), borderRadius: 3, skipNull: true },
    { label: '< 20 clients',   backgroundColor: 'rgba(160,155,145,.7)',
      data: rows.map(r => r.clients < 20 ? r.rev : null), borderRadius: 3, skipNull: true }
  ];

  const ctx = document.getElementById('main-chart').getContext('2d');
  chartInst = new Chart(ctx, {
    type: 'bar',
    data: { labels: rows.map(r => r.label), datasets },
    options: {
      indexAxis: 'y',
      responsive: true,
      aspectRatio: 1,
      plugins: {
        legend: { labels: { color: '#ccc', font: { size: LEGEND_SIZE }, boxWidth: LEGEND_BOX } },
        title: { display: true, text: 'Total Revenue Originated by Attorney', color: '#ddd', font: { size: 16 } },
        tooltip: {
          callbacks: {
            label: item => {
              const r = rows[item.dataIndex];
              return [
                ` $${item.raw.toLocaleString()}`,
                ` ${r.clients} clients`,
                ` ${r.matters} matters`
              ];
            }
          }
        }
      },
      scales: {
        x: { ticks: { color: '#aaa', font: { size: 12 }, callback: v => '$' + (v / 1e6).toFixed(1) + 'M' },
             grid: { color: 'rgba(255,255,255,.07)' },
             title: { display: true, text: 'Total Revenue ($)', color: '#888', font: { size: 13 } } },
        y: { ticks: { color: '#ccc', font: { size: 12 }, autoSkip: false }, grid: { color: 'rgba(255,255,255,.04)' } }
      }
    }
  });
}

// ── § 4.7 Responsible Attorney chart ──────────────────────────────────────
function renderAttorneyRespChart() {
  if (typeof Chart === 'undefined') { showChartUnavailable(); return; }

  // Sorted ascending by revenue_per_hour (highest at top)
  const rows = [
    { label: 'Attorney #5',  revHr: 2232, matters: 124, totalRev: 29894187 },
    { label: 'Attorney #14', revHr: 2556, matters: 27,  totalRev: 29149723 },
    { label: 'Attorney #9',  revHr: 2602, matters: 2,   totalRev: 35781 },
    { label: 'Attorney #6',  revHr: 2615, matters: 1,   totalRev: 17000 },
    { label: 'Attorney #17', revHr: 2791, matters: 7,   totalRev: 1707686 },
    { label: 'Attorney #16', revHr: 3283, matters: 5,   totalRev: 117850 },
    { label: 'Attorney #12', revHr: 3312, matters: 44,  totalRev: 29146853 },
    { label: 'Attorney #10', revHr: 3497, matters: 126, totalRev: 45645000 },
    { label: 'Attorney #11', revHr: 3675, matters: 13,  totalRev: 331940 },
    { label: 'Attorney #4',  revHr: 3769, matters: 327, totalRev: 1049374936 },
    { label: 'Attorney #7',  revHr: 4350, matters: 132, totalRev: 856068465 },
    { label: 'Attorney #2',  revHr: 4384, matters: 606, totalRev: 1103014043 },
    { label: 'Attorney #19', revHr: 4485, matters: 4,   totalRev: 5003366 },
    { label: 'Attorney #18', revHr: 5592, matters: 5,   totalRev: 464142 }
  ];

  const datasets = [
    { label: '≥ 100 matters', backgroundColor: 'rgba(192,148,76,.9)',
      data: rows.map(r => r.matters >= 100 ? r.revHr : null), borderRadius: 3, skipNull: true },
    { label: '20–99 matters',  backgroundColor: 'rgba(58,125,85,.85)',
      data: rows.map(r => r.matters >= 20 && r.matters < 100 ? r.revHr : null), borderRadius: 3, skipNull: true },
    { label: '< 20 matters',   backgroundColor: 'rgba(160,155,145,.7)',
      data: rows.map(r => r.matters < 20 ? r.revHr : null), borderRadius: 3, skipNull: true }
  ];

  const ctx = document.getElementById('main-chart').getContext('2d');
  chartInst = new Chart(ctx, {
    type: 'bar',
    data: { labels: rows.map(r => r.label), datasets },
    options: {
      indexAxis: 'y',
      responsive: true,
      aspectRatio: 1,
      plugins: {
        legend: { labels: { color: '#ccc', font: { size: LEGEND_SIZE }, boxWidth: LEGEND_BOX } },
        title: { display: true, text: 'Revenue per Hour by Responsible Attorney', color: '#ddd', font: { size: 16 } },
        tooltip: {
          callbacks: {
            label: item => {
              const r = rows[item.dataIndex];
              const rev = (r.totalRev / 1e6).toFixed(2);
              return [
                ` $${item.raw.toLocaleString()}/hr`,
                ` ${r.matters} matters`,
                ` $${rev}M total revenue`
              ];
            }
          }
        }
      },
      scales: {
        x: { ticks: { color: '#aaa', font: { size: 12 }, callback: v => '$' + v.toLocaleString() },
             grid: { color: 'rgba(255,255,255,.07)' },
             title: { display: true, text: 'Revenue per Hour ($)', color: '#888', font: { size: 13 } } },
        y: { ticks: { color: '#ccc', font: { size: 12 }, autoSkip: false }, grid: { color: 'rgba(255,255,255,.04)' } }
      }
    }
  });
}

// ── § 4.6 Retainer Type chart ─────────────────────────────────────────────
// ── § 4.6 Retainer type color palette ────────────────────────────────────
const RETAINER_COLORS = {
  'Flat Fee':            '#cc477ccc',
  'Hourly - Bonus':      '#1e6ce1cc',
  'Hourly - No Bonus':   '#50cabecc',
  'Hybrid Contingency':  '#e7e27acc',
  'Probate':             '#c585f0cc',
  'Unspecified':         '#888888cc'
};

function renderRetainerChart() {
  if (typeof Chart === 'undefined') { showChartUnavailable(); return; }

  // sorted ascending by revHr
  const rows = [
    { label: 'Hourly - Bonus',     revHr: 3024,  clients: 28,  totalRev: 122000211 },
    { label: 'Probate',            revHr: 3734,  clients: 61,  totalRev: 160218789 },
    { label: 'Hourly - No Bonus',  revHr: 4000,  clients: 680, totalRev: 2251672885 },
    { label: 'Hybrid Contingency', revHr: 4678,  clients: 59,  totalRev: 578805098 },
    { label: 'Flat Fee',           revHr: 4756,  clients: 502, totalRev: 17680649 },
    { label: 'Unspecified',        revHr: 10359, clients: 25,  totalRev: 19703317 }
  ];

  const datasets = rows.map((r, i) => ({
    label: r.label,
    data: rows.map((_, j) => j === i ? r.revHr : null),
    backgroundColor: RETAINER_COLORS[r.label] || '#888888cc',
    borderRadius: 3,
    skipNull: true
  }));

  const ctx = document.getElementById('main-chart').getContext('2d');
  chartInst = new Chart(ctx, {
    type: 'bar',
    data: { labels: rows.map(r => r.label), datasets },
    options: {
      indexAxis: 'y',
      responsive: true,
      aspectRatio: 1,
      plugins: {
        legend: { labels: { color: '#ccc', font: { size: LEGEND_SIZE }, boxWidth: LEGEND_BOX } },
        title: { display: true, text: 'Revenue per Hour by Retainer Type', color: '#ddd', font: { size: 16 } },
        tooltip: {
          callbacks: {
            label: item => {
              const r = rows[item.datasetIndex];
              const rev = (r.totalRev / 1e6).toFixed(1);
              return [
                ` $${item.raw.toLocaleString()}/hr`,
                ` ${r.clients} clients`,
                ` $${rev}M total revenue`
              ];
            }
          }
        }
      },
      scales: {
        x: { ticks: { color: '#aaa', font: { size: 12 }, callback: v => '$' + v.toLocaleString() },
             grid: { color: 'rgba(255,255,255,.07)' },
             title: { display: true, text: 'Revenue per Hour ($)', color: '#888', font: { size: 13 } } },
        y: { ticks: { color: '#ccc', font: { size: 12 } }, grid: { color: 'rgba(255,255,255,.04)' } }
      }
    }
  });
}

// ── § 4.5 Client Language color palette ──────────────────────────────────
const LANG_COLORS = {
  'English':   '#2ea227cc',
  'Spanish':   '#8966d1cc',
  'Cantonese': '#e66101cc'
};

// ── § 4.5 Client Language chart ───────────────────────────────────────────
function renderLanguageChart() {
  if (typeof Chart === 'undefined') { showChartUnavailable(); return; }
  const rows = [
    { label: 'English',   clients: 907, revHr: 4094, totalRev: 2302387510 },
    { label: 'Spanish',   clients: 288, revHr: 4144, totalRev: 668267123 },
    { label: 'Cantonese', clients: 1,   revHr: 2752, totalRev: 703347 }
  ];

  const barDatasets = rows.map((r, i) => ({
    label: r.label,
    data: rows.map((_, j) => j === i ? r.clients : null),
    backgroundColor: LANG_COLORS[r.label] || '#888888cc',
    borderRadius: 4,
    skipNull: true,
    yAxisID: 'y'
  }));

  const lineDataset = {
    label: 'Revenue per Hour ($)',
    data: rows.map(r => r.revHr),
    type: 'line',
    borderColor: 'rgba(192,148,76,.9)',
    backgroundColor: 'rgba(192,148,76,.12)',
    pointRadius: 8,
    pointBackgroundColor: 'rgba(192,148,76,.9)',
    pointBorderColor: '#fff',
    pointBorderWidth: 2,
    tension: 0,
    yAxisID: 'y2'
  };

  const ctx = document.getElementById('main-chart').getContext('2d');
  chartInst = new Chart(ctx, {
    type: 'bar',
    data: { labels: rows.map(r => r.label), datasets: [lineDataset, ...barDatasets] },
    options: {
      responsive: true,
      aspectRatio: 1,
      plugins: {
        legend: { labels: { color: '#ccc', font: { size: LEGEND_SIZE }, boxWidth: LEGEND_BOX } },
        title: { display: true, text: 'Client Language: Volume & Efficiency', color: '#ddd', font: { size: 16 } },
        tooltip: {
          callbacks: {
            afterBody: items => {
              const r = rows[items[0].dataIndex];
              return `Total revenue: $${(r.totalRev / 1e6).toFixed(1)}M`;
            }
          }
        }
      },
      scales: {
        x:  { ticks: { color: '#ccc', font: { size: 12 } }, grid: { color: 'rgba(255,255,255,.05)' } },
        y:  { ticks: { color: '#aaa', font: { size: 12 } }, grid: { color: 'rgba(255,255,255,.07)' },
              title: { display: true, text: 'Client Count', color: '#888', font: { size: 13 } } },
        y2: { position: 'right', min: 0, max: 5500,
              ticks: { color: 'rgba(192,148,76,1)', font: { size: 12 }, callback: v => '$' + v.toLocaleString() },
              grid: { drawOnChartArea: false },
              title: { display: true, text: 'Revenue per Hour ($)', color: 'rgba(192,148,76,1)', font: { size: 13 } } }
      }
    }
  });
}

// ── § 4.4 Acquisition channel color palette ──────────────────────────────
const CHANNEL_COLORS = {
  'Google':           '#ea8424cc',
  'Spanish Google':   '#df505acc',
  'Official Website': '#33a442cc',
  'Referral':         '#ba6abacc',
  'RERM':             '#7cc8e6cc',
  'Yelp':             '#dfc750cc',
  'Others':           '#888888cc'
};

// ── § 4.4 Channel × Tier cross-tab chart ─────────────────────────────────
function renderChannelCrosstabChart() {
  if (typeof Chart === 'undefined') { showChartUnavailable(); return; }

  // Sorted descending by lucrative_rate_pct
  const rows = [
    { label: 'RERM',            total: 4,   lucrative: 3,   rate: 75.0 },
    { label: 'Official Website',total: 12,  lucrative: 6,   rate: 50.0 },
    { label: 'Yelp',            total: 4,   lucrative: 2,   rate: 50.0 },
    { label: 'Referral',        total: 203, lucrative: 88,  rate: 43.3 },
    { label: 'Google',          total: 247, lucrative: 106, rate: 42.9 },
    { label: 'Spanish Google',  total: 79,  lucrative: 26,  rate: 32.9 },
    { label: 'Others',          total: 10,  lucrative: 2,   rate: 20.0 }
  ];

  const lucColors = rows.map(r => CHANNEL_COLORS[r.label] || '#888888cc');
  const stdColors = rows.map(r => (CHANNEL_COLORS[r.label] || '#888888cc').slice(0, 7) + '44');
  const standard  = rows.map(r => r.total - r.lucrative);

  const ctx = document.getElementById('main-chart').getContext('2d');
  chartInst = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: rows.map(r => r.label),
      datasets: [
        {
          label: 'Lucrative Clients',
          data: rows.map(r => r.lucrative),
          backgroundColor: lucColors,
          stack: 'clients',
          borderRadius: 3
        },
        {
          label: 'Standard Clients',
          data: standard,
          backgroundColor: stdColors,
          stack: 'clients',
          borderRadius: 3
        },
        {
          label: 'Lucrative Rate (%)',
          data: rows.map(r => r.rate),
          type: 'line',
          borderColor: '#c0944c',
          backgroundColor: 'rgba(192,148,76,.12)',
          pointRadius: 6,
          pointBackgroundColor: '#c0944c',
          pointBorderColor: '#fff',
          pointBorderWidth: 1.5,
          tension: 0.3,
          yAxisID: 'y2'
        }
      ]
    },
    options: {
      responsive: true,
      aspectRatio: 1,
      plugins: {
        legend: { labels: { color: '#ccc', font: { size: LEGEND_SIZE }, boxWidth: LEGEND_BOX } },
        title: { display: true, text: 'Acquisition Channel × Client Tier', color: '#ddd', font: { size: 16 } },
        tooltip: {
          callbacks: {
            afterBody: items => {
              const r = rows[items[0].dataIndex];
              return `Lucrative rate: ${r.rate}%`;
            }
          }
        }
      },
      scales: {
        x:  { stacked: true, ticks: { color: '#ccc', font: { size: 12 } }, grid: { color: 'rgba(255,255,255,.05)' } },
        y:  { stacked: true, ticks: { color: '#aaa', font: { size: 12 } }, grid: { color: 'rgba(255,255,255,.07)' },
              title: { display: true, text: 'Client Count', color: '#888', font: { size: 13 } } },
        y2: { position: 'right', min: 0, max: 100,
              ticks: { color: '#c0944c', font: { size: 12 }, callback: v => v + '%' },
              grid: { drawOnChartArea: false },
              title: { display: true, text: 'Lucrative Rate (%)', color: '#c0944c', font: { size: 13 } } }
      }
    }
  });
}

// ── § 4.4 Client Acquisition Channel chart ───────────────────────────────
function renderChannelChart() {
  if (typeof Chart === 'undefined') { showChartUnavailable(); return; }

  // sorted ascending by revHr
  const rows = [
    { label: 'Others',          revHr: 2833, clients: 20,  totalRev: 5916125 },
    { label: 'RERM',            revHr: 3504, clients: 5,   totalRev: 7758512 },
    { label: 'Official Website',revHr: 3548, clients: 15,  totalRev: 49653532 },
    { label: 'Google',          revHr: 3572, clients: 273, totalRev: 387842217 },
    { label: 'Spanish Google',  revHr: 3878, clients: 79,  totalRev: 138992258 },
    { label: 'Referral',        revHr: 4258, clients: 259, totalRev: 623236289 }
  ];

  const datasets = rows.map((r, i) => ({
    label: r.label,
    data: rows.map((_, j) => j === i ? r.revHr : null),
    backgroundColor: CHANNEL_COLORS[r.label] || '#888888cc',
    borderRadius: 3,
    skipNull: true
  }));

  const ctx = document.getElementById('main-chart').getContext('2d');
  chartInst = new Chart(ctx, {
    type: 'bar',
    data: { labels: rows.map(r => r.label), datasets },
    options: {
      indexAxis: 'y',
      responsive: true,
      aspectRatio: 1,
      plugins: {
        legend: { labels: { color: '#ccc', font: { size: LEGEND_SIZE }, boxWidth: LEGEND_BOX } },
        title: { display: true, text: 'Revenue per Hour by Acquisition Channel', color: '#ddd', font: { size: 16 } },
        tooltip: {
          callbacks: {
            label: item => {
              const r = rows[item.datasetIndex];
              const rev = (r.totalRev / 1e6).toFixed(1);
              return [
                ` $${item.raw.toLocaleString()}/hr`,
                ` ${r.clients} clients`,
                ` $${rev}M total revenue`
              ];
            }
          }
        }
      },
      scales: {
        x: { ticks: { color: '#aaa', font: { size: 12 }, callback: v => '$' + v.toLocaleString() },
             grid: { color: 'rgba(255,255,255,.07)' },
             title: { display: true, text: 'Revenue per Hour ($)', color: '#888', font: { size: 13 } } },
        y: { ticks: { color: '#ccc', font: { size: 12 } }, grid: { color: 'rgba(255,255,255,.04)' } }
      }
    }
  });
}

// ── § 4.3 Corporate vs Individual chart ──────────────────────────────────
function renderCorpChart() {
  if (typeof Chart === 'undefined') { showChartUnavailable(); return; }
  const ctx = document.getElementById('main-chart').getContext('2d');
  const revs = [2444570735, 12753988];
  const hrs  = [605361, 3383];
  chartInst = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Individual', 'Corporate'],
      datasets: [
        {
          label: 'Individual',
          data: [855, null],
          backgroundColor: '#47c597cc',
          borderRadius: 4,
          yAxisID: 'y'
        },
        {
          label: 'Corporate',
          data: [null, 7],
          backgroundColor: '#7b6df7cc',
          borderRadius: 4,
          yAxisID: 'y'
        },
        {
          label: 'Revenue per Hour ($)',
          data: [4038, 3770],
          type: 'line',
          borderColor: 'rgba(192,148,76,.9)',
          backgroundColor: 'rgba(192,148,76,.15)',
          pointRadius: 8,
          pointBackgroundColor: 'rgba(192,148,76,.9)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          tension: 0,
          yAxisID: 'y2'
        }
      ]
    },
    options: {
      responsive: true,
      aspectRatio: 1,
      plugins: {
        legend: { labels: { color: '#ccc', font: { size: LEGEND_SIZE }, boxWidth: LEGEND_BOX } },
        title: { display: true, text: 'Corporate vs. Individual: Volume & Efficiency', color: '#ddd', font: { size: 16 } },
        tooltip: {
          callbacks: {
            afterBody: items => {
              const i = items[0].dataIndex;
              return [
                `Total revenue: $${(revs[i] / 1e6).toFixed(1)}M`,
                `Total hours:   ${hrs[i].toLocaleString()}`
              ];
            }
          }
        }
      },
      scales: {
        x:  { ticks: { color: '#ccc', font: { size: 12 } }, grid: { color: 'rgba(255,255,255,.05)' } },
        y:  { ticks: { color: '#aaa', font: { size: 12 } }, grid: { color: 'rgba(255,255,255,.07)' },
              title: { display: true, text: 'Client Count', color: '#888', font: { size: 13 } } },
        y2: { position: 'right', min: 0, max: 5500,
              ticks: { color: 'rgba(192,148,76)', font: { size: 12 }, callback: v => '$' + v.toLocaleString() },
              grid: { drawOnChartArea: false },
              title: { display: true, text: 'Revenue per Hour ($)', color: 'rgba(192,148,76)', font: { size: 13 } } }
      }
    }
  });
}

// ── § 4.2 Scope of Representation chart ──────────────────────────────────
function renderScopeRevenueChart() {
  if (typeof Chart === 'undefined') { showChartUnavailable(); return; }

  const SCOPE_COLORS = {
    'Estate Planning':                '#9110dbcc',
    'Flat Fee':                       '#a6c91acc',
    'Full Litigation':                '#5571d7cc',
    'Full Litigation - Sub into Case':'#d65296cc',
    'Limited Scope Litigation':       '#56cf5ccc',
    'Negotiations':                   '#64efe3cc',
    'Other':                          '#888888cc'
  };

  // Sorted ascending by totalRev so highest bar is at top
  const rows = [
    { label: 'Estate Planning',                totalRev:    2046372, clients:  21 },
    { label: 'Limited Scope Litigation',       totalRev:    6560716, clients:   5 },
    { label: 'Flat Fee',                       totalRev:    7605241, clients: 200 },
    { label: 'Negotiations',                   totalRev:  143784929, clients: 157 },
    { label: 'Full Litigation - Sub into Case',totalRev:  348648331, clients:  54 },
    { label: 'Full Litigation',                totalRev:  973045680, clients: 195 },
    { label: 'Unspecified',                    totalRev: 1668389680, clients: 752 }
  ];

  const ctx = document.getElementById('main-chart').getContext('2d');
  chartInst = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: rows.map(r => r.label),
      datasets: rows.map((r, i) => ({
        label: r.label,
        data:  rows.map((_, j) => j === i ? r.totalRev : null),
        backgroundColor: SCOPE_COLORS[r.label] || '#888888cc',
        borderRadius: 3,
        skipNull: true
      }))
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      aspectRatio: 1,
      plugins: {
        legend: { labels: { color: '#ccc', font: { size: LEGEND_SIZE }, boxWidth: LEGEND_BOX } },
        title: { display: true, text: 'Total Revenue by Scope of Representation', color: '#ddd', font: { size: 16 } },
        tooltip: {
          callbacks: {
            label: item => {
              const r = rows[item.datasetIndex];
              const rev = (r.totalRev / 1e6).toFixed(2);
              return [` $${rev}M total revenue`, ` ${r.clients} clients`];
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#aaa', font: { size: 12 }, callback: v => '$' + (v / 1e6).toFixed(0) + 'M' },
          grid:  { color: 'rgba(255,255,255,.07)' },
          title: { display: true, text: 'Total Revenue (USD)', color: '#888', font: { size: 13 } }
        },
        y: { ticks: { color: '#ccc', font: { size: 12 } }, grid: { color: 'rgba(255,255,255,.04)' } }
      }
    }
  });
}

function renderScopeChart() {
  if (typeof Chart === 'undefined') { showChartUnavailable(); return; }

  const SCOPE_COLORS = {
    'Estate Planning':                '#9110dbcc',
    'Flat Fee':                       '#a6c91acc',
    'Full Litigation':                '#5571d7cc',
    'Full Litigation - Sub into Case':'#d65296cc',
    'Limited Scope Litigation':       '#56cf5ccc',
    'Negotiations':                   '#64efe3cc',
    'Other':                          '#888888cc'
  };

  // Sorted ascending by rev/hr so highest appears at top
  const rows = [
    { label: 'Limited Scope Litigation',       revHr: 1993, clients:   5, totalRev:    6560716 },
    { label: 'Negotiations',                   revHr: 3402, clients: 157, totalRev:  143784929 },
    { label: 'Full Litigation',                revHr: 3849, clients: 195, totalRev:  973045680 },
    { label: 'Unspecified',                    revHr: 4177, clients: 752, totalRev: 1668389680 },
    { label: 'Full Litigation - Sub into Case',revHr: 4596, clients:  54, totalRev:  348648331 },
    { label: 'Flat Fee',                       revHr: 4938, clients: 200, totalRev:    7605241 },
    { label: 'Estate Planning',                revHr: 9455, clients:  21, totalRev:    2046372 }
  ];

  const ctx = document.getElementById('main-chart').getContext('2d');
  chartInst = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: rows.map(r => r.label),
      datasets: rows.map((r, i) => ({
        label: r.label,
        data:  rows.map((_, j) => j === i ? r.revHr : null),
        backgroundColor: SCOPE_COLORS[r.label] || '#888888cc',
        borderRadius: 3,
        skipNull: true
      }))
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      aspectRatio: 1,
      plugins: {
        legend: { labels: { color: '#ccc', font: { size: LEGEND_SIZE }, boxWidth: LEGEND_BOX } },
        title: { display: true, text: 'Revenue per Hour by Scope of Representation', color: '#ddd', font: { size: 16 } },
        tooltip: {
          callbacks: {
            label: item => {
              const r = rows[item.datasetIndex];
              const rev = (r.totalRev / 1e6).toFixed(2);
              return [
                ` $${item.raw.toLocaleString()}/hr`,
                ` ${r.clients} clients`,
                ` $${rev}M total revenue`
              ];
            }
          }
        }
      },
      scales: {
        x: { ticks: { color: '#aaa', font: { size: 12 }, callback: v => '$' + v.toLocaleString() },
             grid: { color: 'rgba(255,255,255,.07)' },
             title: { display: true, text: 'Revenue per Hour ($)', color: '#888', font: { size: 13 } } },
        y: { ticks: { color: '#ccc', font: { size: 12 } }, grid: { color: 'rgba(255,255,255,.04)' } }
      }
    }
  });
}

// ── § 3.4 Cohort Analysis chart ───────────────────────────────────────────
function renderCohortChart() {
  if (typeof Chart === 'undefined') { showChartUnavailable(); return; }
  const ctx = document.getElementById('main-chart').getContext('2d');
  chartInst = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['2021', '2022', '2023', '2024', '2025*', '2026*'],
      datasets: [
        {
          label: 'Lucrative Rate (%)',
          data: [56.4, 47.3, 39.2, 48.0, 28.8, 11.4],
          type: 'line',
          borderColor: '#c0944c',
          backgroundColor: 'rgba(192,148,76,.12)',
          tension: 0.35,
          pointRadius: 5,
          pointBackgroundColor: '#c0944c',
          yAxisID: 'y2'
        },
        {
          label: 'Avg Revenue / Client ($)',
          data: [9719, 7401, 6922, 8001, 2925, 517],
          backgroundColor: [
            'rgba(58,125,85,.9)', 'rgba(58,125,85,.9)', 'rgba(58,125,85,.9)',
            'rgba(58,125,85,.9)', 'rgba(58,125,85,.45)', 'rgba(58,125,85,.25)'
          ],
          yAxisID: 'y'
        }
      ]
    },
    options: {
      responsive: true,
      aspectRatio: 1,
      plugins: {
        legend: { labels: { color: '#ccc', font: { size: LEGEND_SIZE } } },
        title: { display: true, text: 'Intake Cohort Performance (2021–2026)', color: '#ddd', font: { size: 16 } },
        tooltip: {
          callbacks: {
            afterBody: items => {
              const sizes = [287, 165, 143, 173, 212, 88];
              return 'Cohort size: ' + sizes[items[0].dataIndex] + ' clients';
            }
          }
        }
      },
      scales: {
        x:  { ticks: { color: '#aaa', font: { size: 12 } }, grid: { color: 'rgba(255,255,255,.05)' } },
        y:  { ticks: { color: '#aaa', font: { size: 12 }, callback: v => '$' + v.toLocaleString() },
              grid: { color: 'rgba(255,255,255,.07)' },
              title: { display: true, text: 'Avg Revenue ($)', color: '#aaa', font: { size: 13 } } },
        y2: { position: 'right', min: 0, max: 100,
              ticks: { color: '#c0944c', font: { size: 12 }, callback: v => v + '%' },
              grid: { drawOnChartArea: false },
              title: { display: true, text: 'Lucrative Rate (%)', color: '#c0944c', font: { size: 13 } } }
      }
    }
  });
}

// ── § 4.1 Seasonal Demand chart ───────────────────────────────────────────
function renderSeasonalChart() {
  if (typeof Chart === 'undefined') { showChartUnavailable(); return; }
  const ctx = document.getElementById('main-chart').getContext('2d');
  chartInst = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
      datasets: [
        { label: 'Civil Litigation', stack: 'a', backgroundColor: '#6bdb7acc',
          data: [41,80,53,44,27,38,32,32,42,40,31,21] },
        { label: 'Negotiations',     stack: 'a', backgroundColor: '#637defcc',
          data: [34,47,32,36,19,21,23,28,21,25,22,30] },
        { label: 'Drafting',         stack: 'a', backgroundColor: '#f08f35cc',
          data: [13,19,21,22,14,15,18,14,19,12,16,21] },
        { label: 'Estate Planning',  stack: 'a', backgroundColor: '#d41f73cc',
          data: [13,20,17,25,24,12,19,17,16,20,11,7] },
        { label: 'Case Review',      stack: 'a', backgroundColor: '#d67dffcc',
          data: [10,14,12,13,9,4,12,12,9,9,8,3] },
        { label: 'Probate',          stack: 'a', backgroundColor: '#d4d738cc',
          data: [5,28,8,12,7,9,7,12,8,8,6,0] },
        { label: 'Other',            stack: 'a', backgroundColor: '#888888cc',
          data: [41,81,55,54,43,52,55,36,51,56,53,40] }
      ]
    },
    options: {
      responsive: true,
      aspectRatio: 1,
      plugins: {
        legend: { labels: { color: '#ccc', font: { size: LEGEND_SIZE }, boxWidth: LEGEND_BOX } },
        title: { display: true, text: 'Monthly Matter Volume by Practice Area', color: '#ddd', font: { size: 16 } }
      },
      scales: {
        x: { stacked: true, ticks: { color: '#aaa', font: { size: 12 } }, grid: { color: 'rgba(255,255,255,.05)' } },
        y: { stacked: true, ticks: { color: '#aaa', font: { size: 12 } }, grid: { color: 'rgba(255,255,255,.07)' },
             title: { display: true, text: 'Matter Count', color: '#888', font: { size: 13 } } }
      }
    }
  });
}

// ── Scroll observer ────────────────────────────────────────────────────────
function initScrollObserver() {
  const sections = document.querySelectorAll('.story-section[data-viz]');
  if (!sections.length) return;

  // Show first viz immediately
  showViz(sections[0].dataset.viz);
  sections[0].classList.add('active');

  const observerOpts = isMobile
    ? { threshold: 0.1, rootMargin: '-50% 0px 0px 0px' }
    : { threshold: 0.35 };

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        sections.forEach(s => s.classList.remove('active'));
        entry.target.classList.add('active');
        showViz(entry.target.dataset.viz);
      }
    });
  }, observerOpts);

  sections.forEach(s => observer.observe(s));
}
