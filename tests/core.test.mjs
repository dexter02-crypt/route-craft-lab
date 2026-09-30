import test from 'node:test';
import assert from 'node:assert/strict';
import { makeMap, search, validateMap } from '../src/core.js';
const map = (w, h, cells, start = 0, goal = w * h - 1) => ({ version: 1, width: w, height: h, cells, start, goal });
test('empty map shortest entry cost', () => { const r = search(map(3, 3, Array(9).fill(1))); assert.equal(r.cost, 4); assert.equal(r.path.length, 5); });
test('start already at goal costs zero', () => assert.equal(search(map(2, 2, [1, 1, 1, 1], 0, 0)).cost, 0));
test('unreachable route explicitly returns null cost', () => { const r = search(map(3, 2, [1, 0, 1, 1, 0, 1])); assert.equal(r.found, false); assert.equal(r.cost, null); assert.deepEqual(r.path, []); });
test('cheapest route is not always fewest moves', () => { const m = map(4, 3, Array(12).fill(1), 4, 7); m.cells[5] = m.cells[6] = 6; const r = search(m); assert.equal(r.cost, 5); assert.equal(r.path.length, 6); });
test('entry cost of goal is paid', () => assert.equal(search(map(2, 2, [1, 0, 1, 6])).cost, 7));
test('wall never appears in a path', () => { const m = makeMap(); for (const x of search(m).path)
    assert.ok(m.cells[x] > 0); });
test('consecutive path cells share one grid edge', () => { const m = makeMap(); const p = search(m).path; for (let i = 1; i < p.length; i++)
    assert.equal(Math.abs(p[i] % m.width - p[i - 1] % m.width) + Math.abs(Math.floor(p[i] / m.width) - Math.floor(p[i - 1] / m.width)), 1); });
test('sum of path entry costs equals reported cost', () => { const m = makeMap(); const r = search(m); assert.equal(r.cost, r.path.slice(1).reduce((s, i) => s + m.cells[i], 0)); });
test('search does not mutate map', () => { const m = makeMap(), s = JSON.stringify(m); search(m); assert.equal(JSON.stringify(m), s); });
test('both algorithms agree on warehouse and detour', () => { for (const p of ['warehouse', 'detour', 'empty', 'blocked']) {
    const m = makeMap(p);
    assert.equal(search(m).cost, search(m, 'dijkstra').cost);
} });
test('seeded weighted grids give matching optimal costs', () => { let x = 71; for (let k = 0; k < 40; k++) {
    const cells = Array.from({ length: 80 }, () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return [0, 1, 1, 1, 3, 6][x % 6]; });
    cells[0] = cells[79] = 1;
    const m = map(10, 8, cells);
    assert.equal(search(m).cost, search(m, 'dijkstra').cost);
} });
test('validate returns an independent cell array', () => { const m = makeMap(); const v = validateMap(m); v.cells[0] = 0; assert.equal(m.cells[0], 1); });
test('invalid weights cannot create negative-cost shortcuts', () => { for (const v of [-1, 2, NaN, Infinity, '1'])
    assert.throws(() => validateMap(map(2, 2, [1, 1, 1, v]))); });
test('invalid dimensions, versions, and blocked endpoints refused', () => { for (const m of [null, { ...makeMap(), version: 2 }, { ...makeMap(), width: 100 }, map(2, 2, [0, 1, 1, 1]), map(2, 2, [1, 1, 1])])
    assert.throws(() => validateMap(m)); });
test('unknown algorithms and presets refused', () => { assert.throws(() => search(makeMap(), 'greedy')); assert.throws(() => makeMap('other')); });
test('ties resolve deterministically', () => assert.deepEqual(search(makeMap('empty')), search(makeMap('empty'))));
