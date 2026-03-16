/**
 * main.js — Trap Grid AI Edition: Orchestration
 */

'use strict';

let currentMode = 'pvp';
let debugMode   = false;
window.bgm = new Audio('assets/bgm1.mp3');
bgm.loop = true;
bgm.volume = 0.4;

document.addEventListener('DOMContentLoaded', () => {
  bgm.load();
  initUI();
  bindMenuEvents();
  bindGameEvents();
  startMenuParticles();
  applyDebugMode();
});

function bindMenuEvents() {
  document.getElementById('btn-pvp').addEventListener('click', () => {
  bgm.currentTime = 0;
  bgm.play().catch(()=>{});
  startGameWithTransition('pvp');
});

document.getElementById('btn-pvai').addEventListener('click', () => {
  bgm.currentTime = 0;
  bgm.play().catch(()=>{});
  startGameWithTransition('pvai');
});
}

function bindGameEvents() {
  document.getElementById('btn-back').addEventListener('click',    goToMenu);
  document.getElementById('btn-restart').addEventListener('click', restartGame);
  document.getElementById('popup-restart').addEventListener('click', restartGame);
  document.getElementById('popup-menu').addEventListener('click',    goToMenu);

  const btnDebug = document.getElementById('btn-debug');
  if (btnDebug) {
    btnDebug.addEventListener('click', () => {
      debugMode = !debugMode;
      applyDebugMode();
    });
  }

  const btnHeat = document.getElementById('btn-heatmap');
  if (btnHeat) {
    btnHeat.addEventListener('click', () => {
      const on = toggleHeatmap();
      btnHeat.classList.toggle('active', on);
      const btnBFS = document.getElementById('btn-bfs-vis');
      if (on && btnBFS) btnBFS.classList.remove('active');
      renderBoard(onCellClick);
    });
  }

  const btnBFS = document.getElementById('btn-bfs-vis');
  if (btnBFS) {
    btnBFS.addEventListener('click', () => {
      const on = toggleBFSZones();
      btnBFS.classList.toggle('active', on);
      const btnH = document.getElementById('btn-heatmap');
      if (on && btnH) btnH.classList.remove('active');
      renderBoard(onCellClick);
    });
  }

  const btnPanel = document.getElementById('btn-algo-panel');
  if (btnPanel) {
    btnPanel.addEventListener('click', () => {
      const visible = toggleAlgoPanel();
      btnPanel.classList.toggle('active', visible);
    });
  }

  document.addEventListener('keydown', onKeyDown);

  window.addEventListener('resize', () => refreshOverlay());
}

function applyDebugMode() {
  document.body.classList.toggle('debug-active', debugMode);

  const btnDebug = document.getElementById('btn-debug');
  if (btnDebug) {
    btnDebug.textContent = debugMode ? '🐛 Debug ON' : '🐛 Debug';
    btnDebug.classList.toggle('active', debugMode);
  }

  const algoPanel = document.getElementById('algo-panel');
  if (algoPanel) {
    algoPanel.classList.toggle('hidden-panel', !debugMode);
    const btnPanel = document.getElementById('btn-algo-panel');
    if (btnPanel) btnPanel.classList.toggle('active', debugMode);
  }

  setTimeout(() => refreshOverlay(), 300);
}

let focusedMoveIndex = -1;

function onKeyDown(e) {
  const state = getState();
  if (!state || state.gameOver) return;

  const gameScreen = document.getElementById('screen-game');
  if (!gameScreen || !gameScreen.classList.contains('active')) return;

  if (state.mode === 'pvai' && state.currentPlayer === 2) return;

  const moves = state.validMoves;
  if (!moves || moves.length === 0) return;

  const key = e.key;

  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(key)) {
    e.preventDefault();
    const pos = state.currentPlayer === 1 ? state.p1 : state.p2;

    let target = null;
    if (key === 'ArrowUp')    target = moves.find(m => m.row === pos.row - 1 && m.col === pos.col);
    if (key === 'ArrowDown')  target = moves.find(m => m.row === pos.row + 1 && m.col === pos.col);
    if (key === 'ArrowLeft')  target = moves.find(m => m.row === pos.row     && m.col === pos.col - 1);
    if (key === 'ArrowRight') target = moves.find(m => m.row === pos.row     && m.col === pos.col + 1);

    if (target) {
      setKeyboardFocus(target.row, target.col);
      focusedMoveIndex = moves.findIndex(m => m.row === target.row && m.col === target.col);
    }
    return;
  }

  if ((key === 'Enter' || key === ' ') && focusedMoveIndex >= 0) {
    e.preventDefault();
    const move = moves[focusedMoveIndex];
    if (move) {
      clearKeyboardFocus();
      onCellClick(move.row, move.col);
    }
  }
}

function setKeyboardFocus(row, col) {
  clearKeyboardFocus();
  const el = document.querySelector(`#board .cell[data-row="${row}"][data-col="${col}"]`);
  if (el) el.classList.add('kb-focus');
}

function clearKeyboardFocus() {
  document.querySelectorAll('#board .cell.kb-focus')
    .forEach(el => el.classList.remove('kb-focus'));
  focusedMoveIndex = -1;
}

function updateTurnCounter() {
  const state = getState();
  if (!state) return;
  const el = document.getElementById('turn-counter');
  if (!el) return;
  el.textContent = `Turn ${state.turnNumber}`;
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}

function startAIProgressBar() {
  const bar  = document.getElementById('ai-progress-bar');
  const fill = document.getElementById('ai-progress-fill');
  if (!bar || !fill) return;

  bar.style.display = 'block';
  fill.style.transition = 'none';
  fill.style.width = '0%';

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      fill.style.transition = 'width 0.45s ease-out';
      fill.style.width = '35%';
      setTimeout(() => {
        fill.style.transition = 'width 0.3s ease-out';
        fill.style.width = '68%';
        setTimeout(() => {
          fill.style.transition = 'width 0.35s ease-out';
          fill.style.width = '84%';
        }, 220);
      }, 220);
    });
  });
}

function completeAIProgressBar(callback) {
  const bar  = document.getElementById('ai-progress-bar');
  const fill = document.getElementById('ai-progress-fill');
  if (!fill) { if (callback) callback(); return; }

  fill.style.transition = 'width 0.15s ease-out';
  fill.style.width = '100%';

  setTimeout(() => {
    if (bar)  bar.style.display = 'none';
    if (fill) fill.style.width  = '0%';
    if (callback) callback();
  }, 180);
}

function flashChosenCell(row, col, callback) {
  const el = document.querySelector(`#board .cell[data-row="${row}"][data-col="${col}"]`);
  if (el) {
    el.classList.add('ai-chosen');
    setTimeout(() => {
      el.classList.remove('ai-chosen');
      if (callback) callback();
    }, 440);
  } else {
    if (callback) callback();
  }
}

function startGame(mode) {
  currentMode = mode;
  
  initGame(mode);
  setP2Label(mode);
  hideWinPopup();
  showScreen('game');
  logGameStart(mode);
  renderBoard(onCellClick);
  updatePanels();
  updateMoveHistory();
  updateTurnCounter();
  clearKeyboardFocus();

  ['ab-nodes','ab-pruned','ab-eff'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '-';
  });

  const mmTree = document.getElementById('minimax-tree');
  if (mmTree) mmTree.innerHTML = '<div class="tree-placeholder">Tree appears after AI move</div>';
  const abLog = document.getElementById('ab-log');
  if (abLog) abLog.innerHTML = '<div class="log-empty">Pruning log appears after AI move</div>';

  setStatusMessage('Player 1 — click or use ↑↓←→ + Enter to move', 'p1');
  applyDebugMode();
}

function restartGame() {
  hideWinPopup();
  startGame(currentMode);
}

function goToMenu() {
  hideWinPopup();
  bgm.pause();
  bgm.currentTime = 0;
  showScreen('menu');
}

function onCellClick(row, col) {
  const state = getState();
  if (!state || state.gameOver) return;
  if (state.mode === 'pvai' && state.currentPlayer === 2) return;

  clearKeyboardFocus();

  const fromPos = state.currentPlayer === 1
    ? { row: state.p1.row, col: state.p1.col }
    : { row: state.p2.row, col: state.p2.col };

  const result = executeMove(row, col);
  if (!result) return;

  animateBlockedCell(result.blocked);
  renderBoard(onCellClick);
  updatePanels();
  updateMoveHistory();
  updateTurnCounter();

  logMoveAnalysis(state.currentPlayer === 1 ? 2 : 1, fromPos, { row, col }, null);

  if (result.gameOver) {
    handleGameOver(result.winner);
    return;
  }

  const nextPlayer = getState().currentPlayer;

  if (state.mode === 'pvp') {
    setStatusMessage(`Player ${nextPlayer} — click or use ↑↓←→ + Enter`, `p${nextPlayer}`);
  } else {
    setStatusMessage('AI is thinking…', 'ai');
    scheduleAIMove();
  }
}

function scheduleAIMove() {
  showAIThinking('Running Minimax depth-3 + Alpha-Beta pruning…');
  startAIProgressBar();

  setTimeout(() => {
    const state = getState();
    if (!state || state.gameOver) {
      hideAIThinking();
      completeAIProgressBar(null);
      return;
    }

    const aiFromPos = { row: state.p2.row, col: state.p2.col };
    const result    = triggerAIMove();

    completeAIProgressBar(() => {
      hideAIThinking();

      if (!result) {
        handleGameOver(1);
        return;
      }

      flashChosenCell(result.moved.row, result.moved.col, () => {
        animateBlockedCell(result.blocked);
        renderBoard(onCellClick);
        updatePanels();
        updateMoveHistory();
        updateTurnCounter();

        const afterState = getState();
        const searchData = afterState.lastAISearchData;
        if (searchData) {
          renderMinimaxTree(searchData);
          renderAlphaBeta(searchData);
          logMoveAnalysis(2, aiFromPos, result.moved, searchData);
        }

        if (result.gameOver) {
          handleGameOver(result.winner);
          return;
        }

        setStatusMessage('Player 1 — click or use ↑↓←→ + Enter', 'p1');
      });
    });

  }, 600);
}

function handleGameOver(winner) {
  const state = getState();
  const isAI  = state.mode === 'pvai';
  const wName = winner === 1 ? 'Player 1' : (isAI ? 'AI' : 'Player 2');
  bgm.pause();
  bgm.currentTime = 0;
  setStatusMessage(`${wName} wins! Opponent is trapped.`, 'win');
  renderBoard(onCellClick);
  updatePanels();

  setTimeout(() => showWinPopup(winner, state), 700);
}

function startMenuParticles() {
  const canvas = document.getElementById('menu-particles');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const particles = Array.from({ length: 28 }, () => createParticle());

  function createParticle() {
    return {
      x:       Math.random() * window.innerWidth,
      y:       Math.random() * window.innerHeight,
      size:    5 + Math.random() * 11,
      vx:      (Math.random() - 0.5) * 0.4,
      vy:      -0.2 - Math.random() * 0.5,
      opacity: 0.06 + Math.random() * 0.14,
      color:   Math.random() > 0.5 ? '34,197,94' : '96,165,250',
    };
  }

  function resetParticle(p) {
    p.x       = Math.random() * window.innerWidth;
    p.y       = window.innerHeight + 20;
    p.opacity = 0.04 + Math.random() * 0.1;
  }

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -20) resetParticle(p);
      ctx.fillStyle   = `rgba(${p.color},${p.opacity})`;
      ctx.strokeStyle = `rgba(${p.color},${p.opacity * 1.5})`;
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.roundRect(p.x, p.y, p.size, p.size, 2);
      ctx.fill();
      ctx.stroke();
    }
    requestAnimationFrame(tick);
  }
  tick();
}