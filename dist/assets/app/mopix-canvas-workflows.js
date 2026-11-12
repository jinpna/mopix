import{sanitizeGraph,graphSnapshot,incomingNodes}from'./mopix-node-graph.js';
const KEY='mopix-named-workflows';
export function workflowStore(storage=localStorage){
 const read=()=>{const rows=JSON.parse(storage.getItem(KEY)||'[]');if(!Array.isArray(rows))throw Error('Kho workflow không hợp lệ.');return rows};
 return{list:read,save(name,graph,id=crypto.randomUUID()){const clean=sanitizeGraph(graphSnapshot(graph)),rows=read(),entry={id,name:String(name||'Workflow').trim().slice(0,100),updatedAt:Date.now(),graph:clean};const next=rows.filter(r=>r.id!==id);next.unshift(entry);storage.setItem(KEY,JSON.stringify(next));return entry},remove(id){storage.setItem(KEY,JSON.stringify(read().filter(r=>r.id!==id)))},open(id){const r=read().find(r=>r.id===id);if(!r)throw Error('Không tìm thấy workflow.');return{...r,graph:sanitizeGraph(r.graph)}}};
}
export function duplicateNodes(graph,ids){
 const source=graph.nodes.filter(n=>ids.includes(n.id));if(graph.nodes.length+source.length>40)throw Error('Mỗi Canvas tối đa 40 node.');
 const map=new Map(source.map(n=>[n.id,crypto.randomUUID()]));
 const nodes=source.map(n=>({...n,id:map.get(n.id),x:n.x+50,y:n.y+50,title:n.title+' · bản sao',job:undefined,analysis:undefined,analysisKey:undefined}));
 // Preserve reference ordering, including incoming edges from nodes outside the selection.
 const edges=graph.edges.filter(e=>map.has(e.to)).map(e=>({...e,id:crypto.randomUUID(),from:map.get(e.from)||e.from,to:map.get(e.to)}));
 return{graph:sanitizeGraph({...graph,nodes:[...graph.nodes,...nodes],edges:[...graph.edges,...edges]}),ids:nodes.map(n=>n.id)};
}
export function templateGroups(graph){
 if(graph.groups?.length)return graph;
 const sets=[['Ý tưởng',n=>n.kind==='text'],['Tham chiếu',n=>n.kind==='image'&&(n.asset||/upload your own/i.test(n.prompt))],['Khung cảnh',n=>n.kind==='image'&&!n.asset&&!/upload your own/i.test(n.prompt)],['Các cảnh video',n=>n.kind==='video']];
 return{...graph,groups:sets.map(([name,test])=>({id:crypto.randomUUID(),name,nodeIds:graph.nodes.filter(test).map(n=>n.id),collapsed:false})).filter(g=>g.nodeIds.length)};
}
// Only prerequisites govern readiness. Backend MUSE remains responsible for provider slots.
// A failed branch blocks its descendants, but independent branches still complete.
export async function executeGraph(graph,{targetId,runNode,onState=()=>{},isAlive=()=>true,concurrency=4}){
 const clean=sanitizeGraph(graph),wanted=new Set();function visit(id){if(wanted.has(id))return;wanted.add(id);for(const n of incomingNodes(clean,id))visit(n.id)}
 if(targetId)visit(targetId);else clean.nodes.forEach(n=>visit(n.id));
 const nodes=clean.nodes.filter(n=>wanted.has(n.id)),state=new Map(nodes.map(n=>[n.id,'waiting'])),errors=[],active=new Map();
 const set=(id,status,message)=>{state.set(id,status);onState(id,status,message)};
 nodes.forEach(n=>set(n.id,'waiting'));
 while(isAlive()){
  for(const n of nodes){if(state.get(n.id)!=='waiting')continue;const deps=incomingNodes(clean,n.id).map(p=>state.get(p.id));
   if(deps.some(s=>s==='error'||s==='blocked')){set(n.id,'blocked','Đầu vào chưa hoàn tất');continue}
   if(deps.some(s=>s!=='completed')||active.size>=concurrency)continue;
   if(n.kind==='text'||n.asset||n.study||n.job?.status==='completed'){set(n.id,'completed');continue}
   set(n.id,'running');const task=Promise.resolve().then(()=>runNode(n.id)).then(()=>set(n.id,'completed')).catch(e=>{errors.push(n.title+': '+e.message);set(n.id,'error',e.message)}).finally(()=>active.delete(n.id));active.set(n.id,task);
  }
  if(active.size)await Promise.race(active.values());
  else if([...state.values()].every(s=>s!=='waiting'))break;
 }
 await Promise.all(active.values());return{state,errors};
}
export function createWorkflowManager(React){const{createElement:h,useState:S,useRef:R,useEffect:E}=React;return function Manager({graph,onOpen,onClose}){
 const[rows,ROWS]=S(()=>workflowStore().list()),[name,NAME]=S(graph.template?.name||'Workflow của tôi'),[error,ERR]=S(''),ref=R(null);
 E(()=>{ref.current.showModal()},[]);function action(fn){try{fn();ROWS(workflowStore().list());ERR('')}catch(e){ERR(e.message)}}
 return h('dialog',{ref,className:'mopix-options-modal','aria-label':'Workflow đã lưu',onCancel:onClose},h('section',null,h('header',null,h('h2',null,'Workflow đã lưu'),h('button',{onClick:onClose},'Đóng')),h('div',{className:'mopix-workflow-save'},h('input',{'aria-label':'Tên workflow',value:name,maxLength:100,onChange:e=>NAME(e.target.value)}),h('button',{onClick:()=>action(()=>workflowStore().save(name,graph))},'Lưu bản mới')),error&&h('p',{role:'alert'},error),...rows.map(row=>h('article',{key:row.id,className:'mopix-workflow-row'},h('strong',null,row.name),h('small',null,row.graph.nodes.length+' node'),h('button',{onClick:()=>action(()=>{if(confirm('Mở workflow này? Bản hiện tại được sao lưu.')){onOpen(workflowStore().open(row.id).graph);onClose()}})},'Mở'),h('button',{onClick:()=>action(()=>{const name=prompt('Tên mới',row.name);if(name?.trim())workflowStore().save(name,row.graph,row.id)})},'Đổi tên'),h('button',{onClick:()=>action(()=>workflowStore().save(row.name+' · bản sao',row.graph))},'Nhân bản'),h('button',{onClick:()=>action(()=>{if(confirm('Xóa workflow “'+row.name+'”?'))workflowStore().remove(row.id)})},'Xóa')))));
}}
