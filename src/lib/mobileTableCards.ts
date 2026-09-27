// Mobile table → card labels.
// Wide data tables (marked with the `mobile-card-table` class) are rendered as stacked
// cards on phones by CSS in index.css (@media max-width: 767px). Each cell then needs
// the column title next to its value, so this helper copies every <th> text into the
// matching <td data-label="…">. It only writes a data attribute — desktop layout and
// the table markup/behaviour are untouched.

const TABLE_SELECTOR = 'table.mobile-card-table';

const labelTable = (table: HTMLTableElement) => {
  const headRow = table.tHead?.rows?.[0];
  if (!headRow) return;
  const labels: string[] = [];
  Array.from(headRow.cells).forEach((th) => {
    const text = (th.textContent || '').replace(/\s+/g, ' ').trim();
    const span = Math.max(1, th.colSpan || 1);
    for (let i = 0; i < span; i += 1) labels.push(text);
  });
  Array.from(table.tBodies).forEach((body) => {
    Array.from(body.rows).forEach((row) => {
      let col = 0;
      Array.from(row.cells).forEach((cell) => {
        // Cells hidden inline (legacy placeholder columns) have no header of their own.
        if ((cell as HTMLElement).style?.display === 'none') return;
        const span = Math.max(1, cell.colSpan || 1);
        const label = span === 1 ? labels[col] || '' : '';
        if (label) {
          if (cell.getAttribute('data-label') !== label) cell.setAttribute('data-label', label);
        } else if (cell.hasAttribute('data-label')) {
          cell.removeAttribute('data-label');
        }
        col += span;
      });
    });
  });
};

export const installMobileTableCards = () => {
  if (typeof window === 'undefined' || typeof MutationObserver === 'undefined') return;
  let scheduled = false;
  const run = () => {
    scheduled = false;
    document.querySelectorAll<HTMLTableElement>(TABLE_SELECTOR).forEach(labelTable);
  };
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(run);
  };
  const start = () => {
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        const target = m.target as Element | null;
        if (target && (target.closest?.(TABLE_SELECTOR) || (target as Element).querySelector?.(TABLE_SELECTOR))) {
          schedule();
          return;
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    schedule();
  };
  if (document.body) start();
  else window.addEventListener('DOMContentLoaded', start, { once: true });
};
