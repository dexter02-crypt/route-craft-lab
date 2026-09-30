/** Four-neighbour, positive-entry-cost pathfinding. No diagonal moves. */
export function validateMap(raw) {
    if (!raw || raw.version !== 1)
        throw new Error('Expected a version-1 route map.');
    const { width, height, start, goal, cells } = raw;
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 2 || height < 2 || width > 48 || height > 32)
        throw new Error('Map size must be 2–48 columns and 2–32 rows.');
    const n = width * height;
    if (!Array.isArray(cells) || cells.length !== n || cells.some(v => ![0, 1, 3, 6].includes(v)))
        throw new Error('Cells must be 0 (wall), 1, 3, or 6 with exactly width × height entries.');
    if (![start, goal].every(i => Number.isInteger(i) && i >= 0 && i < n && cells[i] > 0))
        throw new Error('Start and goal must be walkable cell indexes.');
    return { version: 1, width, height, start, goal, cells: [...cells] };
}
class Heap {
    constructor() { this.items = []; this.serial = 0; }
    less(a, b) { return a.f < b.f || (a.f === b.f && a.order < b.order); }
    push(node, g, f) {
        const x = { node, g, f, order: this.serial++ }, a = this.items;
        a.push(x);
        let i = a.length - 1;
        while (i > 0) {
            const p = (i - 1) >> 1;
            if (!this.less(a[i], a[p]))
                break;
            [a[i], a[p]] = [a[p], a[i]];
            i = p;
        }
    }
    pop() { const a = this.items, first = a[0], last = a.pop(); if (a.length) {
        a[0] = last;
        let i = 0;
        for (;;) {
            let j = i, l = 2 * i + 1, r = l + 1;
            if (l < a.length && this.less(a[l], a[j]))
                j = l;
            if (r < a.length && this.less(a[r], a[j]))
                j = r;
            if (j === i)
                break;
            [a[i], a[j]] = [a[j], a[i]];
            i = j;
        }
    } return first; }
}
export function search(raw, algorithm = 'astar') {
    const m = validateMap(raw);
    if (!['astar', 'dijkstra', 'bfs'].includes(algorithm))
        throw new Error('Unknown algorithm.');
    const { width: w, height: h, start, goal, cells } = m, n = w * h;
    if (algorithm === 'bfs') {
        const parent = new Int32Array(n).fill(-1), seen = new Uint8Array(n), visited = [], queue = [start];
        seen[start] = 1;
        for (let head = 0; head < queue.length; head++) {
            const u = queue[head]; visited.push(u);
            if (u === goal) {
                const path = [];
                for (let p = goal; p !== -1; p = parent[p]) path.push(p);
                path.reverse();
                const cost = path.slice(1).reduce((sum, i) => sum + cells[i], 0);
                return { found: true, cost, path, visited, algorithm };
            }
            const x = u % w, y = Math.floor(u / w), neighbors = [];
            if (x > 0) neighbors.push(u - 1);
            if (x + 1 < w) neighbors.push(u + 1);
            if (y > 0) neighbors.push(u - w);
            if (y + 1 < h) neighbors.push(u + w);
            for (const v of neighbors) if (cells[v] && !seen[v]) { seen[v] = 1; parent[v] = u; queue.push(v); }
        }
        return { found: false, cost: null, path: [], visited, algorithm };
    }
    const distance = new Float64Array(n).fill(Infinity), parent = new Int32Array(n).fill(-1), closed = new Uint8Array(n), visited = [], heap = new Heap();
    const heuristic = i => algorithm === 'astar' ? Math.abs(i % w - goal % w) + Math.abs(Math.floor(i / w) - Math.floor(goal / w)) : 0;
    distance[start] = 0;
    heap.push(start, 0, heuristic(start));
    while (heap.items.length) {
        const { node: u, g } = heap.pop();
        if (closed[u] || g !== distance[u])
            continue;
        closed[u] = 1;
        visited.push(u);
        if (u === goal) {
            const path = [];
            for (let p = goal; p !== -1; p = parent[p])
                path.push(p);
            return { found: true, cost: g, path: path.reverse(), visited, algorithm };
        }
        const x = u % w, y = Math.floor(u / w), neighbors = [];
        if (x > 0)
            neighbors.push(u - 1);
        if (x + 1 < w)
            neighbors.push(u + 1);
        if (y > 0)
            neighbors.push(u - w);
        if (y + 1 < h)
            neighbors.push(u + w);
        for (const v of neighbors) {
            if (!cells[v] || closed[v])
                continue;
            const next = g + cells[v];
            if (next < distance[v]) {
                distance[v] = next;
                parent[v] = u;
                heap.push(v, next, next + heuristic(v));
            }
        }
    }
    return { found: false, cost: null, path: [], visited, algorithm };
}
export function makeMap(preset = 'warehouse') {
    const width = 24, height = 16, cells = Array(width * height).fill(1), start = width * 7 + 1, goal = width * 7 + 22;
    if (preset === 'warehouse') {
        for (const x of [5, 10, 15, 19])
            for (let y = 2; y < 14; y++)
                if (y !== 3 && y !== 12)
                    cells[y * width + x] = 0;
        for (let y = 3; y < 13; y++)
            for (let x = 7; x < 10; x++)
                cells[y * width + x] = 3;
        for (let x = 16; x < 23; x++)
            cells[3 * width + x] = 6;
    }
    else if (preset === 'detour') {
        for (let x = 3; x < 22; x++)
            cells[7 * width + x] = 6;
        for (let x = 5; x < 20; x++)
            cells[10 * width + x] = 0;
    }
    else if (preset === 'blocked') {
        for (let y = 0; y < height; y++)
            cells[y * width + 12] = 0;
    }
    else if (preset !== 'empty')
        throw new Error('Unknown map preset.');
    return { version: 1, width, height, start, goal, cells };
}
