// Small helpers for showing API values.

/** Text made safe to put inside HTML. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** A whole number with thousands separators. */
export function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n).toLocaleString('en-US') : '—';
}

/** A dollar amount ('1000.00' or 0.5) as '$1,000' or '$0.50'. */
export function money(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(n) ? 0 : 2,
  });
}

/** A byte count as '1.4 MB' or '312 KB'. */
export function bytes(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

/** A deadline as a date in UTC. */
export function date(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return `${d.toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })} UTC`;
}

/** True while a bounty still takes entries: its deadline, not its status, decides. */
export function isTakingEntries(b) {
  return new Date(b.deadline).getTime() > Date.now();
}

/** The time until a deadline: '2d 4h left', '35m 12s left', or 'ended'. */
export function timeLeft(iso) {
  const ms = new Date(iso).getTime() - Date.now();
  // A deadline the API sent without a usable date is unknown, not zero:
  // show a dash instead of a nonsense countdown.
  if (Number.isNaN(ms)) return '—';
  if (ms <= 0) return 'ended';
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  if (days > 0) return `${days}d ${hours}h left`;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  if (minutes > 0) return `${minutes}m ${seconds}s left`;
  return `${seconds}s left`;
}

/**
 * A leaderboard cell: judge win rates arrive as micro-units (962052 = 96.21%),
 * sizes as bytes, everything else as its column's display value.
 */
export function cellValue(key, display, precision) {
  const n = Number(display);
  if (!Number.isFinite(n)) return esc(display ?? '—');
  if (key === 'bytes') return bytes(n);
  if (key.startsWith('judge')) return `${(n / 10000).toFixed(2)}%`;
  if (precision === 0) return num(n);
  if (typeof precision === 'number') return n.toFixed(precision);
  return num(n);
}

/**
 * The API's bounty descriptions are light Markdown (## headings, - bullets,
 * `code`, **bold**). Render just that, escaped first, so no raw HTML from
 * the API ever reaches the page.
 */
export function markdown(text) {
  const lines = String(text ?? '').split('\n');
  let out = '';
  let inList = false;
  const closeList = () => {
    if (inList) {
      out += '</ul>';
      inList = false;
    }
  };
  const inline = (s) =>
    esc(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  for (const line of lines) {
    if (line.startsWith('### ')) {
      closeList();
      out += `<h3>${inline(line.slice(4))}</h3>`;
    } else if (line.startsWith('## ')) {
      closeList();
      out += `<h2>${inline(line.slice(3))}</h2>`;
    } else if (line.startsWith('- ')) {
      if (!inList) {
        out += '<ul>';
        inList = true;
      }
      out += `<li>${inline(line.slice(2))}</li>`;
    } else if (line.trim() === '') {
      closeList();
    } else {
      closeList();
      out += `<p>${inline(line)}</p>`;
    }
  }
  closeList();
  return out;
}
