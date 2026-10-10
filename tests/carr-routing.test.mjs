import test from 'node:test';
import assert from 'node:assert/strict';
import {legacyCarrRoutes,canonicalCarrPath} from '../src/main/resources/static/assets/carr-routing.js';
test('all saved route aliases preserve task/company/search/hash context',()=>{for(const [old,destination] of Object.entries(legacyCarrRoutes))assert.equal(canonicalCarrPath('/carr/'+old,'?task=42&companyId=2&q=review','#details'),'/carr/'+destination+'?task=42&companyId=2&q=review#details');});
test('dashboard task-creation bookmark redirects without losing flags',()=>{assert.equal(canonicalCarrPath('/carr/dashboard','?create=true&companyId=2'),'/carr/tasks?create=true&companyId=2');assert.equal(canonicalCarrPath('/carr/dashboard','?create=false'),'/carr/dashboard?create=false');});
test('canonical page URLs remain stable',()=>{for(const page of ['dashboard','tasks','my-tasks','workflows','analytics','reports','cars','settings','responsibilities','accountability','kpis','carr-reports','carr-analytics'])assert.equal(canonicalCarrPath('/carr/'+page),'/carr/'+page);});
