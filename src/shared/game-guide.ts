import './game-guide.css';

interface GuideStep {
  before: string;
  after: string;
  text: string;
}

export function gameGuide(steps: readonly GuideStep[], expanded = false): string {
  const list = `<ol class="guide-steps">${steps.map(({ before, after, text }) => `
    <li>
      <div class="guide-demo" aria-hidden="true">
        <span>${before}</span><span class="guide-arrow">→</span><span class="guide-result">${after}</span>
      </div>
      <p>${text}</p>
    </li>`).join('')}</ol>`;
  return expanded
    ? `<section class="game-guide" aria-label="How to play">${list}</section>`
    : `<details class="game-guide"><summary>How to play</summary>${list}</details>`;
}
