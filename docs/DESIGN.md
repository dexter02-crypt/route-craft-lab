# Route Craft: design notes

The pure search core remains separate from DOM and file-dialog wiring.

## Movement

The default graph has four orthogonal neighbours. Optional diagonal movement adds four diagonal neighbours only when both adjacent orthogonal cells are walkable, preventing corner cutting.

## Costs

Moving into a cell pays that cell's cost: 1, 3 or 6. The start costs zero.

## Algorithms

- A*: cost-optimal with an admissible heuristic.
- Dijkstra: cost-optimal with zero heuristic.
- Bidirectional Dijkstra: simultaneous uniform-cost searches from start and goal. The reverse search charges the forward cost of entering its current node, preserving the asymmetric entry-cost convention.
- BFS: minimizes number of moves, not weighted cost.

For A*, Manhattan distance is used in four-way mode and Chebyshev distance in diagonal mode. The minimum entry cost is 1, so both heuristics are lower bounds.

## Measurement

Expanded-cell counts are deterministic. Browser timing uses `performance.now()` around each search and is presented only as an illustrative local measurement.

## Random maps

The seeded generator is deterministic and carves one walkable horizontal corridor so every generated sample remains solvable.
