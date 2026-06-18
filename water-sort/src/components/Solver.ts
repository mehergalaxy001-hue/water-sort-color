/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Bottle } from "../types";

/**
 * Checks if the current state of bottles is fully complete (solved).
 * Every bottle must be empty OR fully filled with 4 of the exact same color.
 */
export function checkIsSolved(bottles: Bottle[]): boolean {
  for (const b of bottles) {
    if (b.length === 0) continue;
    if (b.length !== 4) return false;
    const first = b[0];
    for (const val of b) {
      if (val !== first) return false;
    }
  }
  return true;
}

/**
 * Returns a canonical string of the bottles state to prevent cycles.
 * Sorting the bottle signatures matches states that are structurally identical
 * regardless of the bottles' absolute grid placement.
 */
function getNormalizedStateKey(bottles: Bottle[]): string {
  return bottles
    .map((b) => b.join(","))
    .sort()
    .join("|");
}

/**
 * Checks if we can pour from source to target.
 * Returns the amount of layers that would be poured.
 */
export function getPourAmount(source: Bottle, target: Bottle): number {
  if (source.length === 0) return 0;
  if (target.length >= 4) return 0;

  const sourceColor = source[source.length - 1];
  if (target.length > 0) {
    const targetColor = target[target.length - 1];
    if (sourceColor !== targetColor) return 0;
  }

  // Count contiguous items of matching color on top of source
  let pourCount = 0;
  for (let i = source.length - 1; i >= 0; i--) {
    if (source[i] === sourceColor) {
      pourCount++;
    } else {
      break;
    }
  }

  // Cap at target's remaining capacity
  const remainingTargetCapacity = 4 - target.length;
  return Math.min(pourCount, remainingTargetCapacity);
}

export interface SolverMove {
  from: number;
  to: number;
}

/**
 * Backtrack solver using Breadth-First Search or Depth-First Search.
 * Finds the shortest sequence of valid moves to solve the state.
 */
export function solveWaterSort(
  bottles: Bottle[],
  maxDepth: number = 3000
): SolverMove[] | null {
  interface Node {
    state: Bottle[];
    moves: SolverMove[];
  }

  const queue: Node[] = [{ state: bottles.map(b => [...b]), moves: [] }];
  const visited = new Set<string>();
  visited.add(getNormalizedStateKey(bottles));

  let nodesProcessed = 0;

  while (queue.length > 0 && nodesProcessed < maxDepth) {
    const current = queue.shift()!;
    nodesProcessed++;

    if (checkIsSolved(current.state)) {
      return current.moves;
    }

    const n = current.state.length;
    for (let i = 0; i < n; i++) {
      const src = current.state[i];
      if (src.length === 0) continue;

      // Special optimization: If a bottle is already completely solved, do not move elements out of it.
      if (src.length === 4 && src.every(x => x === src[0])) {
        continue;
      }

      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        const tgt = current.state[j];

        const amt = getPourAmount(src, tgt);
        if (amt > 0) {
          // Check heuristic: Moving components to empty bottles should only be done if:
          // 1. Source contains MORE than one color.
          // (Moving a pure column of a single color to another empty bottle does not solve anything, it just shifts it)
          if (tgt.length === 0) {
            const isSourceSingleColor = src.every((x) => x === src[0]);
            if (isSourceSingleColor) {
              continue; // Avoid redundant shuffle
            }
          }

          // Execute transition
          const srcCopy = [...src];
          const tgtCopy = [...tgt];
          const colorToPour = srcCopy[srcCopy.length - 1];

          for (let p = 0; p < amt; p++) {
            srcCopy.pop();
            tgtCopy.push(colorToPour);
          }

          const newState = current.state.map((b, idx) => {
            if (idx === i) return srcCopy;
            if (idx === j) return tgtCopy;
            return [...b];
          });

          const key = getNormalizedStateKey(newState);
          if (!visited.has(key)) {
            visited.add(key);
            queue.push({
              state: newState,
              moves: [...current.moves, { from: i, to: j }],
            });
          }
        }
      }
    }
  }

  return null; // Unsolvable or exceed depth
}

/**
 * Generate a randomized, guranteed-solvable Water Sort level board.
 * - `numColors`: count of full colored columns
 * - `numEmpty`: count of empty target columns (usually 2)
 */
export function generateSolvableLevel(numColors: number, numEmpty: number): Bottle[] {
  let attempts = 0;
  const maxSearchDepth = numColors > 8 ? 200 : 400; // Keep depth small for high-velocity lookups
  const maxAttempts = numColors > 8 ? 4 : 20; // Reduce heavy random attempts on hard mode

  while (attempts < maxAttempts) {
    attempts++;

    // 1. Generate items pool: 4 of each color ID (1 to numColors)
    const pool: number[] = [];
    for (let c = 1; c <= numColors; c++) {
      pool.push(c, c, c, c);
    }

    // 2. Shuffle colors randomly
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    // 3. Fill bottles
    const bottles: Bottle[] = [];
    for (let i = 0; i < numColors; i++) {
      bottles.push(pool.slice(i * 4, i * 4 + 4));
    }
    for (let i = 0; i < numEmpty; i++) {
      bottles.push([]);
    }

    // Ensure the generated board is not ALREADY solved!
    if (checkIsSolved(bottles)) {
      continue;
    }

    // 4. Test solvability with optimized depth
    const solution = solveWaterSort(bottles, maxSearchDepth);
    if (solution !== null && solution.length >= numColors * 1.2) {
      // It's solvable, and has a reasonable difficulty (requires at least general sorting complexity)
      return bottles;
    }
  }

  // Fallback: If random shuffling struggles to test solvable in time, build via back-pour simulation
  return generateByReversePours(numColors, numEmpty);
}

/**
 * Generate by starting from a solved state and doing reverse pours to guarantee solvability.
 */
function generateByReversePours(numColors: number, numEmpty: number): Bottle[] {
  // Initialize fully solved grid
  const bottles: Bottle[] = [];
  for (let c = 1; c <= numColors; c++) {
    bottles.push([c, c, c, c]);
  }
  for (let i = 0; i < numEmpty; i++) {
    bottles.push([]);
  }

  const movesCount = numColors * 6 + Math.floor(Math.random() * 8);
  for (let m = 0; m < movesCount; m++) {
    // Pick random non-empty source bottle and non-full target, shift top element
    const nonEmpties = bottles.map((b, idx) => ({ b, idx })).filter(o => o.b.length > 0);
    const nonFulls = bottles.map((b, idx) => ({ b, idx })).filter(o => o.b.length < 4);

    if (nonEmpties.length === 0 || nonFulls.length === 0) continue;

    const srcObj = nonEmpties[Math.floor(Math.random() * nonEmpties.length)];
    const tgtObj = nonFulls[Math.floor(Math.random() * nonFulls.length)];

    if (srcObj.idx === tgtObj.idx) continue;

    // Shift one block representing reverse pour complexity
    const item = srcObj.b.pop()!;
    tgtObj.b.push(item);
  }

  return bottles;
}
