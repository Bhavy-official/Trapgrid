# TrapGrid: Strategic Survival — AI Edition

TrapGrid is a grid-based strategy game where players compete to trap each other by controlling space on a 7×7 board. The project integrates core AI algorithms such as Breadth-First Search (BFS), Minimax, and Alpha-Beta Pruning, along with real-time visualizations to make the decision-making process transparent.

---

## Live Demo

https://trapgrid.vercel.app/

---

## Overview

TrapGrid is a turn-based game with two modes:

* Player vs Player
* Player vs AI

Each player moves across the board, and every previous position becomes blocked. The objective is to restrict the opponent’s movement until they have no valid moves left.

The project focuses not only on gameplay but also on explaining how AI works internally through visual and interactive components.

---

## Features

### Core Gameplay

* 7×7 grid-based movement
* Turn-based strategy
* Dynamic blocking of visited cells
* Win condition based on mobility restriction

### AI System

* Minimax algorithm for decision-making
* Alpha-Beta pruning for optimization
* Heuristic evaluation for non-terminal states
* Depth-limited search (depth = 3)

### Visualization Tools

* BFS territory zones (player space control)
* Danger heatmap (risk visualization)
* Minimax decision tree
* Alpha-Beta pruning logs
* Move score badges (heuristic values on board)

### UI/UX Enhancements

* Interactive board with hover effects
* Help panel explaining rules and AI concepts
* Algorithm activity log
* Responsive design

---

## Game Logic

### Movement

* Players move in 4 directions (up, down, left, right)
* Previously occupied cells become blocked
* Valid moves are dynamically calculated

### Win Condition

A player loses when they have no valid moves remaining.

---

## AI Implementation

### 1. Breadth-First Search (BFS) — Territory Calculation

BFS is used as a flood-fill algorithm to calculate how many cells each player can reach.

#### Process:

1. Start from player position
2. Add to queue
3. Explore neighbors
4. Mark visited cells
5. Count total reachable cells

This count represents the player’s territory or “breathing room”.

---

### 2. Heuristic Function

The heuristic evaluates a game state when Minimax reaches the depth limit.

#### Formula:

Score = AI_Territory - Player_Territory + Distance_Bonus

#### Components:

* Territory difference (via BFS)
* Distance between players (encourages spacing)
* Positive score → AI advantage
* Negative score → Player advantage

---

### 3. Minimax Algorithm

Minimax simulates future moves to determine the best possible action.

#### Key Idea:

* AI (MAX) tries to maximize score
* Player (MIN) tries to minimize score

#### Flow:

1. Generate all valid moves
2. Simulate each move
3. Recursively explore future states
4. Stop at depth limit
5. Evaluate using heuristic
6. Backpropagate scores
7. Choose best move

---

### 4. Alpha-Beta Pruning

Optimization technique used with Minimax.

#### Concept:

* Alpha (α): best score for MAX so far
* Beta (β): best score for MIN so far

#### Condition:

If α ≥ β → prune branch

This reduces unnecessary computations without affecting the final result.

---

## Visualization System

The project includes a custom visualization engine:

### Minimax Tree

* Displays explored nodes
* Shows MAX/MIN levels
* Highlights best move
* Marks pruned branches

### Alpha-Beta Logs

* Nodes visited
* Nodes pruned
* Efficiency percentage
* Detailed pruning steps

### BFS Visualization

* Territory zones per player
* Step-by-step expansion

### Heatmap

* Displays danger level of each cell
* Color-coded risk zones

### Move Score Badges

* Shows heuristic score for each possible move
* Color gradient from weak (red) to strong (green)

---

## Help Panel

An integrated help system explains:

* Game rules
* AI algorithms (BFS, Minimax, Alpha-Beta)
* Strategy tips

This ensures the system is not a “black box” and improves user understanding.

---

## Project Structure

/css
style.css

/js
main.js
visualizer.js

/index.html

---

## Technologies Used

* HTML5
* CSS3 (animations, responsive design)
* JavaScript (ES6)
* Canvas API (visual overlays)

---

## Key Concepts Demonstred

* Graph traversal (BFS)
* Game tree search (Minimax)
* Optimization (Alpha-Beta pruning)
* Heuristic evaluation
* Real-time visualization

---

## How to Run

1. Clone the repository
2. Open `index.html` in a browser

No additional setup required.

---

## Future Improvements

* Adjustable AI difficulty (dynamic depth)
* Multiplayer over network
* Advanced heuristics
* Performance optimizations
* Mobile UX enhancements

---

## Conclusion

TrapGrid combines game design with AI concepts to create an interactive and educational experience. It not only implements core algorithms but also visualizes them, making it easier to understand how AI decisions are made in real time.

---

### Made By Bhavy Manchanda
