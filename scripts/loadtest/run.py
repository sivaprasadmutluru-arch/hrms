#!/usr/bin/env python3
"""Closed-loop HTTP load test, hard-locked to the disposable 8082 instance.
Tokens stay in memory; reports contain no credentials or response payloads.
"""
import argparse, collections, concurrent.futures, datetime, http.client, json, pathlib, random, statistics, threading, time, urllib.parse

ROOT=pathlib.Path('/private/tmp/hrms-loadtest')
CFG=json.loads((ROOT/'credentials.json').read_text())
assert CFG['baseUrl']=='http://127.0.0.1:8082/api' and CFG['database']=='hrms_loadtest_20261103'
PASSWORD=CFG['password'];TOKENS={};LOCAL=threading.local();LOCK=threading.Lock();SAMPLES=[];ERRORS=[]
MONTH=(datetime.date.today().replace(day=1)-datetime.timedelta(days=1)).strftime('%Y-%m')

def request(method,path,token=None,company=None,data=None,timeout=20):
    if not hasattr(LOCAL,'connection'): LOCAL.connection=http.client.HTTPConnection('127.0.0.1',8082,timeout=timeout)
    connection=LOCAL.connection;connection.timeout=timeout
    headers={'Content-Type':'application/json'}
    if token: headers['Authorization']='Bearer '+token
    if company: headers.update({'X-Company-Id':str(company),'X-Filter-Company-Id':str(company)})
    payload=None if data is None else json.dumps(data).encode()
    start=time.perf_counter()
    try:
        connection.request(method,'/api'+path,body=payload,headers=headers)
        response=connection.getresponse();body=response.read();code=response.status
        content=json.loads(body) if body and 'json' in response.getheader('Content-Type','') else body
    except Exception as error:
        connection.close();LOCAL.connection=http.client.HTTPConnection('127.0.0.1',8082,timeout=timeout)
        return 0,None,(time.perf_counter()-start)*1000,type(error).__name__
    return code,content,(time.perf_counter()-start)*1000,None

def login(org,index=1):
    name=f'employee.{index:03d}@org{org:02d}.loadtest.invalid' if org else 'platform@loadtest.invalid'
    code,body,elapsed,error=request('POST','/auth/login',data={'usernameOrEmail':name,'password':PASSWORD})
    if code!=200: raise RuntimeError(f'Login fixture {org}/{index}: HTTP {code} {error or ""}')
    token=body.get('token')
    if not token: raise RuntimeError('Login token missing')
    return (org,index,token,elapsed)

ENDPOINTS=[
 ('employees','GET','/employees?size=20&page=0',None),
 ('employee_dashboard','GET','/employees/dashboard?companyId={org}',None),
 ('org_chart','GET','/employees/org-chart?companyId={org}',None),
 ('attendance','GET','/attendance?size=20&page=0',None),
 ('leave_requests','GET','/leave/requests?size=20&page=0',None),
 ('payslips','GET',f'/payroll/payslips?year={MONTH[:4]}&month={int(MONTH[5:])}',None),
 ('salary_sheet','GET',f'/accounting/salary?month={MONTH}',None),
 ('accounting_ledger','GET',f'/accounting/ledger?month={MONTH}',None),
 ('helpdesk_list','GET','/helpdesk/tickets',None),
 ('departments','GET','/departments',None),
 ('recruitment_posts','GET','/recruitment/posts?size=20',None),
 ('salary_excel','GET',f'/accounting/salary.xlsx?month={MONTH}',None),
 ('create_ticket','POST','/helpdesk/tickets',{'title':'Synthetic concurrent ticket','description':'Disposable load test request','priority':'MEDIUM','department':{'id':1}}),
]
WEIGHTS=[16,10,8,12,8,8,8,5,7,4,3,2,3]
ACTIVE=[]
STAFF=[]
SELF_ENDPOINTS=[('self_identity','/auth/me'),('self_attendance','/attendance?size=20'),('self_leave','/leave/requests?size=20'),('self_payslips','/payroll/employee/{employee}/payslips'),('self_helpdesk','/helpdesk/tickets')]


def validate(name,body,org):
    if name=='employees' and isinstance(body,dict):
        if body.get('totalElements',body.get('page',{}).get('totalElements'))!=200:return 'unexpected_employee_count'
        for person in body.get('content',[]):
            if person.get('companyId')!=org or f'@org{org:02d}.loadtest.invalid' not in person.get('email',''):return 'TENANT_DATA_LEAK'
    if name=='self_payslips' and isinstance(body,list):
        for slip in body:
            if (slip.get('company') or {}).get('id',org)!=org:return 'TENANT_DATA_LEAK'
    if name=='create_ticket' and isinstance(body,dict) and body.get('companyId')!=org:return 'TENANT_WRITE_LEAK'
    return None

def summary(samples):
    durations=sorted(s['ms'] for s in samples)
    percentile=lambda n: round(durations[min(len(durations)-1,int((len(durations)-1)*n))],2) if durations else None
    return {'requests':len(samples),'failed':sum(not s['ok'] for s in samples),'p50Ms':percentile(.5),'p95Ms':percentile(.95),'p99Ms':percentile(.99),'maxMs':round(max(durations),2) if durations else None,'httpStatuses':dict(collections.Counter(str(s['status']) for s in samples))}

def stage(concurrency,seconds):
    deadline=time.perf_counter()+seconds; samples=[]
    def actor(index):
        rng=random.Random(index+concurrency*1000)
        while time.perf_counter()<deadline:
            org=rng.randrange(1,31);token=TOKENS[(org,1)]
            if STAFF and rng.random()<.7:
                org,employee,token=rng.choice(STAFF)
                name,path=rng.choice(SELF_ENDPOINTS);path=path.format(employee=employee);method='GET';data=None
            else:
                name,method,path,data=rng.choices(ACTIVE,weights=[WEIGHTS[ENDPOINTS.index(endpoint)] for endpoint in ACTIVE],k=1)[0]
            code,body,ms,error=request(method,path.format(org=org),token,org,data)
            issue=validate(name,body,org) if code in (200,201) else None
            sample={'stage':concurrency,'endpoint':name,'status':code,'ms':round(ms,3),'ok':code in (200,201) and not issue}
            with LOCK:
                samples.append(sample)
                if not sample['ok'] and len(ERRORS)<100:
                    message=body.get('message','') if isinstance(body,dict) and code>=400 else ''
                    ERRORS.append({'stage':concurrency,'endpoint':name,'status':code,'issue':issue or error or str(message)[:220]})
            time.sleep(rng.uniform(.05,.15))
    started=time.perf_counter()
    with concurrent.futures.ThreadPoolExecutor(max_workers=concurrency) as pool:list(pool.map(actor,range(concurrency)))
    elapsed=time.perf_counter()-started
    result={'concurrentClients':concurrency,'configuredSeconds':seconds,'actualSeconds':round(elapsed,2),'requestsPerSecond':round(len(samples)/elapsed,2),**summary(samples),'endpoints':{name:summary([s for s in samples if s['endpoint']==name]) for name in sorted({s['endpoint'] for s in samples})}}
    SAMPLES.extend(samples);print(json.dumps({'stageComplete':result}),flush=True);return result

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--smoke-only',action='store_true');parser.add_argument('--report',type=pathlib.Path,default=pathlib.Path('docs/testing/loadtest-6000-employees-2026-11-03.json'));args=parser.parse_args()
    deadline=time.time()+900
    while '[TenantSync] Done.' not in pathlib.Path('/private/tmp/hrms-load-runtime.log').read_text():
        if time.time()>deadline:raise RuntimeError('Tenant schema initialization did not complete')
        print(json.dumps({'waitingForSchemaSync':True}),flush=True);time.sleep(15)
    identities=[(org,1) for org in range(1,31)]+[(0,1)]+[(org,index) for index in range(2,9) for org in range(1,31)][:200]
    login_samples=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
        for org,index,token,ms in pool.map(lambda pair:login(*pair),identities):
            TOKENS[(org,index)]=token;login_samples.append(ms)
            if index>1:STAFF.append((org,index,token))
    print(json.dumps({'loginsReady':len(TOKENS),'medianLoginMs':round(statistics.median(login_samples),2)}),flush=True)
    checks=[]
    for endpoint in ENDPOINTS:
        name,method,path,payload=endpoint
        code,body,ms,error=request(method,path.format(org=1),TOKENS[(1,1)],1,payload)
        issue=validate(name,body,1) if code==200 else None
        ok=code in (200,201) and not issue
        checks.append({'endpoint':name,'status':code,'passed':ok,'ms':round(ms,2),'issue':issue or error or (body.get('message') if isinstance(body,dict) and not ok else None)})
        if ok:ACTIVE.append(endpoint)
        print(json.dumps({'preflight':checks[-1]}),flush=True)
    isolation=[]
    for org in range(1,31):
        foreign=org%30+1
        code,body,ms,error=request('GET','/employees?size=20',TOKENS[(org,1)],foreign)
        isolation.append({'organization':org,'foreignCompany':foreign,'status':code,'passed':code==403})
    print(json.dumps({'foreignTenantDenials':sum(c['passed'] for c in isolation),'expected':30}),flush=True)
    # Employee self-service authorization must still reject organization-wide payroll accounting.
    org,index,employee_token,ms=login(1,2)
    code,body,ms,error=request('GET',f'/accounting/salary?month={MONTH}',employee_token,1)
    employee_guard={'accountingDenied':code==403,'status':code}
    employee_checks=[]
    for endpoint in ['/auth/me','/payroll/employee/2/payslips']:
        code,body,ms,error=request('GET',endpoint,employee_token,1)
        employee_checks.append({'endpoint':endpoint,'passed':code==200,'status':code,'ms':round(ms,2)})
    # Baseline and stepped saturation. This is active-client load, not open-loop RPS.
    stages=[]
    if not args.smoke_only:
        for count,duration in [(1,15),(10,30),(50,45),(100,60),(200,90),(10,20)]:stages.append(stage(count,duration))
    report={'baseUrl':CFG['baseUrl'],'database':CFG['database'],'dataset':{'organizations':30,'employeesPerOrganization':200,'employees':6000,'attendanceRecords':180000,'payslips':18000,'initialLeaveRequests':6000,'initialTickets':6000},'testModel':'closed-loop active HTTP clients with 50-150ms think time; 70% employee self-service and 30% admin operations; 20s request timeout','login':{'count':len(login_samples),'medianMs':round(statistics.median(login_samples),2)},'preflight':checks,'isolationChecks':isolation,'employeeGuard':employee_guard,'employeeSelfService':employee_checks,'stages':stages,'summary':summary(SAMPLES),'errors':ERRORS,'excludedEndpoints':[c['endpoint'] for c in checks if not c['passed']]}
    args.report.parent.mkdir(parents=True,exist_ok=True);args.report.write_text(json.dumps(report,indent=2)+'\n')
    print(json.dumps({'report':str(args.report),'summary':report['summary'],'excludedEndpoints':report['excludedEndpoints']}),flush=True)
if __name__=='__main__':main()
