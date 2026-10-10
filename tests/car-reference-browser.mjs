import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { readFile, mkdir, writeFile, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join,resolve,sep } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const profile = join(root, '.runtime', `carr-browser-${Date.now()}`);
await mkdir(profile, { recursive: true });
const browser = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--window-size=1440,1000', 'about:blank',
], { windowsHide: true, stdio: 'ignore' });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const base = process.env.CAR_UI_BASE || 'http://127.0.0.1:4173';
const title = `CARR browser ${Date.now()}`;
let socket, login;

async function request(path, method = 'GET', body) {
    const response = await fetch(base + '/api' + path, { method, headers: { Authorization: `Bearer ${login.token}`, 'X-Company-Id': '2', 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const data = await response.json(); assert.ok(response.ok, `${path}: ${JSON.stringify(data)}`); return data;
}
try {
    let port;
    for (let i = 0; i < 100; i++) { try { port = Number((await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); break; } catch { await delay(100); } }
    assert.ok(port);
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
    await new Promise(resolve => socket.addEventListener('open', resolve, { once: true }));
    const pending = new Map(), exceptions = [], mutations = []; let sequence = 0;
    const call = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
    socket.addEventListener('message', event => {
        const message = JSON.parse(event.data);
        if (message.id) { const operation = pending.get(message.id); if (!operation) return; pending.delete(message.id); message.error ? operation.reject(new Error(message.error.message)) : operation.resolve(message.result); }
        if(message.method==='Network.requestWillBeSent'&&/\/api\/carr\//.test(message.params.request.url)&&['POST','PUT','PATCH','DELETE'].includes(message.params.request.method))mutations.push(message.params.request.url);
        if (message.method === 'Runtime.exceptionThrown') exceptions.push(JSON.stringify(message.params.exceptionDetails));
    });
    const evaluate = async expression => { const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description); return result.result.value; };
    const waitFor = async (expression, label) => { for (let i = 0; i < 150; i++) { if (await evaluate(`Boolean(${expression})`)) return; await delay(100); } throw new Error(`${label}: ${await evaluate('document.body.innerText')} ${exceptions.join('; ')}`); };
    const click = async text => {await waitFor(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()===${JSON.stringify(text)}&&!b.disabled)`,text+' enabled');return evaluate(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)}).click()`);};
    const select = (label, value) => evaluate(`(()=>{const el=document.querySelector('select[aria-label=${JSON.stringify(label)}]');el.value=${JSON.stringify(String(value))};el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    const fill = (selector, value) => evaluate(`(()=>{const el=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(el.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype,'value').set.call(el,${JSON.stringify(value)});el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
    await call('Runtime.enable'); await call('Page.enable'); await call('Network.enable'); await call('Network.setCacheDisabled', { cacheDisabled: true });
    login = await (await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ usernameOrEmail: 'hr.manager.ho', password: 'Pass@123' }) })).json();
    assert.ok(login.token);
    const seed = await call('Page.addScriptToEvaluateOnNewDocument', { source: `if(!localStorage.getItem('token')){localStorage.setItem('token',${JSON.stringify(login.token)});localStorage.setItem('user',${JSON.stringify(JSON.stringify(login))});localStorage.setItem('roles',${JSON.stringify(JSON.stringify(login.roles))});localStorage.setItem('selectedCompanyId','2');}` });

 await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await mkdir(join(root,'output','car-reference'),{recursive:true});
 const capture=async(name)=>{const result=await call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(join(root,'output','car-reference',name+'.png'),Buffer.from(result.data,'base64'));};
 await call('Page.navigate',{url:'file:///C:/Users/LENOVO/Downloads/CAR-clickable-prototype.html'});await waitFor(`document.querySelector('.brand')?.textContent==='CAR'`,'Source');await capture('source-home');
 for(const screen of ['cars','create','clarity','accountability','rewards','review','approval','published','reports','settings','acknowledge','changes','review-state','history']){await evaluate(`showScreen('${screen}')`);await capture('source-'+screen);}
 await call('Page.navigate',{url:base+'/carr/dashboard'});await waitFor(`document.querySelector('.car-reference .hero')`,'Home');await delay(700);await capture('home');
 for(const path of ['cars','reports','settings']){await call('Page.navigate',{url:base+'/carr/'+path});await waitFor(`document.querySelector('.car-reference .content')&&document.body.innerText.includes('${path==='cars'?'Organisation CARs':path==='reports'?'Upcoming reviews':'CAR Configuration'}')`,path);await delay(500);await capture(path);assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,path+' fits');}
 await call('Page.navigate',{url:base+'/carr/cars?create=true'});await waitFor(`document.querySelector('.car-wizard')&&document.querySelector('.car-wizard select').options.length>1`,'Create fields');await capture('create');
 await evaluate(`(()=>{const form=document.querySelector('.car-wizard');const set=(el,value)=>{Object.getOwnPropertyDescriptor(el.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event(el.tagName==='SELECT'?'change':'input',{bubbles:true}));};set(form.querySelector('input'),'Operations Manager');})()`);
 await evaluate(`(()=>{const s=document.querySelectorAll('.car-wizard select');const dep=s[0];dep.value=dep.options[1].value;dep.dispatchEvent(new Event('change',{bubbles:true}));})()`);
 await delay(300);
 await evaluate(`(()=>{const employee=[...document.querySelectorAll('.car-wizard .field')].find(x=>x.querySelector('label')?.textContent==='Assigned To *').querySelector('select');employee.value=employee.options[1].value;employee.dispatchEvent(new Event('change',{bubbles:true}));})()`);
 await click('Generate Clarity \u2192');
 await fill('.car-wizard textarea','To ensure efficient and profitable catering operations while delivering exceptional service that exceeds client expectations.');
 await fill('input[aria-label="Reports To"]','General Manager');await fill('input[aria-label="Responsible For"]','Drivers, Packers, Waiters');
 for(let i=0;i<4;i++)await click('+ Add Responsibility');
 const responsibilities=['Ensure timely dispatch of daily catering meals.','Coordinate operational teams and manpower.','Maintain service and hygiene standards.','Control operational costs.','Improve operational processes.'];for(let i=0;i<responsibilities.length;i++){await evaluate(`(()=>{const el=document.querySelectorAll('.car-wizard .item-copy')[${i}];el.focus();el.textContent=${JSON.stringify(responsibilities[i])};el.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText'}));el.blur();})()`);}
 await capture('clarity');await click('Approve Clarity & Continue \u2192');
 for(let i=0;i<4;i++)await click('+ Add KPI');
 const names=['On-time catering dispatch','Banquet late orders','Hygiene compliance','Team attendance','Budget variance'],kpiTargets=['\u226595%','<10/month','100%','\u226590%','Within \u00b12%'],weights=[25,20,20,15,20];
 for(let i=0;i<5;i++){await fill(`#reference-kpis tbody tr:nth-child(${i+1}) input[aria-label="KPI"]`,names[i]);await fill(`#reference-kpis tbody tr:nth-child(${i+1}) input[aria-label="Target"]`,kpiTargets[i]);await fill(`#reference-kpis tbody tr:nth-child(${i+1}) input[aria-label="Weight"]`,String(weights[i]));}
 for(const i of [2,4])await evaluate(`(()=>{const el=document.querySelectorAll('#reference-kpis select')[${i}];el.value='Quarterly';el.dispatchEvent(new Event('change',{bubbles:true}));})()`);
 await capture('accountability');await click('Approve Accountability & Continue \u2192');await evaluate(`[...document.querySelectorAll('.car-wizard .choice')].find(x=>x.querySelector('strong')?.textContent==='Activate Rewards').click()`);for(let i=0;i<3;i++)await click('+ Add Reward');
 const rewardNames=['Quarterly Performance Recognition','Leadership Development Opportunity','Annual Performance Bonus Framework'];for(let i=0;i<rewardNames.length;i++){await evaluate(`(()=>{const el=document.querySelectorAll('.car-wizard .item-title[contenteditable]')[${i}];el.focus();el.textContent=${JSON.stringify(rewardNames[i])};el.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText'}));el.blur();})()`);}
 await capture('rewards');await click('Review CAR \u2192');await waitFor(`document.querySelector('.car-wizard .doc')?.textContent.includes('Improve operational processes.')`,'Responsibility edits retained in document');await capture('review');
 await evaluate(`document.querySelector('.nav a').click()`);await waitFor(`!document.querySelector('.car-wizard')`,'Cancelled');
 await call('Page.navigate',{url:base+'/carr/cars'});await waitFor(`document.body.innerText.includes('Organisation CARs')`,'CAR list');await delay(500);
 const open=await evaluate(`[...document.querySelectorAll('button')].find(x=>x.textContent==='Open CAR')?.textContent`);if(open){await click('Open CAR');await waitFor(`document.querySelector('.car-record-screen .approval')||document.querySelector('.car-record-screen .doc')`,'Record');if(await evaluate(`!!document.querySelector('.car-record-screen .approval')`)){await capture('approval');await click('View Full CAR');await waitFor(`document.querySelector('.car-record-screen .doc')`,'Full CAR document');await capture('record-document');await click('Request Changes');await waitFor(`document.querySelector('[role=dialog]')`,'Change request modal');await capture('request-changes');await click('Cancel');}else{await capture('record-document');}if(await evaluate(`[...document.querySelectorAll('button')].some(b=>b.textContent==='View CAR History')`)){await click('View CAR History');await waitFor(`document.querySelector('.car-record-screen .timeline')`,'CAR history');await capture('history');}await click('Back to My CARs');}
 const previewRecord={id:0,title:'Operations Manager',employeeName:'Ahmed Hassan',purpose:'To ensure efficient and profitable catering operations while delivering exceptional service that exceeds client expectations.',reportsToTitle:'General Manager',responsibleFor:'Drivers, Packers, Waiters',nextReviewDate:'2026-09-30',rewardsEnabled:true,rewardsVisibleToEmployee:true,responsibilities:responsibilities.map((statement,i)=>({id:i+1,statement})),kpis:names.map((name,i)=>({id:i+1,name,targetText:kpiTargets[i],targetValue:95,actualValue:95,reviewFrequency:[2,4].includes(i)?'Quarterly':'Monthly',weight:weights[i]})),rewards:rewardNames.map((name,i)=>({id:i+1,name,status:'To Be Discussed'}))};
 await evaluate(`(async()=>{const {React,h}=await import('/assets/carr-ui.js');const {ReferenceRecord}=await import('/assets/car-reference.js');const dom=(await import('/assets/vendor-react-FN5ImvM4.js')).n();const host=document.createElement('div');host.className='car-reference';document.body.appendChild(host);window.carQaRoot=dom.createRoot(host);window.renderCarQa=(record,canReview=true)=>window.carQaRoot.render(h(ReferenceRecord,{key:record.status,record,canManage:canReview,canReview,onUpdated:()=>{},close:()=>{},onEdit:()=>{}}));window.renderCarQa(${JSON.stringify({...previewRecord,status:'PUBLISHED'})});})()`);
 await waitFor(`document.querySelector('.car-record-screen .doc-title')?.textContent==='Operations Manager'`,'Published reference state');await capture('published');await click('Review CAR');await waitFor(`document.body.innerText.includes('A | Accountability Review')`,'Review state');await capture('review-state');await select('Final Decision','Modified');assert.equal(await evaluate(`document.querySelector('select[aria-label=\"Final Decision\"]').value`),'Modified');await select('Final Decision','Approved');await evaluate(`document.querySelector('.car-record-screen').scrollTop=document.querySelector('.car-record-screen').scrollHeight`);await capture('review-state-bottom');
 for(const [status,name] of [['ACKNOWLEDGEMENT_PENDING','acknowledge'],['RETURNED','changes']]){await evaluate(`window.renderCarQa({...${JSON.stringify(previewRecord)},status:${JSON.stringify(status)},returnReason:'Accountability: Please reconsider the cost-control KPI target.'},${status==='RETURNED'})`);await waitFor(`document.querySelector('.car-record-screen .title')`,'Reference lifecycle state');await capture(name);}
 await evaluate(`window.carQaRoot.unmount()`);
 await call('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await call('Page.navigate',{url:base+'/carr/dashboard'});await waitFor(`document.querySelector('.hero')`,'Mobile home');await capture('mobile-home');assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,'Mobile home fits');
 await call('Page.navigate',{url:base+'/carr/cars?create=true'});await waitFor(`document.querySelector('.car-wizard')`,'Mobile create');await capture('mobile-create');assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,'Mobile create fits');
 await call('Page.navigate',{url:base+'/carr/dashboard'});await waitFor(`document.querySelector('.header-options')`,'Header options');
 assert.equal(await evaluate(`document.querySelector('.hrms-back').getAttribute('href')`),'/dashboard');
 assert.equal(await evaluate(`document.querySelector('.header-profile').getAttribute('href')`),'/carr/profile');
 await fill('.header-search input','employee');await evaluate(`document.querySelector('.header-search button').click()`);await waitFor(`location.pathname==='/carr/tasks'&&location.search.includes('q=employee')`,'Search navigation');
 await waitFor(`document.querySelector('input[aria-label="Search tasks"]')||document.querySelector('.carr-task-workspace')||document.body.innerText.includes('matching tasks')`,'Task workspace');
 await call('Page.navigate',{url:base+'/carr/profile'});await waitFor(`document.querySelector('.header-logout')`,'Profile header');
 await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:seed.identifier});
 await evaluate(`document.querySelector('.header-logout').click()`);await waitFor(`!localStorage.getItem('token')&&location.pathname.endsWith('/login')`,'Logout clears authentication');
 assert.deepEqual(mutations,[],'Browser verification must not mutate CAR records');assert.deepEqual(exceptions,[]);await call('Browser.close');console.log('PASS: reference UI, responsive layout, search, profile link, HRMS back link, logout, no browser exceptions. No CAR records modified.');
} finally {socket?.close();browser.kill();}
