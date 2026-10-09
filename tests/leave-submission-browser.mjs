import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { basename, join } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const profile = join(root, '.runtime', `leave-browser-${Date.now()}`);
await mkdir(profile, { recursive: true });
const browser = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--window-size=1280,1000', 'about:blank',
], { windowsHide: true, stdio: 'ignore' });
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
let socket;
try {
    let port;
    for (let attempt = 0; attempt < 100; attempt++) {
        try { port = Number((await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); break; }
        catch { await delay(100); }
    }
    assert.ok(port, 'Chrome debugging endpoint must start');
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
    const pending = new Map();
    const submissions = [];
    const exceptions = [];
    let sequence = 0;
    const call = (method, params = {}) => new Promise((resolve, reject) => {
        const id = ++sequence;
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
    });
    socket.addEventListener('message', async event => {
        const message = JSON.parse(event.data);
        if (message.id) {
            const operation = pending.get(message.id);
            if (!operation) return;
            pending.delete(message.id);
            if (message.error) operation.reject(new Error(message.error.message));
            else operation.resolve(message.result);
            return;
        }
        if (message.method === 'Runtime.exceptionThrown') exceptions.push(message.params.exceptionDetails.exception?.description || message.params.exceptionDetails.text);
        if (message.method !== 'Fetch.requestPaused') return;
        const { requestId, request } = message.params;
        try {
            const url = new URL(request.url);
            if (request.method === 'POST' && ['/api/leave/apply', '/api/ess/apply-leave'].includes(url.pathname)) {
                const payload = request.postData ? JSON.parse(request.postData) : Object.fromEntries(url.searchParams);
                submissions.push({ path: url.pathname, payload });
                // Intercept at the browser: verify a real submit without creating leave or changing balances.
                const response = { id: -9000 - submissions.length, employeeId: Number(payload.employeeId || 2), employeeName: 'Browser regression', leaveTypeName: 'Sick Leave', requestedDays: 1, status: 'REQUESTED', ...payload };
                await call('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from(JSON.stringify(response)).toString('base64') });
            } else if (process.env.TEST_LOCAL_ASSETS === '1' && url.pathname.startsWith('/assets/') && url.pathname.endsWith('.js')) {
                const name = basename(url.pathname);
                const source = await readFile(join(root, 'src', 'main', 'resources', 'static', 'assets', name));
                await call('Fetch.fulfillRequest', { requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'text/javascript' }], body: source.toString('base64') });
            } else await call('Fetch.continueRequest', { requestId });
        } catch (error) {
            exceptions.push(error.message);
            await call('Fetch.failRequest', { requestId, errorReason: 'Failed' });
        }
    });
    const evaluate = async expression => {
        const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
        if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
        return result.result.value;
    };
    const waitFor = async (expression, label) => {
        for (let attempt = 0; attempt < 100; attempt++) {
            if (await evaluate(expression)) return;
            await delay(100);
        }
        await writeFile(join(profile, 'failure-body.txt'), await evaluate('document.body.innerText'));
        throw new Error(`Timed out: ${label}. Browser exceptions: ${exceptions.join('; ')}`);
    };
    await call('Runtime.enable');
    await call('Page.enable');
    await call('Network.enable');
    await call('Network.setCacheDisabled', { cacheDisabled: true });
    await call('Fetch.enable', { patterns: [
        { urlPattern: '*/api/leave/apply*' }, { urlPattern: '*/api/ess/apply-leave*' },
        ...(process.env.TEST_LOCAL_ASSETS === '1' ? [{ urlPattern: '*/assets/*.js' }] : []),
    ] });
    const loginResponse = await fetch('http://127.0.0.1:8080/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'hr.manager.ho', usernameOrEmail: 'hr.manager.ho', password: 'Pass@123' }) });
    assert.equal(loginResponse.status, 200);
    const login = await loginResponse.json();
    await call('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('token',${JSON.stringify(login.token)});localStorage.setItem('user',${JSON.stringify(JSON.stringify(login))});localStorage.setItem('roles',${JSON.stringify(JSON.stringify(login.roles))});localStorage.setItem('selectedCompanyId','2');` });
    const clickButton = async text => evaluate(`(() => { const button = [...document.querySelectorAll('button')].find(button => button.textContent.trim() === ${JSON.stringify(text)}); if (!button) throw Error('Missing button ' + ${JSON.stringify(text)}); button.click(); })()`);
    const fillField = async (label, value) => {
        await evaluate(`(() => { const label = [...document.querySelectorAll('[role="dialog"] label')].find(label => label.textContent.trim() === ${JSON.stringify(label)}); const field = label?.parentElement.querySelector('input,select,textarea'); if (!field) throw Error('Missing field ' + ${JSON.stringify(label)}); Object.getOwnPropertyDescriptor(Object.getPrototypeOf(field),'value').set.call(field,${JSON.stringify(value)}); field.dispatchEvent(new Event('input',{bubbles:true})); field.dispatchEvent(new Event('change',{bubbles:true})); })()`);
        await delay(100);
    };
    const fillLeave = async () => {
        await waitFor(`!![...document.querySelectorAll('[role="dialog"] select option')].find(option=>option.textContent.trim()==='Sick Leave')`, 'leave types');
        const typeId = await evaluate(`[...document.querySelectorAll('[role="dialog"] select option')].find(option=>option.textContent.trim()==='Sick Leave').value`);
        const typeLabel = await evaluate(`[...document.querySelectorAll('[role="dialog"] label')].find(label=>label.textContent.trim().startsWith('Leave Type')).textContent.trim()`);
        await fillField(typeLabel, typeId);
        const date = new Date();
        date.setDate(date.getDate() + 9);
        const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        await fillField('Start Date', dateString);
        await fillField('End Date', dateString);
        await fillField('Description', 'Browser regression â€” request intercepted');
    };
    await call('Page.navigate', { url: 'http://127.0.0.1:8080/leave' });
    await waitFor(`!![...document.querySelectorAll('button')].find(button=>button.textContent.trim()==='+ Apply Leave')`, 'Leave Management page');
    await clickButton('+ Apply Leave');
    await waitFor(`!!document.querySelector('[role="dialog"] input[value="employee"]')`, 'apply form');
    await evaluate(`document.querySelector('[role="dialog"] input[value="employee"]').click()`);
    await fillField('Search employee', 'Rajan');
    await waitFor(`!![...document.querySelectorAll('[role="dialog"] button')].find(button=>button.textContent.includes('Rajan Mehta'))`, 'employee selection');
    await evaluate(`[...document.querySelectorAll('[role="dialog"] button')].find(button=>button.textContent.includes('Rajan Mehta')).click()`);
    await fillLeave();
    await clickButton('Submit');
    for (let attempt = 0; attempt < 100 && submissions.length < 1; attempt++) await delay(100);
    assert.equal(submissions.length, 1, `Another-employee submit must reach the API: ${exceptions.join('; ')}`);
    assert.equal(submissions[0].payload.employeeId, 1);
    await waitFor(`!document.querySelector('[role="dialog"]')`, 'successful submit closes modal');
    await clickButton('+ Apply Leave');
    await waitFor(`!!document.querySelector('[role="dialog"]')`, 'self apply form');
    await fillLeave();
    await clickButton('Submit');
    for (let attempt = 0; attempt < 100 && submissions.length < 2; attempt++) await delay(100);
    assert.equal(submissions.length, 2, `Self submit must reach the API: ${exceptions.join('; ')}`);
    assert.equal(submissions[1].payload.employeeId, undefined);
    await waitFor(`!document.querySelector('[role="dialog"]')`, 'successful self submit closes modal');
    await call('Page.navigate', { url: 'http://127.0.0.1:8080/ess' });
    await waitFor(`!![...document.querySelectorAll('button')].find(button=>button.textContent.trim()==='My Leave')`, 'ESS page');
    await clickButton('My Leave');
    await clickButton('+ Apply Leave');
    await waitFor(`!!document.querySelector('[role="dialog"]')`, 'ESS apply form');
    await fillLeave();
    await clickButton('Submit');
    for (let attempt = 0; attempt < 100 && submissions.length < 3; attempt++) await delay(100);
    assert.equal(submissions.length, 3, `ESS submit must reach the API: ${exceptions.join('; ')}`);
    assert.equal(submissions[2].path, '/api/ess/apply-leave');
    await waitFor(`!document.querySelector('[role="dialog"]')`, 'successful ESS submit closes modal');
    assert.deepEqual(exceptions, []);
    console.log('PASS: real Chrome submits for another employee, for self, and through ESS; all three modals close successfully. Requests were intercepted; no database records or balances changed.');
    await call('Browser.close');
} finally {
    socket?.close();
    browser.kill();
}
