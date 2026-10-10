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
 await evaluate(`(async()=>{const {React,h}=await import('/assets/carr-ui.js');const {ReferenceWizard}=await import('/assets/car-reference.js');const dom=(await import('/assets/vendor-react-FN5ImvM4.js')).n();const host=document.createElement('div');host.className='car-reference';host.style.cssText='position:fixed;inset:0;z-index:500;overflow:auto;background:#f7f9fc';document.body.append(host);window.kpiSubmissions=0;function Fixture(){const [draft,setDraft]=React.useState({title:'Test agreement',industry:'Services',employeeId:4,departmentId:1,managerId:2,reportsToTitle:'Manager',purpose:'Purpose',responsibleFor:'Operations',responsibilities:[{statement:'Delivery'}],kpis:[{name:'',targetValue:'',weight:100}],rewards:[],rewardsEnabled:false});const [step,setStep]=React.useState(2);window.kpiFixtureStep=step;return h(ReferenceWizard,{draft,setDraft,step,setStep,employees:[],departments:[],templates:[],save:()=>{},submit:()=>{window.kpiSubmissions++},busy:false,close:()=>{},upload:()=>{},jd:'',setJd:()=>{},uploadName:''});}dom.createRoot(host).render(h(Fixture));})()`);
 await waitFor(`document.querySelector('#reference-kpis')`,'Accountability fixture');await click('Approve Accountability & Continue \u2192');await waitFor(`document.querySelector('.car-wizard [role="alert"]')?.textContent.includes('Enter a KPI name')`,'Blank KPI prevented');assert.equal(await evaluate('kpiFixtureStep'),2);
 await evaluate(`document.querySelector('.car-wizard form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))`);assert.equal(await evaluate('kpiSubmissions'),0,'Enter cannot submit before review');
 await fill('input[aria-label="KPI"]','On-time dispatch');await click('Approve Accountability & Continue \u2192');await waitFor(`document.querySelector('.car-wizard [role="alert"]')?.textContent.includes('numeric target')`,'Missing target prevented');
 await fill('input[aria-label="Target"]','95%');await click('Approve Accountability & Continue \u2192');await waitFor(`kpiFixtureStep===3`,'Valid KPI continues');await click('Review CAR \u2192');await waitFor(`kpiFixtureStep===4`,'Review step');await click('Submit for Approval \u2192');assert.equal(await evaluate('kpiSubmissions'),1);
 assert.deepEqual(exceptions,[]);assert.deepEqual(mutations,[]);await call('Browser.close');console.log('PASS: blank KPI and target validation, premature form submission blocked, valid Accountability proceeds to final submission. No database writes.');
} finally {socket?.close();browser.kill();}
