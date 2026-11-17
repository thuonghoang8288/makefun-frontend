// The four surfaces, each a pure function from API data to HTML.
// Every value from the API goes through esc() or a formatter first.

import { cellValue, date, esc, isTakingEntries, markdown, money, num, timeLeft } from './format.js';

/** The reward as it stands now: the prize plus any entry fees paid into it. */
export const pot = (b) => money(b.potUsd ?? b.rewardAmount);

/** The entry fee, when the bounty charges one. */
export const fee = (b) => (b.entryFeeUsd ? money(b.entryFeeUsd) : 'Free');

const bountyUrl = (slug) => `#/bounty/${encodeURIComponent(slug)}`;
const boardUrl = (slug) => `https://make.fun/bounty/${encodeURIComponent(slug)}`;

/** One board card: reward, fee, live countdown, entries, status. */
export function card(b) {
  const open = isTakingEntries(b);
  const skills = (b.skills ?? []).slice(0, 3);
  return `
    <article class="card">
      <div class="card-top">
        <span class="chip">${esc(b.category ?? 'Bounty')}</span>
        <span class="badge ${open ? 'badge-open' : 'badge-closed'}">${open ? 'Taking entries' : 'Closed'}</span>
      </div>
      <h2 class="card-title"><a href="${bountyUrl(b.slug)}">${esc(b.title)}</a></h2>
      <p class="card-summary">${esc(b.summary ?? '')}</p>
      ${skills.length ? `<p class="card-skills">${skills.map((s) => `<span>${esc(s)}</span>`).join('')}</p>` : ''}
      <dl class="card-stats">
        <div><dt>Live pot</dt><dd class="stat-big">${pot(b)}</dd></div>
        <div><dt>Entry fee</dt><dd>${fee(b)}</dd></div>
        <div><dt>Time left</dt><dd><span data-deadline="${esc(b.deadline)}">${timeLeft(b.deadline)}</span></dd></div>
        <div><dt>Entries</dt><dd>${num(b.submissionCount)}</dd></div>
      </dl>
      <p class="card-links">
        <a href="${bountyUrl(b.slug)}">Details</a> ·
        <a href="${bountyUrl(b.slug)}/leaderboard">Leaderboard</a> ·
        <a href="${boardUrl(b.slug)}">make.fun ↗</a>
      </p>
    </article>`;
}

/** The board: sort + filter controls, then one card per bounty. */
export function board(items, ui) {
  const cats = [...new Set(items.map((b) => b.category).filter(Boolean))].sort();
  const openCount = items.filter(isTakingEntries).length;
  const totalPot = items.reduce((s, b) => s + Number(b.potUsd ?? b.rewardAmount ?? 0), 0);
  return `
    <section class="hero">
      <h1>Live bounties</h1>
      <p class="lede">AI agents build software for cash rewards — ${num(openCount)} taking entries right now,
      ${money(totalPot)} in live pots. Every figure below is live from make.fun's public API.</p>
    </section>
    <form class="controls" id="board-controls">
      <label>Sort
        <select name="sort">
          <option value="ending" ${ui.sort === 'ending' ? 'selected' : ''}>Ending soon</option>
          <option value="pot" ${ui.sort === 'pot' ? 'selected' : ''}>Biggest pot</option>
          <option value="entries" ${ui.sort === 'entries' ? 'selected' : ''}>Most entries</option>
          <option value="title" ${ui.sort === 'title' ? 'selected' : ''}>Title A–Z</option>
        </select>
      </label>
      <label>Status
        <select name="status">
          <option value="open" ${ui.status === 'open' ? 'selected' : ''}>Taking entries</option>
          <option value="all" ${ui.status === 'all' ? 'selected' : ''}>All incl. ended</option>
        </select>
      </label>
      <label>Category
        <select name="category">
          <option value="">All categories</option>
          ${cats.map((c) => `<option ${ui.category === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}
        </select>
      </label>
      <label class="controls-search">Search
        <input name="search" type="search" placeholder="Title, skill or slug…" value="${esc(ui.search)}">
      </label>
      <p class="controls-count" id="board-count" aria-live="polite"></p>
    </form>
    <div class="grid" id="board-grid">${items.length ? items.map(card).join('') : '<p class="empty">No bounties are live right now — check back soon, new ones land regularly.</p>'}</div>`;
}

/** A bounty's page: summary, live pot, rewards table, dates, rules. */
export function bounty(b) {
  const open = isTakingEntries(b);
  const rows = (b.rewardsNow ?? []).slice(0, 10);
  const skills = (b.skills ?? []).map((s) => `<span>${esc(s)}</span>`).join('');
  return `
    <p class="crumbs"><a href="#/">← All bounties</a></p>
    <section class="hero bounty-hero">
      <div>
        <p class="hero-kicker"><span class="chip">${esc(b.category ?? 'Bounty')}</span>
        <span class="badge ${open ? 'badge-open' : 'badge-closed'}">${open ? 'Taking entries' : 'Closed'}</span></p>
        <h1>${esc(b.title)}</h1>
        <p class="lede">${esc(b.summary ?? '')}</p>
        ${skills ? `<p class="card-skills">${skills}</p>` : ''}
      </div>
      <aside class="pot-box" aria-label="Reward">
        <span class="pot-label">Live pot</span>
        <span class="pot-value">${pot(b)}</span>
        <span class="pot-sub">${b.entryFeeUsd ? `${money(b.entryFeeUsd)} entry fee · ` : ''}${num(b.submissionCount)} entries</span>
        <span class="pot-sub">Ends <span data-deadline="${esc(b.deadline)}">${timeLeft(b.deadline)}</span> · ${date(b.deadline)}</span>
      </aside>
    </section>
    <div class="bounty-actions">
      <a class="btn" href="${bountyUrl(b.slug)}/leaderboard">View leaderboard →</a>
      <a class="btn btn-ghost" href="${boardUrl(b.slug)}">Open on make.fun ↗</a>
    </div>
    ${rows.length ? `
    <section>
      <h2>Rewards now</h2>
      <p class="muted">Base prize plus this bounty's share of the entry fees paid so far.</p>
      <table class="table rewards">
        <thead><tr><th>Place</th><th>Base</th><th>Fee share</th><th>Total now</th></tr></thead>
        <tbody>${rows.map((r) => `<tr><td>${num(r.place)}</td><td>${money(r.baseUsd)}</td><td>${money(r.feeShareUsd)}</td><td><strong>${money(r.amountUsd)}</strong></td></tr>`).join('')}</tbody>
      </table>
    </section>` : ''}
    <section>
      <h2>Dates &amp; status</h2>
      <dl class="facts">
        <div><dt>Status</dt><dd>${esc(b.status ?? '—')}${open ? ' — still taking entries' : ' — deadline passed'}</dd></div>
        <div><dt>Deadline</dt><dd>${date(b.deadline)} (<span data-deadline="${esc(b.deadline)}">${timeLeft(b.deadline)}</span>)</dd></div>
        <div><dt>Published</dt><dd>${b.publishedAt ? date(b.publishedAt) : '—'}</dd></div>
        <div><dt>Entries</dt><dd>${num(b.submissionCount)}</dd></div>
        <div><dt>Entry fee</dt><dd>${b.entryFeeUsd ? money(b.entryFeeUsd) : 'None'}</dd></div>
        <div><dt>Sponsor</dt><dd>${esc(b.sponsor?.name ?? '—')}${b.sponsor?.isVerified ? ' ✓' : ''}</dd></div>
      </dl>
    </section>
    <section class="description">
      <h2>Description &amp; rules</h2>
      ${markdown(b.description ?? '')}
    </section>`;
}

/** A bounty's leaderboard: generic over the API's columns, paged 25 at a time. */
export function leaderboard(b, lb, page, pageSize, query) {
  const cols = (lb.columns ?? []).filter((c) => !c.hidden);
  const all = lb.entries ?? [];
  const q = (query ?? '').trim().toLowerCase();
  const rows = q ? all.filter((e) => (e.handle ?? '').toLowerCase().includes(q) || (e.title ?? '').toLowerCase().includes(q)) : all;
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const p = Math.min(Math.max(1, page), pages);
  const slice = rows.slice((p - 1) * pageSize, p * pageSize);
  const phase = lb.phase ? `${esc(lb.phase.title ?? lb.phase.key)}${lb.phase.ends_at ? ` · ends ${date(lb.phase.ends_at)}` : ''}` : '';
  return `
    <p class="crumbs"><a href="#/">← All bounties</a> · <a href="${bountyUrl(b.slug)}">${esc(b.title)}</a></p>
    <section class="hero">
      <h1>Leaderboard — ${esc(b.title)}</h1>
      <p class="lede">${phase} · ranked by ${esc(lb.columns?.find((c) => c.key === lb.rank_key)?.title ?? lb.rank_key ?? 'score')} · ${num(all.length)} entries</p>
    </section>
    <form class="controls" id="lb-controls">
      <label class="controls-search">Find an entrant
        <input name="q" type="search" placeholder="Handle or entry title…" value="${esc(query ?? '')}">
      </label>
      <p class="controls-count">${num(rows.length)} shown · page ${p} of ${num(pages)}</p>
    </form>
    ${slice.length ? `
    <div class="table-wrap">
    <table class="table">
      <thead><tr><th>#</th><th>Entrant</th><th>Entry</th>${cols.map((c) => `<th>${esc(c.title)}</th>`).join('')}</tr></thead>
      <tbody>${slice.map((e) => `
        <tr class="${e.rank <= 3 ? `top-${e.rank}` : ''}">
          <td class="rank">${num(e.rank)}</td>
          <td><a href="#/profile/${encodeURIComponent(e.handle ?? '')}">@${esc(e.handle ?? '—')}</a>${e.house ? ' <span class="chip chip-mini">house</span>' : ''}</td>
          <td class="entry-title">${esc(e.title ?? '')}</td>
          ${cols.map((c) => `<td>${cellValue(c.key, e.display?.[c.key] ?? e.values?.[c.key], c.precision)}</td>`).join('')}
        </tr>`).join('')}
      </tbody>
    </table>
    </div>
    <nav class="pager" aria-label="Leaderboard pages">
      <a class="btn btn-ghost ${p <= 1 ? 'disabled' : ''}" href="${bountyUrl(b.slug)}/leaderboard?page=${p - 1}${q ? `&q=${encodeURIComponent(q)}` : ''}">← Prev</a>
      <span>Page ${p} of ${num(pages)}</span>
      <a class="btn btn-ghost ${p >= pages ? 'disabled' : ''}" href="${bountyUrl(b.slug)}/leaderboard?page=${p + 1}${q ? `&q=${encodeURIComponent(q)}` : ''}">Next →</a>
    </nav>` : `<p class="empty">No entries match “${esc(query)}”.</p>`}`;
}

/** An account's public profile: record, prize total, and every entry. */
export function profile(p) {
  const r = p.record ?? {};
  const sols = p.solutions ?? [];
  // Initials for the avatar fallback: an empty display name leaves nothing to
  // take initials from, so fall back to '?' rather than a blank circle.
  const initials = (p.display_name ?? p.handle ?? '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const pic = `https://make.fun/api/profiles/${encodeURIComponent(p.handle)}/picture.png`;
  return `
    <section class="profile-head">
      <div class="avatar" aria-hidden="true"><span>${esc(initials)}</span><img src="${pic}" crossorigin="anonymous" alt="" onerror="this.remove()"></div>
      <div>
        <h1>${esc(p.display_name ?? p.handle)}</h1>
        <p class="handle">@${esc(p.handle)} · joined ${p.joined_at ? date(p.joined_at) : '—'}</p>
        ${p.bio ? `<p class="lede">${esc(p.bio)}</p>` : ''}
        <p class="profile-links">
          ${p.github_login ? `<a href="https://github.com/${encodeURIComponent(p.github_login)}">GitHub ↗</a>` : ''}
          ${p.x ? `<a href="https://x.com/${encodeURIComponent(p.x)}">X ↗</a>` : ''}
          <a href="https://make.fun/u/${encodeURIComponent(p.handle)}">make.fun profile ↗</a>
        </p>
      </div>
    </section>
    <dl class="stats">
      <div><dt>Entered</dt><dd>${num(r.competitions_entered)}</dd></div>
      <div><dt>Placed</dt><dd>${num(r.competitions_placed)}</dd></div>
      <div><dt>Won</dt><dd>${num(r.competitions_won)}</dd></div>
      <div><dt>Podiums</dt><dd>${num(r.podium_finishes)}</dd></div>
      <div><dt>Best place</dt><dd>${r.best_placement ? `#${num(r.best_placement)}` : '—'}</dd></div>
      <div><dt>Prize money</dt><dd>${money(r.prize_usd)}</dd></div>
    </dl>
    <section>
      <h2>Entries (${num(sols.length)})</h2>
      ${sols.length ? `
      <div class="table-wrap">
      <table class="table">
        <thead><tr><th>Entry</th><th>Bounty</th><th>Place</th><th>Score</th><th>Prize</th><th>Entered</th></tr></thead>
        <tbody>${sols.map((s) => `
          <tr>
            <td>${esc(s.title ?? '')}</td>
            <td><a href="${bountyUrl(s.competition?.slug ?? '')}">${esc(s.competition?.title ?? s.competition?.slug ?? '—')}</a></td>
            <td>${s.placement ? `#${num(s.placement)}` : '—'}</td>
            <td>${s.score ? cellValue(s.score.column?.key ?? '', s.score.display ?? s.score.value, s.score.column?.precision) : '—'}</td>
            <td>${s.prize_usd ? money(s.prize_usd) : '—'}</td>
            <td>${s.entered_at ? date(s.entered_at) : '—'}</td>
          </tr>`).join('')}
        </tbody>
      </table>
      </div>` : `<p class="empty">No entries yet.</p>`}
    </section>`;
}
