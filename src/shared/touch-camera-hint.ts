import './touch-camera-hint.css';

const seenKey = 'puzzles-camera-tip-seen';

/** The tip has done its job once the player rotates with two fingers or has tapped the board a few times. */
export function tipLearned(touches: number, mostActive: number) {
  return mostActive >= 2 || touches >= 4;
}

export function appendTouchCameraHint(host: HTMLElement) {
  try { if (localStorage.getItem(seenKey)) return; } catch { /* storage blocked: show the tip */ }
  const hint = document.createElement('p');
  hint.className = 'touch-camera-tip';
  hint.textContent = 'Drag with two fingers to rotate';
  host.append(hint);
  const active = new Set<number>();
  let touches = 0, mostActive = 0;
  const up = (event: PointerEvent) => active.delete(event.pointerId);
  const down = (event: PointerEvent) => {
    if (event.pointerType !== 'touch') return;
    active.add(event.pointerId); touches++; mostActive = Math.max(mostActive, active.size);
    if (!tipLearned(touches, mostActive)) return;
    hint.remove();
    try { localStorage.setItem(seenKey, '1'); } catch { /* fine: it just shows again next visit */ }
    host.removeEventListener('pointerdown', down, true);
    host.removeEventListener('pointerup', up, true);
    host.removeEventListener('pointercancel', up, true);
  };
  host.addEventListener('pointerdown', down, true);
  host.addEventListener('pointerup', up, true);
  host.addEventListener('pointercancel', up, true);
}
