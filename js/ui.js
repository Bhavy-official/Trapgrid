/**
 * ui.js — DOM Rendering & Panel Updates
 *
 * Enhanced with:
 *  - Coordinate labels on board
 *  - BFS territory cell tinting
 *  - Move score badges on valid cells
 *  - Full left/right panel updates
 *  - Smooth active player indication
 *  - Win popup with confetti
 */

'use strict';

let boardElRef = null;

function initUI() {
  boardElRef = document.getElementById('board');
  buildCoordLabels();
  initVisualizer();
}

function buildCoordLabels() {
  const colsEl = document.getElementById('coord-cols');
  const rowsEl = document.getElementById('coord-rows');
  if (!colsEl || !rowsEl) return;

  colsEl.style.cssText = `
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 3px;
    padding: 0 8px;
    width: min(52vmin, 440px);
  `;
  for (let c = 0; c < 7; c++) {
    const span = document.createElement('span');
    span.className = 'coord-label';
    span.style.cssText = 'font-size:9px;color:var(--text-muted);text-align:center;';
    span.textContent = c;
    colsEl.appendChild(span);
  }

  rowsEl.style.cssText = `
    display: grid;
    grid-template-rows: repeat(7, 1fr);
    gap: 3px;
    padding: 8px 0;
    height: min(52vmin, 440px);
  `;
  for (let r = 0; r < 7; r++) {
    const span = document.createElement('span');
    span.className = 'coord-label';
    span.style.cssText = 'font-size:9px;color:var(--text-muted);text-align:right;padding-right:4px;display:flex;align-items:center;justify-content:flex-end;';
    span.textContent = r;
    rowsEl.appendChild(span);
  }
}

function renderBoard(onCellClick) {
  const state = getState();
  if (!state || !boardElRef) return;

  boardElRef.innerHTML = '';

  const { board, validMoves, currentPlayer, gameOver, mode } = state;
  const validSet = new Set(validMoves.map(m => `${m.row},${m.col}`));

  let territory = null;
  if (showBFSZones) {
    territory = getCurrentTerritoryMap();
  }

  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const cell = document.createElement('div');
      cell.classList.add('cell');
      cell.dataset.row = r;
      cell.dataset.col = c;

      const val = board[r][c];

      if (val === CELL_BLOCKED) {
        cell.classList.add('blocked');

      } else if (val === CELL_P1) {
        cell.classList.add('p1');
        cell.innerHTML = '<div class="token">P1</div>';

      } else if (val === CELL_P2) {
        cell.classList.add('p2');
        const lbl = mode === 'pvai' ? 'AI' : 'P2';
        cell.innerHTML = `<div class="token">${lbl}</div>`;

      } else {
        cell.classList.add('empty');

        if (territory && territory[r][c] !== 'none') {
          cell.classList.add('bfs-' + territory[r][c]);
        }

        const isHuman = mode === 'pvp' || currentPlayer === 1;
        if (!gameOver && validSet.has(`${r},${c}`) && isHuman) {
          cell.classList.add('highlight');
          cell.addEventListener('click', () => onCellClick(r, c));
        }
      }

      boardElRef.appendChild(cell);
    }
  }

  addMoveScoreBadges();

  refreshOverlay();
}

function animateBlockedCell(pos) {
  const el = boardElRef.querySelector(`[data-row="${pos.row}"][data-col="${pos.col}"]`);
  if (el) {
    el.classList.add('just-blocked');
    setTimeout(() => el.classList.remove('just-blocked'), 500);
  }
}

function updatePanels() {
  const state = getState();
  if (!state) return;

  const { p1, p2, currentPlayer, gameOver, mode } = state;

  _set('p1-moves', p1.moves);
  _set('p2-moves', p2.moves);

  const mob1 = getMobility(1);
  const mob2 = getMobility(2);
  const maxMob = 49;
  const pct1 = Math.round((mob1 / maxMob) * 100);
  const pct2 = Math.round((mob2 / maxMob) * 100);

  _style('p1-mob-bar', 'width', pct1 + '%');
  _style('p2-mob-bar', 'width', pct2 + '%');
  _set('p1-mob-pct', pct1 + '%');
  _set('p2-mob-pct', pct2 + '%');

  _set('p1-territory', mob1);
  _set('p2-territory', mob2);

  const imm1 = getValidMoves(state.board, p1.row, p1.col).length;
  const imm2 = getValidMoves(state.board, p2.row, p2.col).length;
  _set('p1-imm', imm1);
  _set('p2-imm', imm2);

  if (!gameOver) {
    _toggleClass('card-p1', 'active-card', currentPlayer === 1);
    _toggleClass('card-p2', 'active-card', currentPlayer === 2);
    _toggleClass('badge-p1', 'visible', currentPlayer === 1);
    _toggleClass('badge-p2', 'visible', currentPlayer === 2);
  } else {
    _toggleClass('badge-p1', 'visible', false);
    _toggleClass('badge-p2', 'visible', false);
  }

  updateHeuristicPanel();

  renderBFSSteps(currentPlayer === 1 ? 1 : 2);

  const dot = document.getElementById('status-dot');
  if (dot) {
    dot.style.background = currentPlayer === 1 ? 'var(--p1)' : 'var(--p2)';
  }
}

function updateMoveHistory() {
  const state = getState();
  if (!state) return;

  const listEl = document.getElementById('move-history-list');
  if (!listEl) return;

  listEl.innerHTML = '';
  if (state.moveHistory.length === 0) {
    listEl.innerHTML = '<div class="mh-empty">No moves yet</div>';
    return;
  }

  const recent = state.moveHistory.slice(-15);
  recent.forEach(entry => {
    const isAI = state.mode === 'pvai' && entry.player === 2;
    const name = entry.player === 1 ? 'P1' : (isAI ? 'AI' : 'P2');
    const pClass = entry.player === 1 ? 'p1' : 'p2';

    const div = document.createElement('div');
    div.className = 'mh-item';
    div.innerHTML = `
      <span class="mh-num">#${entry.turn}</span>
      <span class="mh-dot ${pClass}"></span>
      <span class="mh-text">${name}: (${entry.from.row},${entry.from.col})→(${entry.to.row},${entry.to.col})</span>
      <span class="mh-score">${entry.heurScore}</span>
    `;
    listEl.appendChild(div);
  });

  listEl.scrollTop = listEl.scrollHeight;
}

function setStatusMessage(text, type = 'neutral') {
  const el = document.getElementById('status-msg');
  if (el) el.textContent = text;

  const dot = document.getElementById('status-dot');
  if (dot) {
    const colors = { p1:'var(--p1)', p2:'var(--p2)', ai:'var(--p2)', win:'var(--accent)', neutral:'var(--text-dim)' };
    dot.style.background = colors[type] || colors.neutral;
    dot.style.animation  = type === 'win' ? 'none' : '';
  }
}

function showAIThinking(detail = 'Running Minimax depth-3…') {
  const el = document.getElementById('ai-thinking');
  const sub = document.getElementById('ai-think-detail');
  if (el)  el.classList.add('visible');
  if (sub) sub.textContent = detail;
}
function hideAIThinking() {
  const el = document.getElementById('ai-thinking');
  if (el) el.classList.remove('visible');
}

function showWinPopup(winner, state) {
  const isAI = state.mode === 'pvai';
  const wName = winner === 1 ? 'Player 1' : (isAI ? 'AI' : 'Player 2');
  const loser = winner === 1 ? (isAI ? 'AI' : 'P2') : 'Player 1';

  _set('popup-winner', `${wName} Wins!`);
  _set('popup-reason', `${loser} has no valid moves remaining.`);
  _set('ps-p1m', state.p1.moves);
  _set('ps-p2-label', isAI ? 'AI Moves' : 'P2 Moves');
  _set('ps-p2m', state.p2.moves);
  _set('ps-blocked', countBlockedCells());
  _set('ps-turns', state.turnNumber);

  const trophy = document.getElementById('popup-trophy');
  if (trophy) trophy.textContent = winner === 1 ? '🏆' : (isAI ? '🤖' : '🏆');

  spawnConfetti();

  document.getElementById('win-popup').classList.remove('hidden');
  logAlgo(`🏆 ${wName} wins after ${state.turnNumber} moves!`, 'win');
}

function hideWinPopup() {
  document.getElementById('win-popup').classList.add('hidden');
}

function spawnConfetti() {
  const container = document.getElementById('popup-confetti');
  if (!container) return;
  container.innerHTML = '';

  const colors = ['#22c55e','#60a5fa','#facc15','#a78bfa','#fb923c','#22d3ee'];
  for (let i = 0; i < 30; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.cssText = `
      left: ${Math.random() * 100}%;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      animation-duration: ${0.8 + Math.random() * 1.2}s;
      animation-delay: ${Math.random() * 0.5}s;
      width: ${4 + Math.random() * 8}px;
      height: ${4 + Math.random() * 8}px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
    `;
    container.appendChild(piece);
  }
}

function showScreen(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(`screen-${name}`).classList.add('active');
  if (name === 'game') {
    setTimeout(resizeOverlay, 50);
  }
}

function setP2Label(mode) {
  const isAI = mode === 'pvai';
  _set('p2-name', isAI ? 'AI Opponent' : 'Player 2');
  const av = document.getElementById('av-p2');
  if (av) av.textContent = isAI ? 'AI' : 'P2';
  const badge = document.getElementById('badge-p2');
  if (badge) badge.textContent = isAI ? 'THINKING' : 'ACTIVE';
}

function toggleAlgoPanel() {
  const panel = document.getElementById('algo-panel');
  if (!panel) return;
  const hidden = panel.classList.toggle('hidden-panel');
  return !hidden;
}

function _set(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
function _style(id, prop, val) {
  const el = document.getElementById(id);
  if (el) el.style[prop] = val;
}
function _toggleClass(id, cls, on) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle(cls, on);
}
