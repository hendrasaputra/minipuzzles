import './touch-camera-hint.css';

export function appendTouchCameraHint(host: HTMLElement) {
  const hint = document.createElement('p');
  hint.className = 'touch-camera-tip';
  hint.textContent = 'Drag with two fingers to rotate';
  host.append(hint);
}
