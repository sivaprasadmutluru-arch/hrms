import assert from 'node:assert/strict';
import {readFile,unlink} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {resolve,sep} from 'node:path';
const base='http://127.0.0.1:8080/api',fixtures=[];
const config=JSON.parse(await readFile('.runtime/local-config.json','utf8'));
const sql=query=>execFileSync('C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe',['-h','127.0.0.1','-p','5433','-U','postgres','-d','cloudhrms_local','-v','ON_ERROR_STOP=1','-At','-c',query],{env:{...process.env,PGPASSWORD:config.DatabasePassword},encoding:'utf8'}).trim();
async function login(username){const response=await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({usernameOrEmail:username,password:'Pass@123'})});assert.equal(response.status,200);return response.json();}
async function api(user,path,method='GET',body,expected=200,company='2') {
 const multipart=body instanceof FormData;
 const response=await fetch(base+path,{method,headers:{...(user?{Authorization:`Bearer ${user.token}`}:{}) ,'X-Company-Id':company,...(!multipart?{'Content-Type':'application/json'}:{})},body:body?(multipart?body:JSON.stringify(body)):undefined});
 const text=await response.text();assert.equal(response.status,expected,`${method} ${path}: ${text.slice(0,800)}`);
 try{return JSON.parse(text);}catch{return text;}
}
async function file(user,id,name,kind='DELIVERABLE'){const form=new FormData();form.append('file',new Blob(['Verified task deliverable']),name);form.append('kind',kind);return api(user,`/carr/tasks/${id}/attachments`,'POST',form);}
try {
 const manager=await login('hr.manager.ho'),owner=await login(process.env.CARR_TEST_OWNER || 'employee.ho'),other=await login('accountant.ho');
 const companies=await api(manager,'/companies/accessible');assert.ok(companies.some(c=>c.id===2)&&companies.some(c=>c.id===3));
 const choices=await api(manager,'/carr/tasks/options'),assigned=choices.employees.find(e=>e.id===owner.employeeId);assert.ok(assigned);
 const legacyBefore=await api(manager,'/carr/records');
 const payload={title:`CARR workflow API ${Date.now()}`,description:'Full employee workflow',instructions:'Implement backend\nRun regression tests\nProvide a report',requiredDeliverables:'Test report and implementation notes',requiresReview:true,requiresEvidence:true,checklist:['Verify implementation','Run tests'],employeeId:assigned.id,departmentId:assigned.departmentId,priority:'HIGH',dueDate:new Date().toLocaleDateString('en-CA'),status:'TODO',progress:0};
 const task=await api(manager,'/carr/tasks','POST',payload,201);fixtures.push(task);
 assert.equal(task.assignedByUserId,manager.userId || manager.id);assert.ok(task.assignedAt&&task.requiresReview&&task.requiresEvidence);
 assert.equal((await api(manager,'/carr/records')).length,legacyBefore.length);
 assert.ok((await api(owner,'/carr/tasks?mine=true')).some(t=>t.id===task.id));
 assert.ok(!(await api(manager,'/carr/tasks?mine=true')).some(t=>t.id===task.id));
 await api(other,`/carr/tasks/${task.id}`,'GET',null,404);await api(owner,`/carr/tasks/${task.id}`,'GET',null,404,'3');await api(null,`/carr/tasks/${task.id}`,'GET',null,401);
 const instruction=await file(manager,task.id,'instructions.txt','INSTRUCTION');
 assert.equal((await api(owner,`/carr/tasks/${task.id}`)).task.instructions,payload.instructions);
 await api(owner,`/carr/tasks/${task.id}`,'PUT',payload,403);
 const employeeDetails={title:payload.title+' edited',description:'Employee revised description',dueDate:'2027-01-10'};
 await api(other,`/carr/tasks/${task.id}/details`,'PATCH',employeeDetails,404);
 await api(owner,`/carr/tasks/${task.id}/details`,'PATCH',employeeDetails,404,'3');
 await api(owner,`/carr/tasks/${task.id}/details`,'PATCH',employeeDetails);
 const persistedDetails=(await api(await login(process.env.CARR_TEST_OWNER || 'employee.ho'),`/carr/tasks/${task.id}`)).task;
 assert.equal(persistedDetails.title,employeeDetails.title);assert.equal(persistedDetails.description,employeeDetails.description);assert.equal(persistedDetails.dueDate,employeeDetails.dueDate);
 assert.equal(persistedDetails.employeeId,task.employeeId);assert.equal(persistedDetails.status,'TODO');assert.equal(persistedDetails.progress,0);
 assert.equal((await api(owner,'/carr/tasks?mine=true')).find(row=>row.id===task.id).title,employeeDetails.title);
 await api(owner,`/carr/tasks/${task.id}/details`,'PATCH',{title:payload.title,description:payload.description,dueDate:payload.dueDate});
 await api(owner,`/carr/tasks/${task.id}/progress`,'PATCH',{status:'COMPLETED',progress:100},403);
 await api(owner,`/carr/tasks/${task.id}/progress`,'PATCH',{status:'BLOCKED',progress:10},400);
 let row=await api(owner,`/carr/tasks/${task.id}/progress`,'PATCH',{status:'BLOCKED',progress:20,workDetails:'Implemented data model',blockerReason:'Need API documentation'});assert.equal(row.blockerReason,'Need API documentation');
 await api(owner,`/carr/tasks/${task.id}/comments`,'POST',{comment:'Please clarify the report format.'});
 await api(manager,`/carr/tasks/${task.id}/comments`,'POST',{comment:'Upload a text report with test results.'});
 row=await api(owner,`/carr/tasks/${task.id}/progress`,'PATCH',{status:'IN_PROGRESS',progress:70,workDetails:'Tests written'});assert.equal(row.blockerReason,null);
 const submission={status:'READY_FOR_REVIEW',progress:100,workDetails:'Completed backend implementation and regression tests.',actualCompletionDate:new Date().toLocaleDateString('en-CA')};
 await api(owner,`/carr/tasks/${task.id}/progress`,'PATCH',submission,400);
 const step=task.checklist[0];assert.equal(task.checklist.length,2);await api(manager,`/carr/tasks/${task.id}/checklist/${step.id}`,'PATCH',{completed:true},403);await api(other,`/carr/tasks/${task.id}/checklist/${step.id}`,'PATCH',{completed:true},404);
 const deliverable=await file(owner,task.id,'test-results.txt');
 await api(owner,`/carr/tasks/${task.id}/progress`,'PATCH',submission,400);
 for(const item of task.checklist) await api(owner,`/carr/tasks/${task.id}/checklist/${item.id}`,'PATCH',{completed:true});
 assert.ok((await api(await login(process.env.CARR_TEST_OWNER || 'employee.ho'),`/carr/tasks/${task.id}`)).task.checklist.every(item=>item.completed&&item.completedAt));
 assert.equal(await api(owner,`/carr/tasks/${task.id}/attachments/${deliverable.id}`),'Verified task deliverable');
 await api(other,`/carr/tasks/${task.id}/attachments/${deliverable.id}`,'GET',null,404);
 const storage=sql(`SELECT storage_path FROM yuwa_tech_solutions.carr_task_attachments WHERE id=${Number(deliverable.id)}`);
 await api(null,`/files/${storage}`,'GET',null,403);
 const unsafe=new FormData();unsafe.append('file',new Blob(['x']),'../escape.txt');await api(owner,`/carr/tasks/${task.id}/attachments`,'POST',unsafe,400);
 await api(manager,`/carr/tasks/${task.id}/progress`,'PATCH',submission,403);
 row=await api(owner,`/carr/tasks/${task.id}/progress`,'PATCH',submission);assert.equal(row.status,'READY_FOR_REVIEW');assert.equal(row.progress,100);
 await api(owner,`/carr/tasks/${task.id}/progress`,'PATCH',submission,409);await api(owner,`/carr/tasks/${task.id}/checklist/${step.id}`,'PATCH',{completed:false},409);
 await api(owner,`/carr/tasks/${task.id}/review`,'POST',{approved:true},403);
 await api(manager,`/carr/tasks/${task.id}/review`,'POST',{approved:false,comment:' '},400);
 row=await api(manager,`/carr/tasks/${task.id}/review`,'POST',{approved:false,comment:'Include integration test evidence.'});assert.equal(row.status,'IN_PROGRESS');assert.equal(row.progress,99);
 const freshOwner=await login(process.env.CARR_TEST_OWNER || 'employee.ho');assert.equal((await api(freshOwner,`/carr/tasks/${task.id}`)).task.reviewFeedback,'Include integration test evidence.');
 await api(freshOwner,`/carr/tasks/${task.id}/progress`,'PATCH',{...submission,workDetails:'Included integration and regression test results.'});
 row=await api(manager,`/carr/tasks/${task.id}/review`,'POST',{approved:true,comment:'Verified and approved'});assert.equal(row.status,'COMPLETED');assert.equal(row.progress,100);assert.ok(row.completedAt);assert.equal(row.overdue,false);
 await api(manager,`/carr/tasks/${task.id}/review`,'POST',{approved:true},409);
 const persisted=await api(await login(process.env.CARR_TEST_OWNER || 'employee.ho'),`/carr/tasks/${task.id}`);assert.equal(persisted.task.status,'COMPLETED');assert.equal(persisted.attachments.length,2);assert.ok(persisted.activity.some(e=>e.details.includes('Implemented data model')));assert.ok(persisted.activity.some(e=>e.action==='TASK_CORRECTIONS'));assert.ok(persisted.activity.some(e=>e.action==='TASK_APPROVED'));
 const managerNotifications=await api(manager,'/notifications?page=0&size=100'),ownerNotifications=await api(owner,'/notifications?page=0&size=100');
 const extract=n=>Array.isArray(n)?n:n.content;
 assert.ok(extract(managerNotifications).some(n=>n.relatedEntity==='carr_task'&&n.relatedId===task.id&&n.title==='Task ready for review'));
 assert.ok(extract(ownerNotifications).some(n=>n.relatedEntity==='carr_task'&&n.relatedId===task.id&&n.title==='Task corrections requested'&&n.companyId===2));
 const reassigned=await api(manager,'/carr/tasks','POST',{...payload,title:payload.title+' reassignment',requiresEvidence:false},201);fixtures.push(reassigned);
 await api(owner,`/carr/tasks/${reassigned.id}/progress`,'PATCH',{status:'IN_PROGRESS',progress:40,workDetails:'Old assignee update'});
 await api(owner,`/carr/tasks/${reassigned.id}/checklist/${reassigned.checklist[0].id}`,'PATCH',{completed:true});
 const next=choices.employees.find(e=>e.id===other.employeeId);assert.ok(next);
 row=await api(manager,`/carr/tasks/${reassigned.id}`,'PUT',{...payload,employeeId:next.id,departmentId:next.departmentId,status:'IN_PROGRESS',progress:40});assert.equal(row.status,'TODO');assert.equal(row.workDetails,null);assert.equal(row.progress,0);assert.ok(row.checklist.every(item=>!item.completed&&!item.completedAt));
 await api(owner,`/carr/tasks/${reassigned.id}`,'GET',null,404);assert.equal((await api(other,`/carr/tasks/${reassigned.id}`)).task.employeeId,next.id);
 console.log('PASS: company options, assignment, strict My Tasks, full details, comments, blockers, evidence upload/download privacy, review/corrections/resubmission, notifications, re-login persistence, reassignment reset, company isolation, and legacy CARR preservation.');
} finally {
 for(const task of fixtures){
  const taskId=Number(task.id),recordId=Number(task.carrId);
  const paths=sql(`SELECT storage_path FROM yuwa_tech_solutions.carr_task_attachments WHERE task_id=${taskId}`).split('\n').map(path=>path.trim()).filter(Boolean);
  sql(`BEGIN; DELETE FROM yuwa_tech_solutions.notifications WHERE related_entity='carr_task' AND related_id=${taskId}; DELETE FROM yuwa_tech_solutions.carr_task_attachments WHERE task_id=${taskId}; DELETE FROM yuwa_tech_solutions.carr_audit_events WHERE carr_id=${recordId}; DELETE FROM yuwa_tech_solutions.carr_responsibilities WHERE id=${taskId}; DELETE FROM yuwa_tech_solutions.carr_records WHERE id=${recordId} AND task_record=true; COMMIT;`);
  const root=resolve('media/carr-private')+sep;for(const path of paths){const absolute=resolve('media',path);assert.ok(absolute.startsWith(root));await unlink(absolute).catch(e=>{if(e.code!=='ENOENT')throw e;});}
 }
}
