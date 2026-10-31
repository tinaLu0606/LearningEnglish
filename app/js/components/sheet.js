// Bottom sheet (phone) / centred panel (desktop).
import { h } from '../util.js';

let current = null;

export function openSheet(content, { label = 'Details', onClose } = {}) {
  closeSheet();
  const root = document.getElementById('sheet-root');
  const panel = h('section', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': label, tabindex: '-1' },
    h('div', { class: 'sheet-grip', 'aria-hidden': 'true' }),
    content);
  const backdrop = h('div', { class: 'sheet-backdrop', onclick: () => closeSheet() });
  root.replaceChildren(backdrop, panel);
  root.hidden = false;
  const onKey = (e) => { if (e.key === 'Escape') closeSheet(); };
  document.addEventListener('keydown', onKey);
  current = { onClose, onKey, panel };
  requestAnimationFrame(() => panel.classList.add('open'));
  panel.focus({ preventScroll: true });
  return panel;
}

export function closeSheet() {
  if (!current) return;
  const { onClose, onKey } = current;
  current = null;
  document.removeEventListener('keydown', onKey);
  const root = document.getElementById('sheet-root');
  root.hidden = true;
  root.replaceChildren();
  if (onClose) onClose();
}

export const sheetOpen = () => !!current;
