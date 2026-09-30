/** Weighted-grid pathfinding with optional diagonal movement. */
export function validateMap(raw) {
  if (!raw || raw.version !== 1) throw new Error("Expected a version-1 route map.");
  const {width,height,start,goal,cells}=raw;
  if (!Number.isInteger(width)||!Number.isInteger(height)||width<2||height<2||width>48||height>32)
    throw new Error("Map size must be 2–48 columns and 2–32 rows.");
  const n=width*height;
  if (!Array.isArray(cells)||cells.length!==n||cells.some(v=>![0,1,3,6].includes(v)))
    throw new Error("Cells must be 0 (wall), 1, 3, or 6 with exactly width × height entries.");
  if (![start,goal].every(i=>Number.isInteger(i)&&i>=0&&i<n&&cells[i]>0))
    throw new Error("Start and goal must be walkable cell indexes.");
  return {version:1,width,height,start,goal,cells:[...cells]};
}

class Heap {
  constructor(){this.items=[];this.serial=0;}
  less(a,b){return a.f<b.f||(a.f===b.f&&a.order<b.order);}
  push(node,g,f){
    const x={node,g,f,order:this.serial++},a=this.items;a.push(x);let i=a.length-1;
    while(i>0){const p=(i-1)>>1;if(!this.less(a[i],a[p]))break;[a[i],a[p]]=[a[p],a[i]];i=p;}
  }
  pop(){
    const a=this.items,first=a[0],last=a.pop();
    if(a.length){a[0]=last;let i=0;for(;;){let j=i,l=2*i+1,r=l+1;if(l<a.length&&this.less(a[l],a[j]))j=l;if(r<a.length&&this.less(a[r],a[j]))j=r;if(j===i)break;[a[i],a[j]]=[a[j],a[i]];i=j;}}
    return first;
  }
  peek(){return this.items[0];}
}

function neighbours(m,u,diagonal=false){
  const {width:w,height:h,cells}=m,x=u%w,y=Math.floor(u/w),out=[];
  const add=(nx,ny)=>{if(nx>=0&&ny>=0&&nx<w&&ny<h){const v=ny*w+nx;if(cells[v])out.push(v);}};
  add(x-1,y);add(x+1,y);add(x,y-1);add(x,y+1);
  if(diagonal){
    const diag=(dx,dy)=>{
      const nx=x+dx,ny=y+dy;
      if(nx<0||ny<0||nx>=w||ny>=h)return;
      const v=ny*w+nx,side1=y*w+(x+dx),side2=(y+dy)*w+x;
      if(cells[v]&&cells[side1]&&cells[side2])out.push(v);
    };
    diag(-1,-1);diag(1,-1);diag(-1,1);diag(1,1);
  }
  return out;
}

function heuristic(m,i,goal,diagonal){
  const dx=Math.abs(i%m.width-goal%m.width),dy=Math.abs(Math.floor(i/m.width)-Math.floor(goal/m.width));
  return diagonal?Math.max(dx,dy):dx+dy;
}

function reconstruct(parent,start,goal){
  const path=[];
  for(let p=goal;p!==-1;p=parent[p]){path.push(p);if(p===start)break;}
  path.reverse();
  return path[0]===start?path:[];
}

function unidirectional(raw,algorithm,options={}){
  const m=validateMap(raw),diagonal=!!options.diagonal,{start,goal,cells}=m,n=cells.length;
  if(start===goal)return {found:true,cost:0,path:[start],visited:[start],algorithm,diagonal};
  if(algorithm==="bfs"){
    const parent=new Int32Array(n).fill(-1),seen=new Uint8Array(n),visited=[],queue=[start];seen[start]=1;
    for(let head=0;head<queue.length;head++){
      const u=queue[head];visited.push(u);
      if(u===goal){
        const path=reconstruct(parent,start,goal);
        return {found:true,cost:path.slice(1).reduce((s,i)=>s+cells[i],0),path,visited,algorithm,diagonal};
      }
      for(const v of neighbours(m,u,diagonal))if(!seen[v]){seen[v]=1;parent[v]=u;queue.push(v);}
    }
    return {found:false,cost:null,path:[],visited,algorithm,diagonal};
  }
  const dist=new Float64Array(n).fill(Infinity),parent=new Int32Array(n).fill(-1),closed=new Uint8Array(n),visited=[],heap=new Heap();
  dist[start]=0;heap.push(start,0,algorithm==="astar"?heuristic(m,start,goal,diagonal):0);
  while(heap.items.length){
    const {node:u,g}=heap.pop();if(closed[u]||g!==dist[u])continue;closed[u]=1;visited.push(u);
    if(u===goal){const path=reconstruct(parent,start,goal);return {found:true,cost:g,path,visited,algorithm,diagonal};}
    for(const v of neighbours(m,u,diagonal)){
      if(closed[v])continue;
      const next=g+cells[v];
      if(next<dist[v]){dist[v]=next;parent[v]=u;const h=algorithm==="astar"?heuristic(m,v,goal,diagonal):0;heap.push(v,next,next+h);}
    }
  }
  return {found:false,cost:null,path:[],visited,algorithm,diagonal};
}

function cleanTop(heap,dist,closed){
  while(heap.items.length){
    const x=heap.peek();
    if(closed[x.node]||x.g!==dist[x.node])heap.pop();else return x.g;
  }
  return Infinity;
}

export function bidirectionalDijkstra(raw,options={}){
  const m=validateMap(raw),diagonal=!!options.diagonal,{start,goal,cells}=m,n=cells.length;
  if(start===goal)return {found:true,cost:0,path:[start],visited:[start],visitedForward:[start],visitedBackward:[],algorithm:"bidijkstra",diagonal};

  const df=new Float64Array(n).fill(Infinity),db=new Float64Array(n).fill(Infinity);
  const pf=new Int32Array(n).fill(-1),nextb=new Int32Array(n).fill(-1);
  const cf=new Uint8Array(n),cb=new Uint8Array(n),hf=new Heap(),hb=new Heap(),vf=[],vb=[];
  df[start]=0;db[goal]=0;hf.push(start,0,0);hb.push(goal,0,0);
  let best=Infinity,meet=-1;

  const consider=(v)=>{
    if(Number.isFinite(df[v])&&Number.isFinite(db[v])){
      const c=df[v]+db[v];
      if(c<best||(c===best&&(meet<0||v<meet))){best=c;meet=v;}
    }
  };

  while(hf.items.length&&hb.items.length){
    const minF=cleanTop(hf,df,cf),minB=cleanTop(hb,db,cb);
    if(!Number.isFinite(minF)||!Number.isFinite(minB))break;
    if(best<Infinity&&minF+minB>=best)break;

    if(minF<=minB){
      const {node:u,g}=hf.pop();if(cf[u]||g!==df[u])continue;cf[u]=1;vf.push(u);consider(u);
      for(const v of neighbours(m,u,diagonal)){
        if(cf[v])continue;
        const next=g+cells[v];
        if(next<df[v]){df[v]=next;pf[v]=u;hf.push(v,next,next);consider(v);}
      }
    }else{
      const {node:u,g}=hb.pop();if(cb[u]||g!==db[u])continue;cb[u]=1;vb.push(u);consider(u);
      for(const v of neighbours(m,u,diagonal)){
        if(cb[v])continue;
        const next=g+cells[u]; // reverse edge represents forward v -> u
        if(next<db[v]){db[v]=next;nextb[v]=u;hb.push(v,next,next);consider(v);}
      }
    }
  }

  if(meet<0||!Number.isFinite(best))return {found:false,cost:null,path:[],visited:[...vf,...vb.filter(x=>!vf.includes(x))],visitedForward:vf,visitedBackward:vb,algorithm:"bidijkstra",diagonal};
  const left=reconstruct(pf,start,meet); if(!left.length)return {found:false,cost:null,path:[],visited:[],visitedForward:vf,visitedBackward:vb,algorithm:"bidijkstra",diagonal};
  const right=[]; for(let p=nextb[meet];p!==-1;p=nextb[p]){right.push(p);if(p===goal)break;}
  const path=[...left,...right];
  const cost=path.slice(1).reduce((s,i)=>s+cells[i],0);
  return {found:path.at(-1)===goal,cost:path.at(-1)===goal?cost:null,path:path.at(-1)===goal?path:[],visited:[...vf,...vb.filter(x=>!vf.includes(x))],visitedForward:vf,visitedBackward:vb,algorithm:"bidijkstra",diagonal};
}

export function search(raw,algorithm="astar",options={}){
  if(!["astar","dijkstra","bfs","bidijkstra"].includes(algorithm))throw new Error("Unknown algorithm.");
  if(algorithm==="bidijkstra")return bidirectionalDijkstra(raw,options);
  return unidirectional(raw,algorithm,options);
}

export function makeMap(preset="warehouse"){
  const width=24,height=16,cells=Array(width*height).fill(1),start=width*7+1,goal=width*7+22;
  if(preset==="warehouse"){
    for(const x of [5,10,15,19])for(let y=2;y<14;y++)if(y!==3&&y!==12)cells[y*width+x]=0;
    for(let y=3;y<13;y++)for(let x=7;x<10;x++)cells[y*width+x]=3;
    for(let x=16;x<23;x++)cells[3*width+x]=6;
  }else if(preset==="detour"){
    for(let x=3;x<22;x++)cells[7*width+x]=6;
    for(let x=5;x<20;x++)cells[10*width+x]=0;
  }else if(preset==="blocked"){
    for(let y=0;y<height;y++)cells[y*width+12]=0;
  }else if(preset!=="empty")throw new Error("Unknown map preset.");
  return {version:1,width,height,start,goal,cells};
}

export function makeRandomMap({width=24,height=16,seed=42,wallRate=0.18}={}){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<2||height<2||width>48||height>32)throw new Error("random-size");
  if(!Number.isFinite(wallRate)||wallRate<0||wallRate>0.6)throw new Error("wall-rate");
  let x=(Number(seed)>>>0)||1;
  const rand=()=>((x=(Math.imul(x,1664525)+1013904223)>>>0)/2**32);
  const cells=Array.from({length:width*height},()=>{
    const r=rand(); if(r<wallRate)return 0; if(r<wallRate+0.12)return 3; if(r<wallRate+0.18)return 6; return 1;
  });
  const y=Math.floor(height/2),start=y*width,goal=y*width+width-1;
  for(let i=start;i<=goal;i++)cells[i]=1; // deterministic guaranteed corridor
  return {version:1,width,height,start,goal,cells};
}
