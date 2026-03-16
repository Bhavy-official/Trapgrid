/**
 * game.js — Core Game State & Logic
 *
 * Enhanced with:
 *  - Move history log
 *  - Per-move heuristic snapshots
 *  - AI search result storage for visualization
 *  - Danger map integration
 */

'use strict';

const CELL_EMPTY   =  0;
const CELL_P1      =  1;
const CELL_P2      =  2;
const CELL_BLOCKED = -1;

let gameState = null;

function initGame(mode) {
  const board = Array.from({ length: 7 }, () => new Array(7).fill(CELL_EMPTY));
  board[0][0] = CELL_P1;
  board[6][6] = CELL_P2;

  gameState = {
    mode,
    board,
    p1: { row: 0, col: 0, moves: 0 },
    p2: { row: 6, col: 6, moves: 0 },
    currentPlayer: 1,
    gameOver: false,
    winner: null,
    validMoves: [],
    moveHistory: [],
    lastAISearchData: null,
    turnNumber: 0,
  };

  refreshValidMoves();
  return gameState;
}

function refreshValidMoves() {
  const { board, currentPlayer, p1, p2 } = gameState;
  const pos = currentPlayer === 1 ? p1 : p2;
  gameState.validMoves = getValidMoves(board, pos.row, pos.col);
}

function executeMove(toRow, toCol) {
  if (gameState.gameOver) return null;

  const { board, currentPlayer } = gameState;
  const player = currentPlayer === 1 ? gameState.p1 : gameState.p2;

  const isValid = gameState.validMoves.some(m => m.row === toRow && m.col === toCol);
  if (!isValid) return null;

  const blockedCell = { row: player.row, col: player.col };

  board[player.row][player.col] = CELL_BLOCKED;
  player.row = toRow;
  player.col = toCol;
  board[toRow][toCol] = currentPlayer === 1 ? CELL_P1 : CELL_P2;
  player.moves++;
  gameState.turnNumber++;

  const { score, breakdown } = getHeuristicBreakdown(board, gameState.p1, gameState.p2);

  gameState.moveHistory.push({
    turn:       gameState.turnNumber,
    player:     currentPlayer,
    from:       { row: blockedCell.row, col: blockedCell.col },
    to:         { row: toRow, col: toCol },
    heurScore:  score.toFixed(1),
    breakdown,
  });

  gameState.currentPlayer = currentPlayer === 1 ? 2 : 1;
  refreshValidMoves();

  let winner = null;
  if (gameState.validMoves.length === 0) {
    gameState.gameOver = true;
    gameState.winner   = currentPlayer;
    winner = currentPlayer;
  }

  return { blocked: blockedCell, moved: { row: toRow, col: toCol }, gameOver: gameState.gameOver, winner };
}

function triggerAIMove() {
  const { board, p1, p2 } = gameState;
  const result = getBestAIMove(board, p1, p2);
  if (!result) return null;

  gameState.lastAISearchData = result.searchData;

  const moveResult = executeMove(result.move.row, result.move.col);
  return moveResult;
}

function getMobility(playerNum) {
  const { board, p1, p2 } = gameState;
  const pos = playerNum === 1 ? p1 : p2;
  return countReachable(board, pos.row, pos.col);
}

function getMobilityDetailed(playerNum) {
  const { board, p1, p2 } = gameState;
  const pos = playerNum === 1 ? p1 : p2;
  return countReachableWithSteps(board, pos.row, pos.col);
}

function countBlockedCells() {
  let count = 0;
  for (const row of gameState.board)
    for (const cell of row)
      if (cell === CELL_BLOCKED) count++;
  return count;
}

function getCurrentTerritoryMap() {
  const { board, p1, p2 } = gameState;
  return getTerritoryMap(board, p1.row, p1.col, p2.row, p2.col);
}

function getCurrentDangerMap() {
  const { board, p1, p2 } = gameState;
  return getDangerMap(board, p1.row, p1.col, p2.row, p2.col);
}

function getMovesScored() {
  const { board, validMoves, currentPlayer, p1, p2 } = gameState;
  if (validMoves.length === 0) return [];

  return validMoves.map(move => {
    const pos = currentPlayer === 1 ? p1 : p2;
    const oldR = pos.row, oldC = pos.col;
    board[oldR][oldC] = CELL_BLOCKED;
    board[move.row][move.col] = currentPlayer === 1 ? CELL_P1 : CELL_P2;
    const newP1 = currentPlayer === 1 ? { row: move.row, col: move.col } : p1;
    const newP2 = currentPlayer === 2 ? { row: move.row, col: move.col } : p2;

    const { score } = getHeuristicBreakdown(board, newP1, newP2);

    board[move.row][move.col] = CELL_EMPTY;
    board[oldR][oldC] = currentPlayer === 1 ? CELL_P1 : CELL_P2;

    return { move, score: score.toFixed(1) };
  });
}

function getState() {
  return gameState;
}
