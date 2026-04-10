/**
 * minimax.js — Minimax with Alpha-Beta Pruning + Full Visualization Data
 *
 * UPGRADED:
 *  - Adaptive depth (deeper when fewer moves available)
 *  - Move ordering (best moves first = more pruning)
 *  - Richer heuristic: territory, isolation, wall traps, center control
 *  - Endgame awareness: recognizes "dead zones" where you'll be sealed off
 *  - depthUsed stored in searchData for real-time panel display
 */

'use strict';

let MINIMAX_DEPTH = 5;
const MAX_DEPTH_ADAPTIVE = 8;

const SCORE_WIN  =  100000;
const SCORE_LOSE = -100000;

const CENTER_BONUS = (() => {
  const tbl = [];
  for (let r = 0; r < 7; r++) {
    tbl[r] = [];
    for (let c = 0; c < 7; c++) {
      const dr = Math.abs(r - 3), dc = Math.abs(c - 3);
      tbl[r][c] = 6 - (dr + dc);
    }
  }
  return tbl;
})();

let lastSearchData = {
  nodesVisited: 0,
  nodesPruned:  0,
  pruneLog:     [],
  tree:         null,
  moveScores:   [],
  depthUsed:    5,
};

function heuristic(board, p1Pos, p2Pos) {
  const aiMobility  = countReachable(board, p2Pos.row, p2Pos.col);
  const oppMobility = countReachable(board, p1Pos.row, p1Pos.col);

  const aiImmediate  = getValidMoves(board, p2Pos.row, p2Pos.col).length;
  const oppImmediate = getValidMoves(board, p1Pos.row, p1Pos.col).length;

  const territoryScore  = (aiMobility - oppMobility) * 2.5;
  const immediateScore  = (aiImmediate - oppImmediate) * 3.0;
  const dist            = getManhattanDistance(p1Pos.row, p1Pos.col, p2Pos.row, p2Pos.col);
  const distScore       = dist * 0.3;
  const aiCenter        = CENTER_BONUS[p2Pos.row][p2Pos.col] * 0.4;
  const oppCenter       = CENTER_BONUS[p1Pos.row][p1Pos.col] * 0.4;
  const centerScore     = aiCenter - oppCenter;
  const aiWallDanger    = getWallDanger(board, p2Pos);
  const oppWallDanger   = getWallDanger(board, p1Pos);
  const wallScore       = (oppWallDanger - aiWallDanger) * 1.5;
  const isolationPenalty = getIsolationPenalty(aiMobility, aiImmediate);
  const isolationBonus   = getIsolationBonus(oppMobility, oppImmediate);

  const score = territoryScore + immediateScore + distScore + centerScore + wallScore - isolationPenalty + isolationBonus;

  return {
    score,
    breakdown: {
      aiTerritory:    aiMobility,
      oppTerritory:   oppMobility,
      dist,
      distBonus:      distScore,
      immediateScore,
      centerScore,
      wallScore,
    },
  };
}

function getWallDanger(board, pos) {
  const moves = getValidMoves(board, pos.row, pos.col);
  const isEdge   = pos.row === 0 || pos.row === 6 || pos.col === 0 || pos.col === 6;
  const isCorner = (pos.row === 0 || pos.row === 6) && (pos.col === 0 || pos.col === 6);
  let danger = 0;
  if (isCorner) danger += 4;
  else if (isEdge) danger += 2;
  danger += Math.max(0, 2 - moves.length) * 3;
  return danger;
}

function getIsolationPenalty(mobility, immediate) {
  if (immediate === 0) return 200;
  if (mobility < 4)   return 80;
  if (mobility < 8)   return 40;
  if (mobility < 12)  return 15;
  return 0;
}

function getIsolationBonus(oppMobility, oppImmediate) {
  if (oppImmediate === 0) return 300;
  if (oppMobility < 4)   return 80;
  if (oppMobility < 8)   return 35;
  return 0;
}

function orderMoves(board, moves, isMaximizing, p1Pos, p2Pos) {
  const scored = moves.map(move => {
    let score = 0;

    if (isMaximizing) {
      board[p2Pos.row][p2Pos.col] = -1;
      board[move.row][move.col] = 2;
      score  = countReachable(board, move.row, move.col) * 2;
      score -= countReachable(board, p1Pos.row, p1Pos.col);
      board[move.row][move.col] = 0;
      board[p2Pos.row][p2Pos.col] = 2;
    } else {
      board[p1Pos.row][p1Pos.col] = -1;
      board[move.row][move.col] = 1;
      score  = -countReachable(board, move.row, move.col);
      score += countReachable(board, p2Pos.row, p2Pos.col) * 2;
      board[move.row][move.col] = 0;
      board[p1Pos.row][p1Pos.col] = 1;
    }

    score += CENTER_BONUS[move.row][move.col] * 0.2;
    return { move, score };
  });

  scored.sort((a, b) => isMaximizing ? b.score - a.score : a.score - b.score);
  return scored.map(s => s.move);
}

function getAdaptiveDepth(board, p1Pos, p2Pos) {
  const ai  = getValidMoves(board, p2Pos.row, p2Pos.col).length;
  const opp = getValidMoves(board, p1Pos.row, p1Pos.col).length;
  const minMoves = Math.min(ai, opp);

  if (minMoves <= 2) return Math.min(MAX_DEPTH_ADAPTIVE, MINIMAX_DEPTH + 3);
  if (minMoves <= 4) return Math.min(MAX_DEPTH_ADAPTIVE, MINIMAX_DEPTH + 2);
  if (minMoves <= 6) return Math.min(MAX_DEPTH_ADAPTIVE, MINIMAX_DEPTH + 1);
  return MINIMAX_DEPTH;
}

function minimaxInternal(board, depth, alpha, beta, isMaximizing, p1Pos, p2Pos, treeNode, rootDepth) {
  lastSearchData.nodesVisited++;

  const p1Moves = getValidMoves(board, p1Pos.row, p1Pos.col);
  const p2Moves = getValidMoves(board, p2Pos.row, p2Pos.col);

  if (isMaximizing && p2Moves.length === 0) {
    treeNode.score = SCORE_LOSE; treeNode.terminal = 'AI trapped';
    return SCORE_LOSE;
  }
  if (!isMaximizing && p1Moves.length === 0) {
    treeNode.score = SCORE_WIN; treeNode.terminal = 'P1 trapped';
    return SCORE_WIN;
  }

  if (depth === 0) {
    const { score, breakdown } = heuristic(board, p1Pos, p2Pos);
    treeNode.score = score;
    treeNode.breakdown = breakdown;
    treeNode.leaf = true;
    return score;
  }

  const rawMoves = isMaximizing ? p2Moves : p1Moves;
  const moves    = orderMoves(board, rawMoves, isMaximizing, p1Pos, p2Pos);

  let best = isMaximizing ? -Infinity : +Infinity;
  treeNode.children = [];

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];

    const childNode = {
      move: `(${move.row},${move.col})`,
      type: isMaximizing ? 'MAX' : 'MIN',
      depth: rootDepth - depth,
      pruned: false,
      children: [],
    };
    treeNode.children.push(childNode);

    let oldRow, oldCol, newPos1, newPos2;
    if (isMaximizing) {
      oldRow = p2Pos.row; oldCol = p2Pos.col;
      board[oldRow][oldCol] = -1;
      board[move.row][move.col] = 2;
      newPos2 = { row: move.row, col: move.col };
      newPos1 = p1Pos;
    } else {
      oldRow = p1Pos.row; oldCol = p1Pos.col;
      board[oldRow][oldCol] = -1;
      board[move.row][move.col] = 1;
      newPos1 = { row: move.row, col: move.col };
      newPos2 = p2Pos;
    }

    const score = minimaxInternal(board, depth - 1, alpha, beta, !isMaximizing, newPos1, newPos2, childNode, rootDepth);

    if (isMaximizing) {
      board[move.row][move.col] = 0;
      board[oldRow][oldCol] = 2;
    } else {
      board[move.row][move.col] = 0;
      board[oldRow][oldCol] = 1;
    }

    if (isMaximizing) {
      if (score > best) best = score;
      if (score > alpha) alpha = score;
    } else {
      if (score < best) best = score;
      if (score < beta)  beta = score;
    }

    childNode.score = score;
    childNode.alpha = alpha;
    childNode.beta  = beta;

    if (beta <= alpha) {
      lastSearchData.nodesPruned++;
      lastSearchData.pruneLog.push({
        depth: rootDepth - depth,
        alpha: alpha.toFixed(1),
        beta:  beta.toFixed(1),
        move:  `(${move.row},${move.col})`,
        type:  isMaximizing ? 'β-cutoff' : 'α-cutoff',
      });

      for (let j = i + 1; j < moves.length; j++) {
        treeNode.children.push({
          move: `(${moves[j].row},${moves[j].col})`,
          type: isMaximizing ? 'MAX' : 'MIN',
          pruned: true,
          score: '✂',
        });
        lastSearchData.nodesPruned++;
      }
      break;
    }
  }

  treeNode.score = best;
  return best;
}

function getBestAIMove(board, p1Pos, p2Pos) {
  const moves = getValidMoves(board, p2Pos.row, p2Pos.col);
  if (moves.length === 0) return null;

  const depth = getAdaptiveDepth(board, p1Pos, p2Pos);
  MINIMAX_DEPTH = depth;

  lastSearchData = {
    nodesVisited: 0,
    nodesPruned:  0,
    pruneLog:     [],
    tree:         { move: 'ROOT', type: 'MAX', depth: 0, children: [] },
    moveScores:   [],
    depthUsed:    depth,
  };

  const orderedMoves = orderMoves(board, moves, true, p1Pos, p2Pos);

  let bestScore = -Infinity;
  let bestMove  = orderedMoves[0];

  for (const move of orderedMoves) {
    const childNode = {
      move: `(${move.row},${move.col})`,
      type: 'MAX',
      depth: 0,
      children: [],
    };
    lastSearchData.tree.children.push(childNode);

    const oldRow = p2Pos.row, oldCol = p2Pos.col;
    board[oldRow][oldCol] = -1;
    board[move.row][move.col] = 2;
    const newP2 = { row: move.row, col: move.col };

    const score = minimaxInternal(
      board,
      depth - 1,
      -Infinity, +Infinity,
      false,
      p1Pos, newP2,
      childNode,
      depth
    );

    board[move.row][move.col] = 0;
    board[oldRow][oldCol] = 2;

    childNode.score = score;
    childNode.isBestCandidate = score >= bestScore;

    lastSearchData.moveScores.push({ move, score });

    if (score > bestScore) {
      bestScore = score;
      bestMove  = move;
    }
  }

  lastSearchData.tree.children.forEach(c => { c.isBest = (c.score === bestScore); });
  lastSearchData.tree.score = bestScore;
  lastSearchData.bestScore  = bestScore;
  lastSearchData.bestMove   = bestMove;

  return { move: bestMove, searchData: lastSearchData };
}

function setAIDifficulty(depth) {
  MINIMAX_DEPTH = Math.max(1, Math.min(MAX_DEPTH_ADAPTIVE, depth));
}

function getHeuristicBreakdown(board, p1Pos, p2Pos) {
  return heuristic(board, p1Pos, p2Pos);
}