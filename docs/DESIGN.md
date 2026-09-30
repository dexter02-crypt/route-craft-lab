# Route Craft: design notes

Choose a map and press **Compare routes**. Both searches run on the same map; choose A* or Dijkstra to animate its expanded cells. **Show result** completes the animation immediately. Paint by dragging. Use the tool selector to move the start/goal or add costs. The preset **Cheapest ≠ shortest** demonstrates a weighted detour. Export and import your map as JSON.

Keyboard: focus a cell, use arrow keys, then Enter/Space to paint. Reduced-motion preference skips the animation.

## Algorithm contract
Four orthogonal neighbours only. Zero means an impassable wall. Walkable entry costs are 1, 3, or 6; the starting cell costs zero. A* uses Manhattan distance with a minimum edge cost of 1. Dijkstra uses zero heuristic. The priority queue resolves equal priorities deterministically. The closed-cell list counts expanded cells, not elapsed CPU time. Bounds: 48 × 32 cells. Start and goal may be equal.

This is one start-to-goal search, not multi-stop vehicle routing, traffic prediction, or a warehouse digital twin. Changing a cell clears old results.

The pure core in `src/core.js` is separate from DOM and file-dialog wiring in `src/app.js`. Shared interface helpers perform explicit downloads and text-only status rendering. The application uses no eval, backend processing, or external runtime dependencies.
