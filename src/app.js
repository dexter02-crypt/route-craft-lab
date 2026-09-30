import { search, makeMap, validateMap } from './core.js';
import { $, status, safeAction, jsonDownload, readText } from './ui.js';
let map = makeMap(), results = null, ticket = 0, paint = false, buttons = [], focusIndex = 0;
function invalidate() { ticket++; results = null; for (const id of ['a-cost', 'd-cost', 'b-cost', 'a-visited', 'd-visited', 'b-steps'])
    $(id).textContent = '—'; }
function render() {
    const grid = $('grid');
    grid.replaceChildren();
    grid.style.gridTemplateColumns = `repeat(${map.width},1fr)`;
    buttons = [];
    map.cells.forEach((cost, i) => { const b = document.createElement('button'); b.className = 'cell'; b.type = 'button'; b.tabIndex = i === focusIndex ? 0 : -1; b.dataset.index = i; b.setAttribute('aria-label', `Row ${Math.floor(i / map.width) + 1}, column ${i % map.width + 1}: ${i === map.start ? 'start' : i === map.goal ? 'goal' : cost === 0 ? 'wall' : `cost ${cost}`}`); buttons.push(b); grid.append(b); });
    draw();
}
function draw(visited = [], path = []) { const seen = new Set(visited), route = new Set(path); buttons.forEach((b, i) => { const cost = map.cells[i]; b.className = 'cell' + (cost === 0 ? ' wall' : cost === 3 ? ' slow' : cost === 6 ? ' heavy' : '') + (seen.has(i) ? ' explored' : '') + (route.has(i) ? ' path' : '') + (i === map.start ? ' start' : i === map.goal ? ' goal' : ''); b.setAttribute('aria-label', `Row ${Math.floor(i / map.width) + 1}, column ${i % map.width + 1}: ${i === map.start ? 'start' : i === map.goal ? 'goal' : cost === 0 ? 'wall' : `cost ${cost}`}`); b.textContent = i === map.start ? 'S' : i === map.goal ? 'G' : cost > 1 ? cost : ''; }); }
function applyCell(i) {
    if (!Number.isInteger(i) || i < 0 || i >= map.cells.length)
        return;
    const tool = $('tool').value;
    if (tool === 'start' || tool === 'goal') {
        map[tool] = i;
        map.cells[i] = 1;
    }
    else if (i !== map.start && i !== map.goal)
        map.cells[i] = { wall: 0, floor: 1, slow: 3, heavy: 6 }[tool];
    invalidate();
    draw();
    status('Map edited. Compare again to recalculate the route.');
}
$('grid').addEventListener('pointerdown', e => { const b = e.target.closest('.cell'); if (!b)
    return; paint = true; focusIndex = +b.dataset.index; buttons.forEach((x, i) => x.tabIndex = i === focusIndex ? 0 : -1); applyCell(focusIndex); });
$('grid').addEventListener('pointerover', e => { if (paint && e.buttons) {
    const b = e.target.closest('.cell');
    if (b)
        applyCell(+b.dataset.index);
} });
window.addEventListener('pointerup', () => paint = false);
window.addEventListener('blur', () => paint = false);
$('grid').addEventListener('keydown', e => { const b = e.target.closest('.cell'); if (!b)
    return; let i = +b.dataset.index; const x = i % map.width, y = Math.floor(i / map.width); if (e.key === 'ArrowLeft' && x > 0)
    i--;
else if (e.key === 'ArrowRight' && x + 1 < map.width)
    i++;
else if (e.key === 'ArrowUp' && y > 0)
    i -= map.width;
else if (e.key === 'ArrowDown' && y + 1 < map.height)
    i += map.width;
else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    applyCell(i);
    return;
}
else
    return; e.preventDefault(); focusIndex = i; buttons.forEach((x, j) => x.tabIndex = i === j ? 0 : -1); buttons[i].focus(); });
function resultStatus(r) { const detail = r.algorithm === 'bfs' ? `Fewest-step route: ${r.path.length - 1} steps, resulting entry cost ${r.cost}. ${r.visited.length} expanded cells.` : `Cost-optimal route: ${r.path.length - 1} steps, entry cost ${r.cost}. ${r.visited.length} expanded cells.`; status(r.found ? detail : 'No route exists on this map. The obstacle barrier was not crossed.', r.found ? 'success' : ''); }
function animate() { if (!results)
    return; const r = results[$('algorithm').value], id = ++ticket; let k = 0; const step = () => { if (id !== ticket)
    return; k += +$('speed').value; draw(r.visited.slice(0, k)); if (k < r.visited.length)
    requestAnimationFrame(step);
else {
    draw(r.visited, r.path);
    resultStatus(r);
} }; if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    draw(r.visited, r.path);
    resultStatus(r);
}
else
    step(); }
$('run').onclick = safeAction(() => { results = { astar: search(map, 'astar'), dijkstra: search(map, 'dijkstra'), bfs: search(map, 'bfs') }; const a = results.astar, d = results.dijkstra, b = results.bfs; $('a-cost').textContent = a.cost ?? 'No path'; $('d-cost').textContent = d.cost ?? 'No path'; $('b-cost').textContent = b.cost ?? 'No path'; $('a-visited').textContent = a.visited.length; $('d-visited').textContent = d.visited.length; $('b-steps').textContent = b.found ? b.path.length - 1 : 'No path'; status('Animating explored cells…'); animate(); });
$('algorithm').onchange = animate;
$('finish').onclick = () => { if (!results)
    return; ticket++; const r = results[$('algorithm').value]; draw(r.visited, r.path); resultStatus(r); };
function reset() { invalidate(); map = makeMap($('preset').value); focusIndex = map.start; render(); status('Map ready. Paint a change or compare both algorithms.'); }
$('preset').onchange = reset;
$('reset').onclick = reset;
$('export').onclick = () => jsonDownload('route-map.json', map);
$('import').onchange = safeAction(async (e) => { const next = validateMap(JSON.parse(await readText(e.target.files[0], 50000))); invalidate(); map = next; focusIndex = map.start; render(); status('Imported map. No data was uploaded.'); e.target.value = ''; });
render();
