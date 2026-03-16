/**
 * minimax.js — Minimax with Alpha-Beta Pruning + Full Visualization Data
 *
 * Enhanced features:
 *  - Captures search tree nodes for display
 *  - Logs every alpha-beta cutoff
 *  - Tracks nodes visited vs pruned
 *  - Per-move score breakdown
 *  - Configurable AI difficulty (depth)
 */

'use strict';

let MINIMAX_DEPTH = 3;

const SCORE_WIN  =  10000;
const SCORE_LOSE = -10000;

let lastSearchData = {
  nodesVisited: 0,
  nodesPruned:  0,
  pruneLog:     [],
  tree:         null,
  moveScores:   [],
};

function heuristic(board, p1Pos, p2Pos) {
  const aiTerritory  = countReachable(board, p2Pos.row, p2Pos.col);
  const oppTerritory = countReachable(board, p1Pos.row, p1Pos.col);
  const dist         = getManhattanDistance(p1Pos.row, p1Pos.col, p2Pos.row, p2Pos.col);
  const distBonus    = dist * 0.5;

  const score = aiTerritory - oppTerritory + distBonus;
  return { score, breakdown: { aiTerritory, oppTerritory, dist, distBonus } };
}

function minimaxInternal(board, depth, alpha, beta, isMaximizing, p1Pos, p2Pos, treeNode) {
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

  const moves = isMaximizing ? p2Moves : p1Moves;
  let best = isMaximizing ? -Infinity : +Infinity;
  treeNode.children = [];

  for (const move of moves) {
    const childNode = {
      move: `(${move.row},${move.col})`,
      type: isMaximizing ? 'MAX' : 'MIN',
      depth: MINIMAX_DEPTH - depth,
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

    const score = minimaxInternal(board, depth - 1, alpha, beta, !isMaximizing, newPos1, newPos2, childNode);

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
      if (score < beta)  beta  = score;
    }

    childNode.score = score;
    childNode.alpha = alpha;
    childNode.beta  = beta;

    if (beta <= alpha) {
      lastSearchData.nodesPruned++;
      lastSearchData.pruneLog.push({
        depth: MINIMAX_DEPTH - depth,
        alpha: alpha.toFixed(1),
        beta:  beta.toFixed(1),
        move:  `(${move.row},${move.col})`,
        type:  isMaximizing ? 'β-cutoff' : 'α-cutoff',
      });

      const remaining = moves.indexOf(move) + 1;
      if (remaining < moves.length) {
        for (let i = remaining; i < moves.length; i++) {
          treeNode.children.push({
            move: `(${moves[i].row},${moves[i].col})`,
            type: isMaximizing ? 'MAX' : 'MIN',
            pruned: true,
            score: '✂',
          });
          lastSearchData.nodesPruned++;
        }
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

  lastSearchData = {
    nodesVisited: 0,
    nodesPruned:  0,
    pruneLog:     [],
    tree:         { move: 'ROOT', type: 'MAX', depth: 0, children: [] },
    moveScores:   [],
  };

  let bestScore = -Infinity;
  let bestMove  = moves[0];

  for (const move of moves) {
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
      MINIMAX_DEPTH - 1,
      -Infinity, +Infinity,
      false,
      p1Pos, newP2,
      childNode
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

  lastSearchData.tree.children.forEach(c => {
    c.isBest = (c.score === bestScore);
  });
  lastSearchData.tree.score = bestScore;
  lastSearchData.bestScore  = bestScore;
  lastSearchData.bestMove   = bestMove;

  return { move: bestMove, searchData: lastSearchData };
}

function setAIDifficulty(depth) {
  MINIMAX_DEPTH = Math.max(1, Math.min(5, depth));
}

function getHeuristicBreakdown(board, p1Pos, p2Pos) {
  return heuristic(board, p1Pos, p2Pos);
}
