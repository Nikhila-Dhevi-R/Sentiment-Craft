/**
 * Sentiment Analyser — Main JavaScript
 * Handles: particles, drag-and-drop upload, loading screen,
 *          single-text prediction, toasts, and page-transition.
 */

/* ─── Particles ────────────────────────────────────────────── */
(function initParticles() {
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;

  const ctx  = canvas.getContext('2d');
  let W, H, particles = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  // Minecraft-inspired block colours for particles
  const COLOURS = ['#50C878','#2e7d4f','#4a7c3f','#3b2e1e','#232623','#8fa990'];

  function mkParticle() {
    return {
      x:    Math.random() * W,
      y:    Math.random() * H,
      size: Math.random() * 4 + 2,          // 2–6px squares
      vx:   (Math.random() - 0.5) * 0.4,
      vy:   (Math.random() - 0.5) * 0.4,
      alpha: Math.random() * 0.4 + 0.1,
      col:  COLOURS[Math.floor(Math.random() * COLOURS.length)],
    };
  }

  for (let i = 0; i < 70; i++) particles.push(mkParticle());

  function draw() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle   = p.col;
      ctx.fillRect(p.x, p.y, p.size, p.size);  // pixel squares

      p.x += p.vx;
      p.y += p.vy;

      if (p.x < -10 || p.x > W + 10 || p.y < -10 || p.y > H + 10) {
        Object.assign(p, mkParticle(), { x: Math.random() * W, y: Math.random() * H });
      }
    });
    ctx.globalAlpha = 1;
    requestAnimationFrame(draw);
  }
  draw();
})();


/* ─── Toast Notification ────────────────────────────────────── */
function showToast(message, type = 'success', duration = 3500) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span class="toast-icon">${icons[type] || '📢'}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'toastOut 0.35s ease forwards';
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, duration);
}


/* ─── Loading Overlay ───────────────────────────────────────── */
const loadingMessages = [
  'Mining Opinions...',
  'Crafting Predictions...',
  'Smelting Data...',
  'Loading Sentiments...',
  'Processing Blocks...',
  'Forging Results...',
];

function showLoading() {
  const overlay = document.getElementById('loading-overlay');
  const bar     = document.getElementById('mc-bar');
  const status  = document.getElementById('loading-status');
  if (!overlay) return;

  overlay.classList.add('active');

  let progress = 0;
  let msgIdx   = 0;

  // rotate messages every 1.4 s
  const msgTimer = setInterval(() => {
    msgIdx = (msgIdx + 1) % loadingMessages.length;
    if (status) status.textContent = loadingMessages[msgIdx];
  }, 1400);

  // animate progress bar
  const barTimer = setInterval(() => {
    progress = Math.min(progress + Math.random() * 8 + 2, 92);
    if (bar) bar.style.width = progress + '%';
  }, 400);

  // store references so the form handler can clear them if needed
  overlay._timers = [msgTimer, barTimer];
}

function hideLoading() {
  const overlay = document.getElementById('loading-overlay');
  const bar     = document.getElementById('mc-bar');
  if (!overlay) return;

  if (bar) bar.style.width = '100%';
  (overlay._timers || []).forEach(clearInterval);

  setTimeout(() => overlay.classList.remove('active'), 400);
}


/* ─── Drag-and-drop Upload ──────────────────────────────────── */
(function initUpload() {
  const dropZone  = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const fileInfo  = document.getElementById('file-info');
  const fileLabel = document.getElementById('file-label');
  const uploadForm = document.getElementById('upload-form');

  if (!dropZone) return;

  // open file picker on zone click (but not on the label itself)
  dropZone.addEventListener('click', (e) => {
    if (e.target.closest('.btn')) return;   // don't double-fire on browse btn
    fileInput.click();
  });

  // file selected via picker
  fileInput.addEventListener('change', () => handleFiles(fileInput.files));

  // drag events
  ['dragenter', 'dragover'].forEach(ev => {
    dropZone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });
  });

  ['dragleave', 'dragend', 'drop'].forEach(ev => {
    dropZone.addEventListener(ev, () => dropZone.classList.remove('drag-over'));
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  });

  function handleFiles(files) {
    if (!files || files.length === 0) return;
    const file = files[0];

    if (!file.name.endsWith('.csv')) {
      showToast('Only CSV files are accepted.', 'error');
      return;
    }

    // update data-transfer so form submission sends the file
    const dt = new DataTransfer();
    dt.items.add(file);
    fileInput.files = dt.files;

    // show file info strip
    if (fileInfo)  fileInfo.classList.add('show');
    if (fileLabel) fileLabel.textContent = `📄 ${file.name}  (${(file.size / 1024).toFixed(1)} KB)`;
  }

  // intercept form submit → show loading overlay
  if (uploadForm) {
    uploadForm.addEventListener('submit', (e) => {
      if (!fileInput.files || fileInput.files.length === 0) {
        e.preventDefault();
        showToast('Please select a CSV file first.', 'error');
        return;
      }
      showLoading();
      showToast('Uploading and analysing your file…', 'info', 5000);
    });
  }

  // show browse button inside the drop zone
  const browseBtn = document.getElementById('browse-btn');
  if (browseBtn) {
    browseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      fileInput.click();
    });
  }
})();


/* ─── Single-text Prediction (AJAX) ────────────────────────── */
(function initTextPredict() {
  const analyseBtn  = document.getElementById('analyse-text-btn');
  const textArea    = document.getElementById('single-review');
  const resultBox   = document.getElementById('text-result');
  const resultLabel = document.getElementById('text-result-label');

  if (!analyseBtn) return;

  analyseBtn.addEventListener('click', async () => {
    const text = textArea ? textArea.value.trim() : '';
    if (!text) {
      showToast('Please enter some text to analyse.', 'error');
      return;
    }

    analyseBtn.disabled    = true;
    analyseBtn.textContent = 'Analysing...';

    try {
      const resp = await fetch('/predict-text', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text }),
      });

      if (!resp.ok) throw new Error('Server error');

      const data = await resp.json();
      const label = data.prediction;

      if (resultBox && resultLabel) {
        resultBox.className  = `inline-result show ${label.toLowerCase()}`;
        resultLabel.textContent = label === 'Positive'
          ? '🟢 Positive Sentiment'
          : '🔴 Negative Sentiment';
      }
      showToast(`Prediction: ${label}`, label === 'Positive' ? 'success' : 'error');
    } catch (err) {
      showToast('Prediction failed. Please try again.', 'error');
    } finally {
      analyseBtn.disabled    = false;
      analyseBtn.textContent = 'Analyse Text';
    }
  });
})();


/* ─── Results Page — Table with search, sort, pagination ─────── */
(function initResultsTable() {
  const searchBox = document.getElementById('table-search');
  const tbody     = document.getElementById('results-tbody');
  const prevBtn   = document.getElementById('prev-page');
  const nextBtn   = document.getElementById('next-page');
  const pageInfo  = document.getElementById('page-info');
  const paginationEl = document.getElementById('pagination');

  if (!tbody) return;

  const PAGE_SIZE = 15;
  let allRows  = Array.from(tbody.querySelectorAll('tr'));
  let filtered = [...allRows];
  let currentPage = 1;
  let sortCol  = -1;
  let sortAsc  = true;

  // ─ Search ─
  if (searchBox) {
    searchBox.addEventListener('input', () => {
      const q = searchBox.value.toLowerCase();
      filtered = allRows.filter(row => row.textContent.toLowerCase().includes(q));
      currentPage = 1;
      render();
    });
  }

  // ─ Sort (click th) ─
  const headers = document.querySelectorAll('#results-table thead th[data-col]');
  headers.forEach((th, idx) => {
    th.addEventListener('click', () => {
      if (sortCol === idx) sortAsc = !sortAsc;
      else { sortCol = idx; sortAsc = true; }

      headers.forEach(h => h.classList.remove('sorted'));
      th.classList.add('sorted');
      const icon = th.querySelector('.sort-icon');
      if (icon) icon.textContent = sortAsc ? '▲' : '▼';

      filtered.sort((a, b) => {
        const aT = a.cells[idx + 1]?.textContent.trim() || '';   // +1 skips row-num cell
        const bT = b.cells[idx + 1]?.textContent.trim() || '';
        return sortAsc ? aT.localeCompare(bT) : bT.localeCompare(aT);
      });

      currentPage = 1;
      render();
    });
  });

  // ─ Prev / Next ─
  if (prevBtn) prevBtn.addEventListener('click', () => { currentPage--; render(); });
  if (nextBtn) nextBtn.addEventListener('click', () => { currentPage++; render(); });

  function render() {
    const total = filtered.length;
    const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    currentPage = Math.min(Math.max(currentPage, 1), pages);

    const start = (currentPage - 1) * PAGE_SIZE;
    const end   = start + PAGE_SIZE;

    // hide all, show only current slice
    allRows.forEach(row => (row.style.display = 'none'));
    filtered.slice(start, end).forEach(row => (row.style.display = ''));

    if (pageInfo) pageInfo.textContent = `Page ${currentPage} of ${pages} (${total} rows)`;
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= pages;

    // numbered page buttons
    renderPageButtons(pages);
  }

  function renderPageButtons(pages) {
    if (!paginationEl) return;

    // remove old number buttons, keep prev/next
    paginationEl.querySelectorAll('.page-num-btn').forEach(el => el.remove());

    const range = getPageRange(currentPage, pages);
    const refNode = nextBtn;  // insert before Next

    range.forEach(p => {
      if (p === '…') {
        const span = document.createElement('span');
        span.textContent = '…';
        span.className   = 'page-info';
        paginationEl.insertBefore(span, refNode);
        return;
      }
      const btn  = document.createElement('button');
      btn.textContent = p;
      btn.className   = `page-btn page-num-btn${p === currentPage ? ' active' : ''}`;
      btn.addEventListener('click', () => { currentPage = p; render(); });
      paginationEl.insertBefore(btn, refNode);
    });
  }

  function getPageRange(cur, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (cur <= 4)   return [1, 2, 3, 4, 5, '…', total];
    if (cur >= total - 3) return [1, '…', total-4, total-3, total-2, total-1, total];
    return [1, '…', cur - 1, cur, cur + 1, '…', total];
  }

  render();
})();


/* ─── Results Page — Pie Chart ──────────────────────────────── */
(function initChart() {
  const canvas = document.getElementById('pie-chart');
  if (!canvas || typeof Chart === 'undefined') return;

  const pos = parseInt(canvas.dataset.positive, 10) || 0;
  const neg = parseInt(canvas.dataset.negative, 10) || 0;

  new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: ['Positive', 'Negative'],
      datasets: [{
        data: [pos, neg],
        backgroundColor: ['rgba(46,204,113,0.85)', 'rgba(231,76,60,0.85)'],
        borderColor:     ['#2ecc71', '#e74c3c'],
        borderWidth: 3,
        hoverOffset: 8,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      cutout: '62%',
      animation: { duration: 1200, easing: 'easeInOutQuart' },
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color:    '#e8ede9',
            font:     { size: 13, weight: '600' },
            padding:  16,
            usePointStyle: true,
            pointStyleWidth: 10,
          },
        },
        tooltip: {
          callbacks: {
            label(ctx) {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct   = total ? ((ctx.parsed / total) * 100).toFixed(1) : 0;
              return `  ${ctx.label}: ${ctx.parsed} (${pct}%)`;
            },
          },
        },
      },
    },
  });
})();


/* ─── Mood Emoji ─────────────────────────────────────────────── */
(function initEmoji() {
  const el  = document.getElementById('mood-emoji');
  const lbl = document.getElementById('mood-label');
  if (!el) return;

  const posPct = parseFloat(el.dataset.pos || '0');

  let emoji, label, glow;
  if (posPct > 70) {
    emoji = '😁'; label = 'Mostly Positive'; glow = 'rgba(46,204,113,0.6)';
  } else if (posPct >= 40) {
    emoji = '😐'; label = 'Balanced';         glow = 'rgba(241,196,15,0.6)';
  } else {
    emoji = '😞'; label = 'Mostly Negative';  glow = 'rgba(231,76,60,0.6)';
  }

  el.textContent  = emoji;
  el.style.filter = `drop-shadow(0 0 18px ${glow})`;
  if (lbl) lbl.textContent = label;
})();


/* ─── Fade-in page transition ────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  document.body.style.opacity = '0';
  document.body.style.transition = 'opacity 0.5s ease';
  requestAnimationFrame(() => { document.body.style.opacity = '1'; });
});
