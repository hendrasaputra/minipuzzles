import './game-guide.css';

/** Small looping drawings of a finger on a board, one per touch action. Still poses under reduced motion. */
export type Gesture = 'tap' | 'tap-two' | 'hold' | 'drag' | 'swipe' | 'rotate' | 'pinch';

const board = '<rect x="6" y="8" width="68" height="40" rx="7" class="g-board"/>'
  + '<path d="M29 8v40M51 8v40M6 28h68" class="g-grid"/>';
const finger = (cls: string, x: number, y: number) => `<g class="g-finger ${cls}"><circle cx="${x}" cy="${y}" r="9" class="g-ring"/><circle cx="${x}" cy="${y}" r="6" class="g-tip"/></g>`;
const gestures: Record<Gesture, string> = {
  'tap': board + finger('g-tap', 40, 28),
  'tap-two': board + finger('g-tap-a', 18, 18) + finger('g-tap-b', 62, 38),
  'hold': board + '<circle cx="40" cy="28" r="12" class="g-hold-fill"/>' + finger('g-hold', 40, 28),
  'drag': board + '<rect x="12" y="20" width="26" height="16" rx="4" class="g-piece g-drag-piece"/>' + finger('g-drag', 25, 28),
  'swipe': board + '<path d="M22 28h34" class="g-trail"/>' + finger('g-swipe', 22, 28),
  'rotate': board + finger('g-orbit-a', 26, 28) + finger('g-orbit-b', 54, 28),
  'pinch': board + finger('g-pinch-a', 32, 24) + finger('g-pinch-b', 48, 32),
};

export function gestureDrawing(gesture: Gesture): string {
  return `<svg class="guide-gesture" viewBox="0 0 80 56" width="80" height="56" aria-hidden="true">${gestures[gesture]}</svg>`;
}

export interface GuideStep {
  /** A finger drawing showing the action. */
  gesture?: Gesture;
  /** Optional before → after picture of what changes. */
  before?: string;
  after?: string;
  text: string;
}

/** The camera step every 3D board shares, written for touch first. */
export const cameraStep: GuideStep = { gesture: 'rotate', text: 'Drag with two fingers to turn the board. Pinch to zoom. ↺ puts the view back.' };
/** Mouse and keyboard ways to move the camera, for the Other controls line. */
export const cameraOther = 'With a mouse, choose Rotate and drag, then choose Play. Scroll to zoom.';

export function gameGuide(steps: readonly GuideStep[], expanded = false, other?: string): string {
  const list = `<ol class="guide-steps">${steps.map(({ gesture, before, after, text }) => `
    <li>
      <div class="guide-demo" aria-hidden="true">
        ${gesture ? gestureDrawing(gesture) : ''}
        ${before !== undefined ? `<span>${before}</span><span class="guide-arrow">→</span><span class="guide-result">${after ?? ''}</span>` : ''}
      </div>
      <p>${text}</p>
    </li>`).join('')}</ol>${other ? `<p class="guide-other"><strong>Other controls.</strong> ${other}</p>` : ''}`;
  return expanded
    ? `<section class="game-guide" aria-label="How to play">${list}</section>`
    : `<details class="game-guide"><summary>How to play</summary>${list}</details>`;
}

/** True when this is the player's first visit to a game: no save and the guide was never shown. */
export function firstVisit(keys: readonly string[], game: string, seenKey: string): boolean {
  return !keys.includes(seenKey) && !keys.some(key => key.includes(game) || (game === 'petals' && key.startsWith('petal-')));
}

// Read storage as the page loads, before the game writes its first save.
const startingKeys = (() => { try { return Object.keys(localStorage); } catch { return null; } })();

/** Opens How to play once, the first time someone plays this game on this device. */
export function showGuideOnFirstVisit(game: string) {
  const seenKey = `puzzles-guide-${game}`;
  try {
    if (!startingKeys || !firstVisit(startingKeys, game, seenKey)) return;
    localStorage.setItem(seenKey, '1');
  } catch { return; } // Without storage it would open on every visit.
  const guide = document.querySelector<HTMLElement>('.game-guide');
  const dialog = guide?.closest('dialog');
  if (!guide || !dialog || dialog.open) return;
  if (guide instanceof HTMLDetailsElement) guide.open = true;
  dialog.showModal();
  guide.scrollIntoView({ block: 'start' });
}
