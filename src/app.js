import {search,makeMap,makeRandomMap,validateMap} from "./core.js";
import {$,status,safeAction,jsonDownload,readText} from "./ui.js";

let map=makeMap(),results=null,ticket=0,paint=false,buttons=[],focusIndex=0,timings={};

function options(){return {diagonal:$("diagonal").checked};}
function invalidate(){
  ticket++;results=null;timings={};
  for(const id of ["a-cost","d-cost","bi-cost","b-cost","a-visited","d-visited","bi-visited","b-visited","a-time","d-time","bi-time","b-time"])
    $(id).textContent="—";
}
function render(){
  const grid=$("grid");grid.replaceChildren();grid.style.gridTemplateColumns=`repeat(${map.width},1fr)`;buttons=[];
  map.cells.forEach((cost,i)=>{
    const b=document.createElement("button");b.className="cell";b.type="button";b.tabIndex=i===focusIndex?0:-1;b.dataset.index=i;
    b.setAttribute("aria-label",`Row ${Math.floor(i/map.width)+1}, column ${i%map.width+1}`);
    buttons.push(b);grid.append(b);
  });draw();
}
function draw(visited=[],path=[]){
  const seen=new Set(visited),route=new Set(path);
  buttons.forEach((b,i)=>{
    const cost=map.cells[i];
    b.className="cell"+(cost===0?" wall":cost===3?" slow":cost===6?" heavy":"")+(seen.has(i)?" explored":"")+(route.has(i)?" path":"")+(i===map.start?" start":i===map.goal?" goal":"");
    b.textContent=i===map.start?"S":i===map.goal?"G":cost>1?cost:"";
  });
}
function applyCell(i){
  if(!Number.isInteger(i)||i<0||i>=map.cells.length)return;
  const tool=$("tool").value;
  if(tool==="start"||tool==="goal"){map[tool]=i;map.cells[i]=1;}
  else if(i!==map.start&&i!==map.goal)map.cells[i]={wall:0,floor:1,slow:3,heavy:6}[tool];
  invalidate();draw();status("Map edited. Compare again to recalculate routes.");
}
$("grid").addEventListener("pointerdown",e=>{const b=e.target.closest(".cell");if(!b)return;paint=true;focusIndex=+b.dataset.index;buttons.forEach((x,i)=>x.tabIndex=i===focusIndex?0:-1);applyCell(focusIndex);});
$("grid").addEventListener("pointerover",e=>{if(paint&&e.buttons){const b=e.target.closest(".cell");if(b)applyCell(+b.dataset.index);}});
window.addEventListener("pointerup",()=>paint=false);window.addEventListener("blur",()=>paint=false);
$("grid").addEventListener("keydown",e=>{
  const b=e.target.closest(".cell");if(!b)return;let i=+b.dataset.index;const x=i%map.width,y=Math.floor(i/map.width);
  if(e.key==="ArrowLeft"&&x>0)i--;else if(e.key==="ArrowRight"&&x+1<map.width)i++;else if(e.key==="ArrowUp"&&y>0)i-=map.width;else if(e.key==="ArrowDown"&&y+1<map.height)i+=map.width;
  else if(e.key==="Enter"||e.key===" "){e.preventDefault();applyCell(i);return;}else return;
  e.preventDefault();focusIndex=i;buttons.forEach((x,j)=>x.tabIndex=i===j?0:-1);buttons[i].focus();
});

function resultStatus(r){
  const mode=r.algorithm==="bfs"?"fewest-step":"cost";
  status(r.found?`${mode} route: ${r.path.length-1} moves, entry cost ${r.cost}, ${r.visited.length} expanded cells.`:"No route exists under the selected movement rules.",r.found?"success":"");
}
function animate(){
  if(!results)return;const r=results[$("algorithm").value],id=++ticket;let k=0;
  const step=()=>{if(id!==ticket)return;k+=+$("speed").value;draw(r.visited.slice(0,k));if(k<r.visited.length)requestAnimationFrame(step);else{draw(r.visited,r.path);resultStatus(r);}};
  if(matchMedia("(prefers-reduced-motion: reduce)").matches){draw(r.visited,r.path);resultStatus(r);}else step();
}
function timed(algorithm){
  const t0=performance.now(),r=search(map,algorithm,options());return {result:r,ms:performance.now()-t0};
}
$("run").onclick=safeAction(()=>{
  const names=["astar","dijkstra","bidijkstra","bfs"];
  results={};timings={};
  for(const n of names){const x=timed(n);results[n]=x.result;timings[n]=x.ms;}
  const ids={astar:"a",dijkstra:"d",bidijkstra:"bi",bfs:"b"};
  for(const n of names){
    const r=results[n],id=ids[n];
    $(`${id}-cost`).textContent=r.cost??"No path";
    $(`${id}-visited`).textContent=r.visited.length;
    $(`${id}-time`).textContent=`${timings[n].toFixed(2)} ms`;
  }
  status("Animating explored cells…");animate();
});
$("algorithm").onchange=animate;
$("finish").onclick=()=>{if(!results)return;ticket++;const r=results[$("algorithm").value];draw(r.visited,r.path);resultStatus(r);};

function reset(){
  invalidate();const preset=$("preset").value;
  map=preset==="random"?makeRandomMap({seed:Number($("seed").value)||42}):makeMap(preset);
  focusIndex=map.start;render();status("Map ready. Paint a change or compare algorithms.");
}
$("preset").onchange=reset;$("reset").onclick=reset;$("randomize").onclick=()=>{$("preset").value="random";reset();};
$("diagonal").onchange=()=>{invalidate();status("Movement rule changed. Compare again.");};
$("export").onclick=()=>jsonDownload("route-map.json",map);
$("import").onchange=safeAction(async e=>{const next=validateMap(JSON.parse(await readText(e.target.files[0],50000)));invalidate();map=next;focusIndex=map.start;render();status("Imported map. No data was uploaded.");e.target.value="";});
render();
