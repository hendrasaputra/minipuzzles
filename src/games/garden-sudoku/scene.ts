import { MiniScene } from '../../shared/mini-scene';
import { conflicts, type Game } from './engine';

const plantColors = ['#82a385', '#b86b86', '#b58a4b', '#688caa'];

export class GardenScene {
  private readonly mini: MiniScene;
  private press?: { id: number; cell: string; x: number; y: number };

  constructor(host: HTMLElement, onSelect: (cell: number) => void) {
    this.mini = new MiniScene(host, () => { this.press = undefined; });
    const { canvas } = this.mini;
    canvas.setAttribute('aria-label', '3D Sudoku garden. Tap a square, then choose a plant. Choose Flat board for keyboard play.');
    canvas.addEventListener('pointerdown', event => {
      if (this.mini.rotating || event.button !== 0) return;
      const cell = this.mini.pick(event.clientX, event.clientY);
      if (cell === undefined) return;
      canvas.setPointerCapture(event.pointerId);
      this.press = { id: event.pointerId, cell, x: event.clientX, y: event.clientY };
    });
    canvas.addEventListener('pointerup', event => {
      const press = this.press;
      this.press = undefined;
      if (this.mini.rotating || press?.id !== event.pointerId
        || Math.hypot(event.clientX - press.x, event.clientY - press.y) > 8) return;
      if (this.mini.pick(event.clientX, event.clientY) === press.cell) onSelect(Number(press.cell));
    });
    canvas.addEventListener('pointercancel', () => { this.press = undefined; });
  }

  draw(game: Game, selected: number) {
    const clashes = conflicts(game.cells);
    this.mini.clear();
    this.mini.box(-.13, -.13, 4.34, 4.34, -.32, -.04, '#8f9b75');
    for (let cell = 0; cell < 16; cell++) {
      const col = cell % 4;
      const row = Math.floor(cell / 4);
      const x = col + (col >= 2 ? .21 : 0);
      const y = row + (row >= 2 ? .21 : 0);
      const value = game.cells[cell];
      const base = selected === cell ? '#e9b868' : '#e6dbc4';
      const owner = String(cell);
      this.mini.box(x + .03, y + .03, x + .97, y + .97, -.04, .08, base, owner);
      if (!value) continue;
      const color = clashes.has(cell) ? '#a64c4f' : plantColors[value - 1];
      const top = game.level.givens[cell] ? .3 : .22;
      this.mini.box(x + .13, y + .13, x + .87, y + .87, .08, top, color, owner);
      this.mini.label(String(value), x + .5, y + .5, top + .01);
    }
    this.mini.render();
  }
}
