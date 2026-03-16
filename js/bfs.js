/**
 * bfs.js — BFS Utilities for Trap Grid AI Edition
 *
 * Enhanced with:
 *  - Step-by-step logging for visualization
 *  - Territory map (which cells each player can reach)
 *  - Danger score computation per cell
 */

'use strict';

const DIRECTIONS = [
  [-1,  0],
  [ 1,  0],
  [ 0, -1],
  [ 0,  1],
];

function getValidMoves(board, row, col) {
  const SIZE = board.length;
  const moves = [];
  for (const [dr, dc] of DIRECTIONS) {
    const nr = row + dr, nc = col + dc;
    if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) continue;
    if (board[nr][nc] !== 0) continue;
    moves.push({ row: nr, col: nc });
  }
  return moves;
}

function countReachable(board, startRow, startCol) {
  const SIZE = board.length;
  const visited = Array.from({ length: SIZE }, () => new Array(SIZE).fill(false));
  const queue = [{ row: startRow, col: startCol }];
  visited[startRow][startCol] = true;
  let count = 0;

  while (queue.length > 0) {
    const { row, col } = queue.shift();
    count++;
    for (const [dr, dc] of DIRECTIONS) {
      const nr = row + dr, nc = col + dc;
      if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) continue;
      if (visited[nr][nc]) continue;
      if (board[nr][nc] !== 0) continue;
      visited[nr][nc] = true;
      queue.push({ row: nr, col: nc });
    }
  }
  return count;
}

function countReachableWithSteps(board, startRow, startCol) {
  const SIZE = board.length;
  const visited = Array.from({ length: SIZE }, () => new Array(SIZE).fill(false));
  const visitedMap = Array.from({ length: SIZE }, () => new Array(SIZE).fill(false));

  let currentWave = [{ row: startRow, col: startCol }];
  visited[startRow][startCol] = true;
  visitedMap[startRow][startCol] = true;

  let count = 0;
  const steps = [];
  let waveNum = 0;

  while (currentWave.length > 0) {
    const waveCells = currentWave.map(c => `(${c.row},${c.col})`);
    steps.push({ wave: waveNum, cells: waveCells, count: currentWave.length });

    const nextWave = [];
    for (const { row, col } of currentWave) {
      count++;
      for (const [dr, dc] of DIRECTIONS) {
        const nr = row + dr, nc = col + dc;
        if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) continue;
        if (visited[nr][nc]) continue;
        if (board[nr][nc] !== 0) continue;
        visited[nr][nc] = true;
        visitedMap[nr][nc] = true;
        nextWave.push({ row: nr, col: nc });
      }
    }
    currentWave = nextWave;
    waveNum++;
  }

  return { count, steps, visitedMap };
}

function getTerritoryMap(board, p1Row, p1Col, p2Row, p2Col) {
  const SIZE = board.length;

  function getReachableSet(startRow, startCol) {
    const visited = Array.from({ length: SIZE }, () => new Array(SIZE).fill(false));
    const queue = [{ row: startRow, col: startCol }];
    visited[startRow][startCol] = true;
    const reachable = new Set();
    reachable.add(`${startRow},${startCol}`);

    while (queue.length > 0) {
      const { row, col } = queue.shift();
      for (const [dr, dc] of DIRECTIONS) {
        const nr = row + dr, nc = col + dc;
        if (nr < 0 || nr >= SIZE || nc < 0 || nc >= SIZE) continue;
        if (visited[nr][nc]) continue;
        if (board[nr][nc] !== 0) continue;
        visited[nr][nc] = true;
        reachable.add(`${nr},${nc}`);
        queue.push({ row: nr, col: nc });
      }
    }
    return reachable;
  }

  const p1Set = getReachableSet(p1Row, p1Col);
  const p2Set = getReachableSet(p2Row, p2Col);

  const map = Array.from({ length: SIZE }, () => new Array(SIZE).fill('none'));
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const key = `${r},${c}`;
      const inP1 = p1Set.has(key);
      const inP2 = p2Set.has(key);
      if (inP1 && inP2) map[r][c] = 'both';
      else if (inP1)    map[r][c] = 'p1';
      else if (inP2)    map[r][c] = 'p2';
    }
  }
  return map;
}

function getDangerMap(board, p1Row, p1Col, p2Row, p2Col) {
  const SIZE = board.length;
  const danger = Array.from({ length: SIZE }, () => new Array(SIZE).fill(0));

  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === -1) continue;

      const distToP2 = getManhattanDistance(r, c, p2Row, p2Col);
      const distToP1 = getManhattanDistance(r, c, p1Row, p1Col);

      const maxDist = SIZE * 2;
      const raw = (maxDist - distToP2) / maxDist;
      danger[r][c] = Math.max(0, Math.min(1, raw));
    }
  }
  return danger;
}

function isTrapped(board, row, col) {
  return getValidMoves(board, row, col).length === 0;
}

function getManhattanDistance(r1, c1, r2, c2) {
  return Math.abs(r1 - r2) + Math.abs(c1 - c2);
}
