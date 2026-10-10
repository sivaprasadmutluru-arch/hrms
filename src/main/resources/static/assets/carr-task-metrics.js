export const statuses={TODO:'To do',IN_PROGRESS:'In progress',BLOCKED:'Blocked',READY_FOR_REVIEW:'Ready for review',ON_HOLD:'On hold',COMPLETED:'Completed',CANCELLED:'Cancelled'};
export const priorities=['LOW','MEDIUM','HIGH','URGENT'];
export const dayKey=value=>value?String(value).slice(0,10):'';
export const isOpen=task=>!['COMPLETED','CANCELLED'].includes(task.status);
export function filterTasks(tasks,filters={}) {
 const {query='',status='',priority='',department='',employee='',overdue=false,dueFrom='',dueTo='',dateFrom='',dateTo='',sort='updated'}=filters;
 return tasks.filter(task=>(!status || task.status===status)&&(!priority || task.priority===priority)
  &&(!department || String(task.departmentId)===String(department))&&(!employee || String(task.employeeId)===String(employee))
  &&(!overdue || task.overdue)&&(!dueFrom || (task.dueDate && task.dueDate>=dueFrom))&&(!dueTo || (task.dueDate && task.dueDate<=dueTo))
  &&(!dateFrom || dayKey(task.createdAt)>=dateFrom)&&(!dateTo || (task.createdAt && dayKey(task.createdAt)<=dateTo))
  &&[task.title,task.description,task.employeeName,task.departmentName].filter(Boolean).join(' ').toLowerCase().includes(query.trim().toLowerCase()))
  .sort((a,b)=>sort==='due'?(a.dueDate || '9999').localeCompare(b.dueDate || '9999'):sort==='title'?a.title.localeCompare(b.title):sort==='priority'?priorities.indexOf(b.priority)-priorities.indexOf(a.priority):(b.updatedAt || '').localeCompare(a.updatedAt || ''));
}
export function summarizeTasks(tasks) {
 const counts=Object.fromEntries(Object.keys(statuses).map(status=>[status,tasks.filter(t=>t.status===status).length]));
 const completed=tasks.filter(t=>t.status==='COMPLETED'),eligible=tasks.filter(t=>t.status!=='CANCELLED');
 const durations=completed.map(t=>{const start=Date.parse(t.assignedAt || t.createdAt),end=Date.parse(t.completedAt);return Number.isFinite(start)&&Number.isFinite(end)&&end>=start?(end-start)/86400000:null;}).filter(value=>value!==null);
 const dated=completed.filter(t=>t.dueDate && t.actualCompletionDate);
 return {total:tasks.length,counts,overdue:tasks.filter(t=>t.overdue).length,active:tasks.filter(isOpen).length,
  completionRate:eligible.length?Math.round(completed.length*100/eligible.length):null,
  averageDays:durations.length?durations.reduce((sum,value)=>sum+value,0)/durations.length:null,timedCount:durations.length,
  onTimeRate:dated.length?Math.round(dated.filter(t=>t.actualCompletionDate<=t.dueDate).length*100/dated.length):null,datedCount:dated.length};
}
export function groupTasks(tasks,by='department') {
 const map=new Map();for(const task of tasks){const id=by==='employee'?task.employeeId:task.departmentId;
  if(!map.has(id))map.set(id,{id,name:by==='employee'?task.employeeName:task.departmentName || 'No department',tasks:[]});map.get(id).tasks.push(task);}
 return [...map.values()].map(group=>({...group,...summarizeTasks(group.tasks)})).sort((a,b)=>b.active-a.active || a.name.localeCompare(b.name));
}
export function weeklyTrend(tasks,now=new Date()) {
 const today=new Date(Date.UTC(now.getFullYear(),now.getMonth(),now.getDate()));const monday=new Date(today);monday.setUTCDate(monday.getUTCDate()-((monday.getUTCDay()+6)%7));
 return Array.from({length:6},(_,i)=>{const start=new Date(monday);start.setUTCDate(start.getUTCDate()-(5-i)*7);const end=new Date(start);end.setUTCDate(end.getUTCDate()+7);
  const within=value=>{const date=Date.parse(value);return Number.isFinite(date)&&date>=start.getTime()&&date<end.getTime();};
  return {start:start.toISOString().slice(0,10),label:start.toLocaleDateString(undefined,{month:'short',day:'numeric',timeZone:'UTC'}),assigned:tasks.filter(t=>within(t.assignedAt || t.createdAt)).length,completed:tasks.filter(t=>t.status==='COMPLETED'&&within(t.completedAt)).length};});
}
export function reportCsv(tasks) {
 const escape=value=>'"'+String(value??'').replace(/^(\s*)([=+@-])/,"$1'").replaceAll('"','""')+'"';
 const columns=['Task','Company','Department','Employee','Manager','Status','Progress (%)','Priority','Due date','Assigned date','Actual completion date','Approved date','Blocked reason'];
 const rows=tasks.map(t=>[t.title,t.companyName,t.departmentName,t.employeeName,t.reviewerName || t.assignedByName,statuses[t.status],t.progress,t.priority,t.dueDate,t.assignedAt,t.actualCompletionDate,t.completedAt,t.blockerReason]);
 return '\uFEFF'+[columns,...rows].map(row=>row.map(escape).join(',')).join('\r\n');
}
