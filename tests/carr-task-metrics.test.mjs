import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeTasks,filterTasks,weeklyTrend,reportCsv,groupTasks} from '../src/main/resources/static/assets/carr-task-metrics.js';
const tasks=[
 {id:1,title:'Deliver',employeeId:1,employeeName:'A',departmentId:1,departmentName:'Engineering',status:'COMPLETED',createdAt:'2026-10-05T00:00:00Z',assignedAt:'2026-10-05T00:00:00Z',completedAt:'2026-10-07T00:00:00Z',actualCompletionDate:'2026-10-07',dueDate:'2026-10-08',priority:'HIGH'},
 {id:2,title:'Review',employeeId:2,employeeName:'B',departmentId:1,departmentName:'Engineering',status:'BLOCKED',createdAt:'2026-10-06T00:00:00Z',dueDate:'2026-10-08',overdue:true,priority:'URGENT'},
 {id:3,title:'Old',employeeId:1,employeeName:'A',departmentId:1,departmentName:'Engineering',status:'COMPLETED'},
 {id:4,title:'Cancelled',employeeId:1,employeeName:'A',status:'CANCELLED'}];
test('completion metrics exclude cancelled tasks and report timestamp coverage',()=>{const s=summarizeTasks(tasks);assert.equal(s.total,4);assert.equal(s.completionRate,67);assert.equal(s.averageDays,2);assert.equal(s.timedCount,1);assert.equal(s.onTimeRate,100);assert.equal(s.datedCount,1);assert.equal(s.active,1);assert.equal(s.overdue,1);assert.equal(summarizeTasks([]).averageDays,null);});
test('combined scoped search and date filters exclude missing dates',()=>{assert.deepEqual(filterTasks(tasks,{query:'B',department:1,overdue:true,dueFrom:'2026-10-08',dueTo:'2026-10-08'}).map(t=>t.id),[2]);assert.deepEqual(filterTasks(tasks,{dateFrom:'2026-10-06',dateTo:'2026-10-06'}).map(t=>t.id),[2]);assert.equal(filterTasks(tasks,{sort:'due'})[0].id,1);assert.equal(groupTasks(tasks,'employee')[0].name,'B');});
test('weekly trends count persisted assignment and completed timestamps',()=>{const trend=weeklyTrend(tasks,new Date('2026-10-09T12:00:00Z'));assert.equal(trend.length,6);assert.equal(trend[5].start,'2026-10-05');assert.equal(trend[5].assigned,2);assert.equal(trend[5].completed,1);});
test('CSV protects formulas and preserves multiline quotes',()=>{const csv=reportCsv([{title:' =CMD(1)',description:'unused',employeeName:'A"B',status:'TODO'}]);assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.includes("'CMD(1)"));assert.ok(csv.includes('A""B'));});
