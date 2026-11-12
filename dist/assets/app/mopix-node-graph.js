export const NODE_WIDTH=236,NODE_HEIGHT=220;
export const NODE_MIN_W=200,NODE_MAX_W=480,NODE_MIN_H=180,NODE_MAX_H=480;
export const clampNodeW=v=>Number.isFinite(v)?Math.max(NODE_MIN_W,Math.min(NODE_MAX_W,Math.round(v))):NODE_WIDTH;
export const clampNodeH=v=>Number.isFinite(v)?Math.max(NODE_MIN_H,Math.min(NODE_MAX_H,Math.round(v))):NODE_HEIGHT;
// Legacy sidecar (node resize trước 2026-11-12): kích thước node từng lưu riêng ở
// localStorage 'mopix-node-sizes' thay vì trong graph. Fallback một lần duy nhất:
// node nào chưa có w/h trong graph đã lưu thì lấy cỡ cũ từ đó; khi graph đã lưu
// kèm w/h thì sidecar không còn được đọc nữa. Key cũ giữ nguyên trong
// localStorage (không xóa) để bản app cũ vẫn đọc được.
const LEGACY_SIZES_KEY='mopix-node-sizes';
function legacyNodeSize(id){try{const raw=JSON.parse(localStorage.getItem(LEGACY_SIZES_KEY)||'null');const s=raw&&typeof raw==='object'?raw[id]:null;return s&&Number.isFinite(s.w)&&Number.isFinite(s.h)?s:null}catch{return null}}
export function makeNode(kind,x=80,y=80){return{id:crypto.randomUUID(),kind,x,y,w:NODE_WIDTH,h:NODE_HEIGHT,title:kind==='image'?'Ảnh':kind==='video'?'Video':'Text',prompt:'',ratio:'16:9',duration:5,style:''}}
export function initialGraph(){return{version:1,nodes:[],edges:[]}}
export function canConnect(graph,from,to){
 if(from===to||!graph.nodes.some(n=>n.id===from)||!graph.nodes.some(n=>n.id===to))return false;
 if(graph.edges.some(e=>e.from===from&&e.to===to))return false;
 if(graph.nodes.find(n=>n.id===to)?.kind==='text')return false;
 if(graph.nodes.find(n=>n.id===from)?.kind==='video'&&graph.nodes.find(n=>n.id===to)?.kind==='image')return false;
 const seen=new Set(),stack=[to];while(stack.length){const id=stack.pop();if(id===from)return false;if(seen.has(id))continue;seen.add(id);stack.push(...graph.edges.filter(e=>e.from===id).map(e=>e.to))}
 return true;
}
export function connectNodes(graph,from,to){
 if(!canConnect(graph,from,to))throw Error('Không thể nối: đường trùng, vòng lặp hoặc cổng không phù hợp.');
 return{...graph,edges:[...graph.edges,{id:crypto.randomUUID(),from,to}]};
}
export const incomingNodes=(graph,id)=>graph.edges.filter(e=>e.to===id).map(e=>graph.nodes.find(n=>n.id===e.from)).filter(Boolean);
export function effectiveIncomingNodes(graph,id){
 const target=graph?.nodes?.find(n=>n.id===id);if(!target)return[];
 const direct=incomingNodes(graph,id);if(target.kind!=='video')return direct;
 const out=[],seen=new Set();const add=n=>{if(n&&!seen.has(n.id)){seen.add(n.id);out.push(n)}};
 for(const n of direct){
  add(n);
  if(n.kind==='image'){
   const up=incomingNodes(graph,n.id);
   for(const u of up.filter(x=>x.kind==='image'))if(out.filter(x=>x.kind==='image').length<5)add(u);
   for(const u of up.filter(x=>x.kind==='text'))add(u);
  }
 }
 return out;
}
export function graphSnapshot(graph){return{version:1,template:graph.template,groups:graph.groups,nodes:graph.nodes.map(({id,kind,x,y,w,h,title,prompt,ratio,duration,style,preset,asset,study,analysis,analysisKey,job,demoImage,provider,demoVideo})=>({id,kind,x,y,w:clampNodeW(w),h:clampNodeH(h),title,prompt,ratio,duration,style,preset,asset,study,analysis,analysisKey,provider,demoVideo:demoVideoURL(demoVideo),demoImage:demoImageURL(demoImage),job:job?{id:job.id,status:job.status,video_url:job.video_url,media_type:job.media_type}:undefined})),edges:graph.edges}}
// Drafts are local state, not trusted media manifests. Only app-owned media paths
// and the fixed engine settings survive a reload.
export const localMediaURL=value=>typeof value==='string'&&/^\/(?:uploads|videos|media)\/[A-Za-z0-9_./%?=&-]+$/.test(value)&&!value.includes('..')?value:undefined;
// Demo images are app-owned static files under dist/assets/data/demo-refs/.
// Same trust level as /assets/*, but pinned to that one directory and to image files.
export const demoImageURL=value=>typeof value==='string'&&/^\/assets\/data\/demo-refs\/[a-z0-9-]+\.(png|jpg|webp)$/.test(value)?value:undefined;
export const demoVideoURL=value=>typeof value==='string'&&/^\/assets\/data\/demo-refs\/[a-z0-9-]+\.(mp4|webm)$/.test(value)?value:undefined;
export function sanitizeGraph(g){
 if(g?.version!==1||!Array.isArray(g.nodes)||!Array.isArray(g.edges)||g.nodes.length>40||g.edges.length>150)throw Error('Invalid canvas');
 const ids=new Set(),nodes=g.nodes.map(n=>{
  if(!['text','image','video'].includes(n.kind)||typeof n.id!=='string'||!n.id||ids.has(n.id)||!Number.isFinite(n.x)||!Number.isFinite(n.y))throw Error('Invalid node');ids.add(n.id);
  const clean={id:n.id,kind:n.kind,x:Math.max(-100000,Math.min(100000,n.x)),y:Math.max(-100000,Math.min(100000,n.y)),title:String(n.title||n.kind).slice(0,80),prompt:String(n.prompt||'').slice(0,40000),ratio:['16:9','9:16','1:1'].includes(n.ratio)?n.ratio:'16:9',duration:(Number.isInteger(n.duration)&&n.duration>=1&&n.duration<=60)?n.duration:10,style:/^m[0-9]{1,2}$/i.test(n.style||'')?n.style:'',preset:/^[a-z]+[0-9]+$/.test(n.preset||'')?n.preset:'',w:clampNodeW(n.w),h:clampNodeH(n.h)};if(!Number.isFinite(n.w)&&!Number.isFinite(n.h)){const s=legacyNodeSize(n.id);if(s){clean.w=clampNodeW(s.w);clean.h=clampNodeH(s.h)}}
  if(['image','video'].includes(n.kind)&&n.provider==='google')clean.provider='google';
  const video=demoVideoURL(n.demoVideo);if(n.kind==='video'&&video)clean.demoVideo=video;
  const demo=demoImageURL(n.demoImage);if(demo)clean.demoImage=demo;
  if(n.asset&&/^[\p{L}\p{N}_-]{1,200}$/u.test(n.asset.tag||'')){const url=localMediaURL(n.asset.url||n.asset.file_url||('/uploads/'+n.asset.filename));if(url)clean.asset={tag:n.asset.tag,url,original_name:String(n.asset.original_name||'').slice(0,200)}}
  if(n.study&&/^[a-zA-Z0-9_-]+$/.test(n.study.id||'')){const url=localMediaURL(n.study.url);if(url)clean.study={id:n.study.id,url,tag:n.study.tag,duration:n.study.duration}}
  if(n.job&&typeof n.job.id==='string')clean.job={id:n.job.id.slice(0,200),status:['pending','running','completed','failed','cancelled'].includes(n.job.status)?n.job.status:'failed',media_type:n.kind,video_url:localMediaURL(n.job.video_url),error:typeof n.job.error==='string'?n.job.error.slice(0,1000):null};
  if(n.analysis&&typeof n.analysis.prompt==='string'){clean.analysis={prompt:n.analysis.prompt.slice(0,20000)};clean.analysisKey=String(n.analysisKey||'').slice(0,300)}
  return clean;
 });
 const clean={version:1,nodes,edges:[]},edgeIds=new Set();for(const e of g.edges){if(typeof e.id!=='string'||edgeIds.has(e.id)||!canConnect(clean,e.from,e.to))throw Error('Invalid edge');edgeIds.add(e.id);clean.edges.push({id:e.id,from:e.from,to:e.to})}
 for(const n of nodes)if(n.kind!=='text'&&incomingNodes(clean,n.id).filter(i=>i.kind==='image').length>5)throw Error('Node '+n.title+' nhận quá 5 ảnh.');
 if(g.groups!==undefined){if(!Array.isArray(g.groups)||g.groups.length>40)throw Error('Invalid groups');const used=new Set(),groupIds=new Set();clean.groups=g.groups.map(gr=>{if(typeof gr.id!=='string'||groupIds.has(gr.id)||!Array.isArray(gr.nodeIds))throw Error('Invalid group');groupIds.add(gr.id);const members=gr.nodeIds.filter(id=>ids.has(id));for(const id of members){if(used.has(id))throw Error('Node in multiple groups');used.add(id)}return{id:gr.id,name:String(gr.name||'Nhóm').slice(0,80),nodeIds:members,collapsed:!!gr.collapsed}}).filter(gr=>gr.nodeIds.length)}
 if(g.template&&typeof g.template.id==='string')clean.template={id:g.template.id.slice(0,100),name:String(g.template.name||'').slice(0,200),instructions:String(g.template.instructions||'').slice(0,5000)};return clean;
}
export function readGraph(){try{return sanitizeGraph(JSON.parse(localStorage.getItem('mopix-node-canvas')||'null'))}catch{return initialGraph()}}
