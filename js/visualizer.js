/**
 * visualizer.js — Algorithm Visualization Engine
 *
 * Updated:
 *  - Real-time adaptive depth display in tree header
 *  - Updated heuristic formula label
 *  - AI panel depth badge updates after every move
 *  - Richer log output (depth used, move ordering note)
 *  - Heuristic breakdown shows all new components
 */

'use strict';

let showHeatmap   = false;
let showBFSZones  = false;
let algoLogEl     = null;
let bfsQueueEl    = null;
let bfsStepsEl    = null;
let minimaxTreeEl = null;
let abLogEl       = null;
let overlayCanvas = null;
let overlayCtx    = null;
let boardEl       = null;

function initVisualizer() {
  algoLogEl     = document.getElementById('algo-log');
  bfsQueueEl    = document.getElementById('bfs-queue-display');
  bfsStepsEl    = document.getElementById('bfs-steps');
  minimaxTreeEl = document.getElementById('minimax-tree');
  abLogEl       = document.getElementById('ab-log');
  overlayCanvas = document.getElementById('overlay-canvas');
  boardEl       = document.getElementById('board');

  if (overlayCanvas) overlayCtx = overlayCanvas.getContext('2d');
  resizeOverlay();
}

function resizeOverlay() {
  if (!overlayCanvas || !boardEl) return;
  const boardRect = boardEl.getBoundingClientRect();
  const pad = 8;
  const gap = 3;
  const totalWidth  = boardRect.width  - pad * 2;
  const totalHeight = boardRect.height - pad * 2;
  const cellW = (totalWidth  - gap * 6) / 7;
  const cellH = (totalHeight - gap * 6) / 7;

  overlayCanvas.width  = totalWidth;
  overlayCanvas.height = totalHeight;
  overlayCanvas.style.width  = totalWidth + 'px';
  overlayCanvas.style.height = totalHeight + 'px';

  return { cellW, cellH, gap, totalWidth, totalHeight };
}

function getCellDimensions() {
  if (!overlayCanvas) return null;
  const gap = 3;
  const cellW = (overlayCanvas.width  - gap * 6) / 7;
  const cellH = (overlayCanvas.height - gap * 6) / 7;
  return { cellW, cellH, gap };
}

function clearOverlay() {
  if (!overlayCtx || !overlayCanvas) return;
  overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
}

function drawBFSZones() {
  if (!overlayCtx) return;
  clearOverlay();
  if (!showBFSZones) return;

  const state = getState();
  if (!state) return;

  const dims = getCellDimensions();
  if (!dims) return;
  const { cellW, cellH, gap } = dims;

  const territory = getCurrentTerritoryMap();

  const colors = {
    p1:   'rgba(34, 197, 94, 0.20)',
    p2:   'rgba(96, 165, 250, 0.20)',
    both: 'rgba(167, 139, 250, 0.18)',
  };
  const strokeColors = {
    p1:   'rgba(34, 197, 94, 0.45)',
    p2:   'rgba(96, 165, 250, 0.45)',
    both: 'rgba(167, 139, 250, 0.45)',
  };

  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const zone = territory[r][c];
      if (zone === 'none') continue;
      const x = c * (cellW + gap);
      const y = r * (cellH + gap);
      overlayCtx.fillStyle   = colors[zone];
      overlayCtx.strokeStyle = strokeColors[zone];
      overlayCtx.lineWidth   = 1.5;
      overlayCtx.beginPath();
      overlayCtx.roundRect(x, y, cellW, cellH, 3);
      overlayCtx.fill();
      overlayCtx.stroke();
    }
  }
}

function drawHeatmap() {
  if (!overlayCtx) return;
  clearOverlay();
  if (!showHeatmap) return;

  const state = getState();
  if (!state) return;

  const dims = getCellDimensions();
  if (!dims) return;
  const { cellW, cellH, gap } = dims;

  const dangerMap = getCurrentDangerMap();

  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      if (state.board[r][c] === -1) continue;
      const d = dangerMap[r][c];
      const x = c * (cellW + gap);
      const y = r * (cellH + gap);
      const red   = Math.round(d * 239);
      const green = Math.round((1 - d) * 120);
      overlayCtx.fillStyle = `rgba(${red}, ${green}, 40, ${0.12 + d * 0.35})`;
      overlayCtx.beginPath();
      overlayCtx.roundRect(x, y, cellW, cellH, 3);
      overlayCtx.fill();
    }
  }
}

function refreshOverlay() {
  resizeOverlay();
  clearOverlay();
  if (showHeatmap)  drawHeatmap();
  if (showBFSZones) drawBFSZones();
}

function toggleHeatmap() {
  showHeatmap  = !showHeatmap;
  if (showHeatmap) showBFSZones = false;
  refreshOverlay();
  return showHeatmap;
}
function toggleBFSZones() {
  showBFSZones = !showBFSZon/es;
  if (showBFSZones) showHeatmap = false;
  refreshOverlay();
  return showBFSZones;
}

function updateDepthBadge(depth) {
  const badge = document.querySelector('.algo-section .as-badge');
  if (badge) badge.textContent = `depth ${depth} (adaptive)`;

  const sub = document.getElementById('ai-think-detail');
  if (sub) sub.textContent = `Running Minimax depth-${depth} + Alpha-Beta + Move Ordering…`;
}

function renderMinimaxTree(searchData) {
  if (!minimaxTreeEl || !searchData) return;
  const { tree, moveScores, bestScore, depthUsed } = searchData;

  minimaxTreeEl.innerHTML = '';

  
  if (depthUsed) updateDepthBadge(depthUsed);


  const rootDiv = document.createElement('div');
  rootDiv.className = 'tree-node';
  rootDiv.innerHTML = `
    <span class="tree-type max">ROOT·MAX</span>
    <span class="tree-score best">score: ${typeof bestScore === 'number' ? bestScore.toFixed(1) : bestScore}</span>
    <span style="color:var(--text-muted);font-size:8px;margin-left:6px">depth: ${depthUsed || MINIMAX_DEPTH}</span>
  `;
  minimaxTreeEl.appendChild(rootDiv);

  const orderNote = document.createElement('div');
  orderNote.style.cssText = 'font-size:9px;color:var(--text-muted);padding:2px 0 4px 4px;border-left:2px solid var(--text-muted);margin-bottom:4px;opacity:0.7';
  orderNote.textContent = '↑ moves pre-sorted by quick BFS eval (better α-β pruning)';
  minimaxTreeEl.appendChild(orderNote);

  if (tree && tree.children) {
    tree.children.slice(0, 6).forEach((child) => {
      const row = document.createElement('div');
      row.className = 'tree-node';

      const indent = '  ├─ ';
      const typeClass = child.type === 'MAX' ? 'max' : 'min';
      const scoreClass = child.isBest ? 'tree-score best' : 'tree-score';
      const prunedStr  = child.pruned ? '<span class="tree-pruned"> ✂ pruned</span>' : '';
      const bestStr    = child.isBest ? ' ← BEST' : '';

      row.innerHTML = `
        <span class="tree-indent">${indent}</span>
        <span class="tree-type ${typeClass}">${child.type}</span>
        <span class="tree-move">${child.move}</span>
        <span class="${scoreClass}">${child.pruned ? '✂' : (typeof child.score === 'number' ? child.score.toFixed(1) : child.score)}</span>
        ${prunedStr}
        <span style="color:var(--accent);font-size:8px">${bestStr}</span>
      `;
      minimaxTreeEl.appendChild(row);

      if (child.children && !child.pruned) {
        child.children.slice(0, 3).forEach(grandchild => {
          const gc = document.createElement('div');
          gc.className = 'tree-node';
          const gcType   = grandchild.type === 'MAX' ? 'max' : 'min';
          const gcScore  = grandchild.pruned ? '✂' : (typeof grandchild.score === 'number' ? grandchild.score.toFixed(1) : grandchild.score);
          const gcPruned = grandchild.pruned ? '<span class="tree-pruned"> ✂</span>' : '';
          gc.innerHTML = `
            <span class="tree-indent">  │  └─ </span>
            <span class="tree-type ${gcType}" style="font-size:7px">${grandchild.type}</span>
            <span class="tree-move">${grandchild.move}</span>
            <span class="tree-score" style="font-size:8px">${gcScore}</span>
            ${gcPruned}
          `;
          minimaxTreeEl.appendChild(gc);
        });

        if (child.children.length > 3) {
          const more = document.createElement('div');
          more.className = 'tree-node';
          more.innerHTML = `<span class="tree-indent">  │  └─ </span><span style="color:var(--text-muted);font-size:8px">+${child.children.length - 3} more…</span>`;
          minimaxTreeEl.appendChild(more);
        }
      }
    });

    if (tree.children.length > 6) {
      const more = document.createElement('div');
      more.style.cssText = 'font-size:9px;color:var(--text-muted);padding:3px 0';
      more.textContent = `  +${tree.children.length - 6} more root branches…`;
      minimaxTreeEl.appendChild(more);
    }
  }
}


function renderAlphaBeta(searchData) {
  if (!searchData) return;

  const { nodesVisited, nodesPruned, pruneLog, depthUsed } = searchData;
  const total = nodesVisited + nodesPruned;
  const efficiency = total > 0 ? Math.round((nodesPruned / total) * 100) : 0;

  document.getElementById('ab-nodes').textContent   = nodesVisited;
  document.getElementById('ab-pruned').textContent  = nodesPruned;
  document.getElementById('ab-eff').textContent     = efficiency + '%';

  const depthEl = document.getElementById('ab-depth');
  if (depthEl) depthEl.textContent = depthUsed || MINIMAX_DEPTH;

  if (!abLogEl) return;
  abLogEl.innerHTML = '';

  if (pruneLog.length === 0) {
    abLogEl.innerHTML = '<div class="log-empty">No pruning occurred</div>';
    return;
  }

  pruneLog.slice(-8).forEach(entry => {
    const div = document.createElement('div');
    div.className = 'ab-entry';
    div.innerHTML = `<span class="cut">✂ ${entry.type}</span> at depth ${entry.depth} — move ${entry.move} — α=${entry.alpha}, β=${entry.beta}`;
    abLogEl.appendChild(div);
  });
}

function renderBFSSteps(playerNum) {
  const detailed = getMobilityDetailed(playerNum);
  if (!bfsQueueEl || !bfsStepsEl) return;

  bfsQueueEl.innerHTML = '';
  if (detailed.steps.length > 0) {
    const lastWave = detailed.steps[detailed.steps.length - 1];
    lastWave.cells.slice(0, 12).forEach(cellStr => {
      const span = document.createElement('span');
      span.className = 'bfs-q-cell';
      span.textContent = cellStr;
      bfsQueueEl.appendChild(span);
    });
    if (lastWave.cells.length > 12) {
      const span = document.createElement('span');
      span.className = 'bfs-q-cell';
      span.textContent = `+${lastWave.cells.length - 12}`;
      bfsQueueEl.appendChild(span);
    }
  }

  bfsStepsEl.innerHTML = '';
  detailed.steps.slice(0, 5).forEach(step => {
    const row = document.createElement('div');
    row.className = 'bfs-step-row';
    row.innerHTML = `
      <span class="bfs-step-n">Wave ${step.wave}:</span>
      <span class="bfs-step-v">${step.count} cells explored</span>
    `;
    bfsStepsEl.appendChild(row);
  });
  if (detailed.steps.length > 5) {
    const more = document.createElement('div');
    more.className = 'bfs-step-row';
    more.innerHTML = `<span class="bfs-step-n" style="color:var(--text-muted)">+${detailed.steps.length - 5} more waves…</span>`;
    bfsStepsEl.appendChild(more);
  }
}


function updateHeuristicPanel() {
  const state = getState();
  if (!state) return;

  const { score, breakdown } = getHeuristicBreakdown(state.board, state.p1, state.p2);

  const el = (id) => document.getElementById(id);
  if (el('sb-ai-terr'))  el('sb-ai-terr').textContent  = breakdown.aiTerritory;
  if (el('sb-p1-terr'))  el('sb-p1-terr').textContent  = breakdown.oppTerritory;
  if (el('sb-dist'))     el('sb-dist').textContent     = '+' + (breakdown.distBonus || 0).toFixed(1);
  if (el('sb-imm'))      el('sb-imm').textContent      = (breakdown.immediateScore || 0).toFixed(1);
  if (el('sb-center'))   el('sb-center').textContent   = (breakdown.centerScore   || 0).toFixed(1);
  if (el('sb-wall'))     el('sb-wall').textContent     = (breakdown.wallScore     || 0).toFixed(1);
  if (el('sb-score'))    el('sb-score').textContent    = score.toFixed(1);

  if (el('sb-score')) {
    el('sb-score').style.color = score >= 0 ? 'var(--p2)' : 'var(--p1)';
  }
}

function addMoveScoreBadges() {
  const state = getState();
  if (!state) return;

  const scored = getMovesScored();
  if (scored.length === 0) return;

  const scores = scored.map(s => parseFloat(s.score));
  const maxScore = Math.max(...scores);
  const minScore = Math.min(...scores);

  scored.forEach(({ move, score }) => {
    const cellEl = document.querySelector(
      `#board .cell[data-row="${move.row}"][data-col="${move.col}"]`
    );
    if (!cellEl) return;

    const badge = document.createElement('div');
    badge.className = 'move-score-badge';
    const s = parseFloat(score);
    const t = scores.length > 1 ? (s - minScore) / (maxScore - minScore + 0.001) : 0.5;
    const r = Math.round((1 - t) * 220);
    const g = Math.round(t * 200 + 50);
    badge.style.color = `rgb(${r},${g},40)`;
    badge.textContent = score;
    cellEl.appendChild(badge);
  });
}

function logAlgo(message, type = 'intro') {
  if (!algoLogEl) return;

  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;

  const now = new Date();
  const ts = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;

  entry.innerHTML = `<span class="log-ts">[${ts}]</span>${message}`;
  algoLogEl.appendChild(entry);

  while (algoLogEl.children.length > 60) {
    algoLogEl.removeChild(algoLogEl.firstChild);
  }

  algoLogEl.scrollTop = algoLogEl.scrollHeight;
}

function logMoveAnalysis(playerNum, from, to, searchData) {
  const state = getState();
  const isAI = state.mode === 'pvai' && playerNum === 2;
  const name = playerNum === 1 ? 'P1' : (isAI ? 'AI' : 'P2');
  const type = isAI ? 'ai' : 'move';

  logAlgo(`${name} moved (${from.row},${from.col}) → (${to.row},${to.col})`, type);

  const mob1 = getMobility(1);
  const mob2 = getMobility(2);
  logAlgo(`BFS: P1 territory=${mob1} cells | ${isAI ? 'AI' : 'P2'} territory=${mob2} cells`, 'bfs');

  const { score, breakdown } = getHeuristicBreakdown(state.board, state.p1, state.p2);
  logAlgo(
    `Heuristic: territory(${breakdown.aiTerritory}−${breakdown.oppTerritory}) + imm(${(breakdown.immediateScore||0).toFixed(1)}) + center(${(breakdown.centerScore||0).toFixed(1)}) + wall(${(breakdown.wallScore||0).toFixed(1)}) = ${score.toFixed(1)}`,
    'heur'
  );

  if (isAI && searchData) {
    const depth = searchData.depthUsed || MINIMAX_DEPTH;
    logAlgo(
      `Minimax depth-${depth} (adaptive): explored ${searchData.nodesVisited} nodes, pruned ${searchData.nodesPruned} (${Math.round(searchData.nodesPruned/(searchData.nodesVisited+searchData.nodesPruned+1)*100)}% saved via α-β + move ordering)`,
      'mm'
    );
    if (searchData.pruneLog.length > 0) {
      const lastPrune = searchData.pruneLog[searchData.pruneLog.length - 1];
      logAlgo(`Last α-β cut: depth ${lastPrune.depth}, ${lastPrune.type}, α=${lastPrune.alpha}, β=${lastPrune.beta}`, 'mm');
    }
    logAlgo(`AI chose move ${to.row},${to.col} — score: ${searchData.bestScore.toFixed(1)}`, 'ai');
  }

  const immP1 = getValidMoves(state.board, state.p1.row, state.p1.col).length;
  const immP2 = getValidMoves(state.board, state.p2.row, state.p2.col).length;
  if (immP1 <= 2) logAlgo(`⚠ P1 critically low mobility: ${immP1} immediate moves!`, 'warn');
  if (immP2 <= 2) logAlgo(`⚠ ${isAI ? 'AI' : 'P2'} critically low mobility: ${immP2} immediate moves!`, 'warn');
}

function logGameStart(mode) {
  if (!algoLogEl) return;
  algoLogEl.innerHTML = '';
  logAlgo(`Game started: ${mode === 'pvai' ? 'Player vs AI' : 'Player vs Player'}`, 'intro');
  logAlgo(`Board: 7×7 grid | P1=(0,0) P2=(6,6)`, 'intro');
  logAlgo(`AI: Minimax depth-5 (adaptive up to 8) + Alpha-Beta + Move Ordering`, 'mm');
  logAlgo(`Heuristic: territory×2.5 + immediate×3 + distance + center + wall + isolation`, 'heur');
  logAlgo(`BFS measures territory after every move`, 'bfs');
}