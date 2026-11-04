import './style.css';
import { games, type GameEntry } from '../catalog';

function icon(game:GameEntry) {
  if(game.icon)return `<span class="icon-wrap has-art"><img src="${game.icon}" alt="" width="128" height="128" loading="lazy" decoding="async"></span>`;
  const miniature=game.id==='petals'
    ? `<span class="mini-board">${Array.from({length:9},(_,i)=>`<span class="mini-tile ${i===4?'revealed':''}">${i===4?'1':i===2?'⚑':''}</span>`).join('')}</span>`
    : `<span class="icon-token"><span>${game.monogram}</span></span>`;
  return `<span class="icon-wrap" aria-hidden="true">${miniature}</span>`;
}
function card(game:GameEntry) {
  const content=`${icon(game)}<h3 class="game-title" id="${game.id}-title">${game.title}</h3><span class="game-description" id="${game.id}-description">${game.description}</span><span class="game-status">${game.status==='playable'?'Play →':'Coming soon'}</span>`;
  return game.status==='playable'&&game.href
    ? `<a class="game-card playable" href="${game.href}" style="--accent:${game.accent}" aria-label="Play ${game.title}" aria-describedby="${game.id}-description">${content}</a>`
    : `<article class="game-card planned" style="--accent:${game.accent}" aria-labelledby="${game.id}-title">${content}</article>`;
}
const playable = games.filter(game => game.status === 'playable');
const planned = games.filter(game => game.status === 'planned');
document.querySelector<HTMLDivElement>('#app')!.innerHTML=`
<header class="site-header"><a class="site-brand" href="./" aria-label="Puzzles home"><span class="brand-mark" aria-hidden="true">P</span>Puzzles</a><span class="availability">${playable.length} ${playable.length===1?'game':'games'} ready to play</span></header>
<main class="library">
  <section class="intro"><h1>Choose a game</h1></section>
  <section aria-label="Playable games"><div class="game-grid">${playable.map(card).join('')}</div></section>
  ${planned.length ? `<details class="planned-games">
    <summary>Coming soon (${planned.length})</summary>
    <div class="game-grid">${planned.map(card).join('')}</div>
  </details>` : ''}
</main>
<footer class="site-footer"><a href="https://github.com/hendrasaputra/minipuzzles">Source on GitHub ↗</a></footer>`;
