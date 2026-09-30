# Route Craft

Paint a weighted grid and compare A*, Dijkstra, bidirectional Dijkstra and BFS.

**Live demo:** https://dexter02-crypt.github.io/route-craft-lab/

**Release:** [v1.2.0](https://github.com/dexter02-crypt/route-craft-lab/releases/tag/v1.2.0)

![Route Craft A*, Dijkstra, bidirectional Dijkstra and BFS comparison](docs/demo.png)

## v1.2

- A* and Dijkstra cost-optimal searches
- bidirectional Dijkstra
- BFS fewest-step baseline
- optional diagonal movement with corner-cut prevention
- admissible Manhattan/Chebyshev heuristic explanation
- expanded-cell counts for every algorithm
- browser-side timing
- seeded random weighted maps
- adjustable animation rate
- JSON map import/export

## Algorithm contract

Zero is an impassable wall. Walkable entry costs are 1, 3 or 6, and the starting cell costs zero.

With four-way movement, A* uses Manhattan distance. With diagonals enabled, it uses Chebyshev distance. Because the minimum entry cost is 1, both are admissible lower bounds for this model. Diagonal moves cannot cut through a blocked orthogonal corner.

Dijkstra and bidirectional Dijkstra minimize entry cost. BFS minimizes moves and may therefore return a more expensive weighted route.

Browser timings are illustrative and should not be treated as controlled performance benchmarks. Expanded-cell counts are deterministic for a fixed map and movement rule.

This is one start-to-goal grid search, not vehicle routing, traffic prediction or a warehouse digital twin.

## Run

```bash
python3 serve.py
```

## Test

```bash
node --test tests/*.test.mjs
```

No npm install is required.

## License

MIT application source. Maintainer: Shikhar Singh.
