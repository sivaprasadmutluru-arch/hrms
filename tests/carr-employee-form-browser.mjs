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

 await call('Page.navigate',{url:base+'/carr/dashboard'});await waitFor(`document.querySelector('.header-options')`,'App ready');
 await evaluate(`(async()=>{const api=(await import('/assets/api-D7j5s7CB.js')).t;const originalGet=api.get.bind(api);const task={id:987654321,carrId:1,title:'Employee task UI fixture',description:'Original description',companyId:2,companyName:'Local fixture',employeeId:4,employeeName:'Employee fixture',priority:'MEDIUM',dueDate:'2027-01-01',status:'IN_PROGRESS',progress:10,overdue:false,canEdit:false,canUpdateProgress:true,canSubmit:true,canReview:false,requiresReview:false,requiresEvidence:false,checklist:[],instructions:'Read the task',workDetails:'Started',createdAt:'2026-10-10T10:00:00',updatedAt:'2026-10-10T10:00:00'};window.employeeTaskFixture={task,requests:[]};api.get=async(path,config)=>path.startsWith('/carr/tasks')?{data:path.includes('/options')?{employees:[],departments:[],canCreate:false,companyName:'Local fixture'}:path.includes('/987654321')?{task:{...task},attachments:[],activity:[]}:[{...task}]}:originalGet(path,config);api.patch=async(path,payload)=>{if(!path.startsWith('/carr/tasks/987654321/'))throw Error('Unexpected fixture mutation');window.employeeTaskFixture.requests.push({path,payload});Object.assign(task,payload);return {data:{...task}};};[...document.querySelectorAll('button')].find(button=>button.textContent==='View My Tasks').click();})()`);
 await waitFor(`document.body.innerText.includes('Employee task UI fixture')`,'Assigned tasks');await click('Open task');await waitFor(`document.querySelector('[role="dialog"]')`,'Task detail');await click('Work & review');
 await fill('input[aria-label="Task title"]','Employee edited title');await fill('textarea[aria-label="Task description"]','Employee edited description');await fill('input[aria-label="Task due date"]','2027-02-10');await click('Save task details');await waitFor(`document.body.innerText.includes('Task details saved.')`,'Details saved');
 assert.deepEqual(await evaluate(`employeeTaskFixture.requests[0]`),{path:'/carr/tasks/987654321/details',payload:{title:'Employee edited title',description:'Employee edited description',dueDate:'2027-02-10'}});
 await fill('input[aria-label="Work progress"]','42');await fill('textarea[aria-label="Work details"]','Updated work');await click('Save work update');await waitFor(`document.body.innerText.includes('Work update saved.')`,'Progress saved');
 assert.equal(await evaluate(`employeeTaskFixture.task.progress`),42);assert.equal(await evaluate(`employeeTaskFixture.task.status`),'IN_PROGRESS');
 await evaluate(`document.querySelector('button[aria-label="Close dialog"]').click()`);await waitFor(`document.querySelector('.carr-tasks')?.innerText.includes('Employee edited title')`,'Task list refreshed');
 assert.deepEqual(exceptions,[]);assert.deepEqual(mutations,[]);await call('Browser.close');console.log('PASS: employee task form, detail save payload, progress update and refreshed list. Mocked API; no database mutations.');
} finally {socket?.close();browser.kill();}
