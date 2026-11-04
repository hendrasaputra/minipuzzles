export interface Level {
  id: string;
  title: string;
  capacity: number;
  stacks: number[][];
}

export interface Move { from: number; to: number }
export interface Game { level: Level; stacks: number[][]; history: Move[] }

export function createGame(level: Level): Game {
  return { level, stacks: level.stacks.map(stack => [...stack]), history: [] };
}

export function sorted(stack: readonly number[], capacity: number): boolean {
  return stack.length === capacity && stack.every(color => color === stack[0]);
}

function solved(stacks: number[][], capacity: number): boolean {
  return stacks.every(stack => !stack.length || sorted(stack, capacity));
}

export function complete(game: Game): boolean {
  return solved(game.stacks, game.level.capacity);
}

export function canMove(game: Game, move: Move): boolean {
  const { from, to } = move;
  const source = game.stacks[from], target = game.stacks[to];
  return Number.isInteger(from) && Number.isInteger(to) && from !== to
    && !!source?.length && !!target && target.length < game.level.capacity
    && (!target.length || source.at(-1) === target.at(-1));
}

export function applyMove(game: Game, move: Move): boolean {
  if (complete(game) || !canMove(game, move)) return false;
  game.stacks[move.to].push(game.stacks[move.from].pop()!);
  game.history.push({ ...move });
  return true;
}

export function undo(game: Game): boolean {
  const move = game.history.pop();
  if (!move) return false;
  game.stacks[move.from].push(game.stacks[move.to].pop()!);
  return true;
}

export function solve(game: Game, maxStates = 30000): Move[] | undefined {
  // Stack labels do not affect the answer. Treat permutations as one state.
  const key = (stacks: number[][]) => stacks.map(stack => stack.join('')).sort().join('|');
  const queue: { stacks: number[][]; parent: number; move?: Move }[] = [{ stacks: game.stacks, parent: -1 }];
  const seen = new Set([key(game.stacks)]);
  for (let index = 0; index < queue.length; index++) {
    const { stacks } = queue[index];
    if (solved(stacks, game.level.capacity)) {
      const moves: Move[] = [];
      for (let i = index; queue[i].move; i = queue[i].parent) moves.push(queue[i].move!);
      return moves.reverse();
    }
    for (let from = 0; from < stacks.length; from++) {
      const source = stacks[from];
      if (!source.length || sorted(source, game.level.capacity)) continue;
      let usedEmpty = false;
      for (let to = 0; to < stacks.length; to++) {
        const target = stacks[to];
        if (!canMove({ ...game, stacks }, { from, to })) continue;
        if (!target.length) {
          if (usedEmpty) continue;
          usedEmpty = true;
        }
        const next = [...stacks];
        next[from] = source.slice(0, -1);
        next[to] = [...target, source.at(-1)!];
        const state = key(next);
        if (seen.has(state)) continue;
        if (seen.size >= maxStates) return;
        seen.add(state);
        queue.push({ stacks: next, parent: index, move: { from, to } });
      }
    }
  }
}
