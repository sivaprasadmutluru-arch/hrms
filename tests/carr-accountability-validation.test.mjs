import {test} from 'node:test';
import assert from 'node:assert/strict';
import {accountabilityError} from '../src/main/resources/static/assets/carr-accountability-validation.js';
const kpi={name:'On-time dispatch',targetValue:95,weight:100};
test('blank and missing KPI rows cannot continue even with total weight 100',()=>{
 assert.match(accountabilityError([]),/at least one KPI/);
 assert.match(accountabilityError([{...kpi,name:'  '}]),/KPI name/);
});
test('target must be numeric, including a valid zero target',()=>{
 for(const targetValue of ['',null,undefined,'not numeric',Infinity])assert.match(accountabilityError([{...kpi,targetValue}]),/numeric target/);
 assert.equal(accountabilityError([{...kpi,targetValue:0}]),'');
});
test('every KPI must be complete and weights must total 100',()=>{
 assert.match(accountabilityError([{...kpi,weight:90}]),/total 100/);
 assert.match(accountabilityError([{...kpi,weight:101}]),/1 to 100/);
 assert.match(accountabilityError([{...kpi,weight:50},{...kpi,name:'',weight:50}]),/row 2/);
 assert.equal(accountabilityError([{...kpi,weight:50},{...kpi,name:'Quality',weight:50}]),'');
});
