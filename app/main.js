// A make.fun frontend: board, bounty page, leaderboard and profile, on hash routes.
//
//   #/                              the board
//   #/bounty/<slug>                 one bounty
//   #/bounty/<slug>/leaderboard     its leaderboard (?page=n&q=…)
//   #/profile/<handle>              an account's public profile
//
// window.__shotReady is false while a page loads and true once its data is on
// screen, so a screenshot script knows when to capture. Live countdowns tick
// in place every second (data-deadline spans), without rebuilding the page.

import { clearCache, getBounties, getBounty, getLeaderboard, getProfile } from './api.js';
import { isTakingEntries, timeLeft } from './format.js';
import { board, bounty, card, leaderboard, profile } from './views.js';

const app = document.getElementById('app');
const searchInput = document.getElementById('q');

const boardUi = { sort: 'ending', status: 'open', category: '', search: '' };
let boardData = null;

function loading(msg = 'Loading live data from make.fun…') {
  app.innerHTML = `<p class="loading" role="status">${msg}</p>`;
}

function failed(err) {
  const notFound = err && err.status === 404;
  app.innerHTML = `
    <div class="error" role="alert">
      <h1>${notFound ? 'Not found' : 'Could not load make.fun'}</h1>
      <p>${notFound ? 'No bounty or profile matches that address.' : 'The public API did not answer. Check your connection and try again.'}</p>
      <p><button class="btn" id="retry">Retry</button> <a class="btn btn-ghost" href="#/">Back to the board</a></p>
    </div>`;
  document.getElementById('retry')?.addEventListener('click', () => {
    clearCache();
    render();
  });
}

/** Board rows after the current sort / filter / search. */
function boardRows() {
  let rows = [...(boardData?.items ?? [])];
  if (boardUi.status === 'open') rows = rows.filter(isTakingEntries);
  if (boardUi.category) rows = rows.filter((b) => b.category === boardUi.category);
  const q = boardUi.search.trim().toLowerCase();
  if (q) {
    rows = rows.filter((b) =>
      [b.title, b.slug, b.category, ...(b.skills ?? [])].join(' ').toLowerCase().includes(q),
    );
  }
  const potOf = (b) => Number(b.potUsd ?? b.rewardAmount ?? 0);
  const sorts = {
    ending: (a, b) => new Date(a.deadline) - new Date(b.deadline),
    pot: (a, b) => potOf(b) - potOf(a),
    entries: (a, b) => (b.submissionCount ?? 0) - (a.submissionCount ?? 0),
    title: (a, b) => (a.title ?? '').localeCompare(b.title ?? ''),
  };
  return rows.sort(sorts[boardUi.sort] ?? sorts.ending);
}

/** Re-render only the board's grid + count (controls keep focus while typing). */
function refreshBoardGrid() {
  const grid = document.getElementById('board-grid');
  const count = document.getElementById('board-count');
  if (!grid) return;
  const rows = boardRows();
  grid.innerHTML = rows.length
    ? rows.map(card).join('')
    : '<p class="empty">No bounties match those filters.</p>';
  if (count) count.textContent = `${rows.length} ${rows.length === 1 ? 'bounty' : 'bounties'}`;
}

function wireBoardControls() {
  const form = document.getElementById('board-controls');
  if (!form) return;
  form.addEventListener('input', (e) => {
    const t = e.target;
    if (t.name === 'search') boardUi.search = t.value;
    if (t.name === 'sort') boardUi.sort = t.value;
    if (t.name === 'status') boardUi.status = t.value;
    if (t.name === 'category') boardUi.category = t.value;
    refreshBoardGrid();
  });
  form.addEventListener('submit', (e) => e.preventDefault());
  refreshBoardGrid();
}

function wireLeaderboardControls(slug) {
  const form = document.getElementById('lb-controls');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = new FormData(form).get('q') ?? '';
    location.hash = `#/bounty/${encodeURIComponent(slug)}/leaderboard${q ? `?q=${encodeURIComponent(q)}` : ''}`;
  });
}

function parseRoute() {
  const [path, query] = location.hash.slice(1).split('?');
  const params = new URLSearchParams(query ?? '');
  const parts = (path || '/').split('/').filter(Boolean);
  if (parts[0] === 'bounty' && parts[1]) {
    return { view: parts[2] === 'leaderboard' ? 'leaderboard' : 'bounty', slug: decodeURIComponent(parts[1]), params };
  }
  if (parts[0] === 'profile' && parts[1]) return { view: 'profile', handle: decodeURIComponent(parts[1]) };
  return { view: 'board', params };
}

async function render() {
  window.__shotReady = false;
  const route = parseRoute();
  document.querySelectorAll('[data-nav]').forEach((a) => a.classList.remove('active'));
  try {
    if (route.view === 'board') {
      document.title = 'make.fun — live bounties';
      document.querySelector('[data-nav="board"]')?.classList.add('active');
      if (!boardData) {
        loading();
        boardData = await getBounties();
      }
      app.innerHTML = board(boardData.items, boardUi);
      wireBoardControls();
    } else if (route.view === 'bounty') {
      loading();
      const b = await getBounty(route.slug);
      document.title = `${b.title} | make.fun`;
      app.innerHTML = bounty(b);
    } else if (route.view === 'leaderboard') {
      loading();
      const [b, lb] = await Promise.all([getBounty(route.slug), getLeaderboard(route.slug)]);
      document.title = `Leaderboard — ${b.title} | make.fun`;
      const page = Number(route.params.get('page')) || 1;
      app.innerHTML = leaderboard(b, lb, page, 25, route.params.get('q') ?? '');
      wireLeaderboardControls(route.slug);
    } else {
      loading();
      const p = await getProfile(route.handle);
      document.title = `${p.display_name ?? p.handle} (@${p.handle}) | make.fun`;
      document.querySelector('[data-nav="profile"]')?.classList.add('active');
      app.innerHTML = profile(p);
    }
  } catch (err) {
    failed(err);
  }
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

// Live countdowns: update every [data-deadline] span in place, once a second.
setInterval(() => {
  document.querySelectorAll('[data-deadline]').forEach((el) => {
    el.textContent = timeLeft(el.getAttribute('data-deadline'));
  });
}, 1000);

// Header search: a handle goes to its profile, anything else filters the board.
document.getElementById('top-search')?.addEventListener('submit', (e) => {
  e.preventDefault();
  const q = searchInput.value.trim();
  if (!q) return;
  if (q.startsWith('@')) {
    location.hash = `#/profile/${encodeURIComponent(q.slice(1))}`;
  } else {
    boardUi.search = q;
    if (parseRoute().view !== 'board') location.hash = '#/';
    else render();
    searchInput.value = '';
  }
});

// Pressing / anywhere (outside a text field) jumps to the header search,
// so the board can be filtered without reaching for the mouse.
document.addEventListener('keydown', (e) => {
  const tag = (e.target?.tagName ?? '').toLowerCase();
  if (e.key === '/' && tag !== 'input' && tag !== 'select' && tag !== 'textarea') {
    e.preventDefault();
    searchInput.focus();
  }
});

window.addEventListener('hashchange', render);
render();
