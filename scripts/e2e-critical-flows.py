#!/usr/bin/env python3
"""Critical API journeys. Requires a DISPOSABLE backend on 127.0.0.1:8082.

Never points at the normal local backend (8081). Creates synthetic organizations
and employees; discard the dedicated database after testing. Platform credentials
must be supplied through HRMS_E2E_USERNAME / HRMS_E2E_PASSWORD. No tokens or
passwords are logged or written to the report. Uses only Python's standard library.
"""
import argparse
import json
import os
import secrets
import time
import urllib.error
import urllib.request
import uuid
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

BASE = 'http://127.0.0.1:8082/api'
TOKENS = {}
RESULTS = []
RUN = uuid.uuid4().hex[:10]
PASSWORD = 'E2e_' + secrets.token_hex(16) + '!'
NEW_PASSWORD = 'E2e_' + secrets.token_hex(16) + '!'


def request(method, path, data=None, actor='platform', company=None):
    headers = {'Content-Type': 'application/json'}
    if actor in TOKENS:
        headers['Authorization'] = 'Bearer ' + TOKENS[actor]['token']
    if company is not None:
        headers['X-Company-Id'] = str(company)
    req = urllib.request.Request(BASE + path, method=method, headers=headers,
        data=None if data is None else json.dumps(data).encode())
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            return response.status, json.loads(response.read() or '{}')
    except urllib.error.HTTPError as error:
        return error.code, json.loads(error.read() or '{}')


def check(name, method, path, data=None, actor='platform', company=None, expected=(200,)):
    status, body = request(method, path, data, actor, company)
    result = {'check': name, 'status': status, 'passed': status in expected}
    RESULTS.append(result)
    print(json.dumps(result), flush=True)
    if not result['passed']:
        raise AssertionError(f'{name}: expected {expected}, received HTTP {status}')
    return body


def verify(name, condition):
    RESULTS.append({'check': name, 'passed': bool(condition)})
    if not condition:
        raise AssertionError(name)


def login(actor, username, password):
    status, body = request('POST', '/auth/login',
        {'usernameOrEmail': username, 'password': password}, actor='none')
    if status != 200:
        raise AssertionError(f'Synthetic {actor} login failed: HTTP {status}')
    TOKENS[actor] = body
    verify(actor + ' authentication', True)


def organization(key, industry):
    username = 'e2e_' + RUN + '_' + key
    created = check(key + ' organization/admin creation', 'POST', '/organizations', {
        'name': 'E2E ' + RUN + ' ' + key, 'country': 'India',
        'industryType': industry, 'employeeRange': 'EMPLOYEES_1_20',
        'adminUsername': username, 'adminEmail': username + '@example.invalid',
        'adminPassword': PASSWORD, 'adminFirstName': 'Synthetic owner'})
    company = created['headOfficeCompanyId']
    org = created['organization']['id']
    for _ in range(60):
        status, job = request('GET', f'/companies/{company}/provisioning-status')
        if status == 200 and job['status'] == 'READY':
            break
        if status == 200 and job['status'] == 'FAILED':
            raise AssertionError('Workspace provisioning failed')
        time.sleep(1)
    else:
        raise AssertionError('Workspace provisioning timeout')
    verify(key + ' durable workspace provisioning', True)
    login('owner_' + key, username, PASSWORD)
    summary = check(key + ' Legacy subscription', 'GET', f'/billing/organizations/{org}',
        actor='owner_' + key, company=company)
    verify(key + ' Legacy has no fabricated billing dates',
        summary['legacyAccess'] and summary['startedAt'] is None and summary['paidUntil'] is None)
    setup = check(key + ' industry catalog', 'GET', f'/companies/{company}/employee-setup', company=company)
    return company, org, setup


def employee(company, name, actor='platform', **extra):
    return check('Create ' + name, 'POST', '/employees',
        {'firstName': 'Synthetic ' + name, 'companyId': company, **extra}, actor=actor, company=company)


def billing(org):
    return request('GET', f'/billing/organizations/{org}')[1]


def activate(company, org, plan, cycle='MONTHLY', request_id=None):
    return check('Activate ' + plan + ' ' + cycle, 'POST', f'/billing/organizations/{org}/manual-activation',
        {'plan': plan, 'cycle': cycle, 'requestId': request_id or str(uuid.uuid4()),
         'reason': 'Synthetic E2E activation'}, company=company)


def run():
    login('platform', os.environ['HRMS_E2E_USERNAME'], os.environ['HRMS_E2E_PASSWORD'])
    check('Unauthenticated directory blocked', 'GET', '/organizations', actor='none', expected=(401,403))
    check('Missing initial admin rejected', 'POST', '/organizations',
        {'name': 'Incomplete synthetic org', 'employeeRange': 'EMPLOYEES_1_20'}, expected=(400,))
    a, oa, sa = organization('software', 'SOFTWARE')
    b, ob, sb = organization('medical', 'MEDICAL')
    verify('Industry catalogs differ', len(sa['jobPositions']) != len(sb['jobPositions']))
    check('Cross-organization billing denied', 'GET', f'/billing/organizations/{ob}',
        actor='owner_software', company=a, expected=(403,))
    check('Cross-organization company selection denied', 'GET', '/employees',
        actor='owner_software', company=b, expected=(403,))
    check('Current organization deletion blocked', 'DELETE', f'/organizations/{oa}', company=a, expected=(400,409))
    check('Owner can choose Free', 'POST', f'/billing/organizations/{oa}/free-activation', {},
        actor='owner_software', company=a)
    check('Owner cannot use platform payment bypass', 'POST', f'/billing/organizations/{oa}/manual-activation',
        {'plan':'BASIC','cycle':'MONTHLY','requestId':str(uuid.uuid4()),'reason':'Synthetic attempt'},
        actor='owner_software', company=a, expected=(403,))
    branch = check('Free first branch', 'POST', f'/companies/{a}/branches', {'name':'E2E first branch'}, company=a)['id']
    check('Free second branch denied', 'POST', f'/companies/{a}/branches', {'name':'E2E denied branch'}, company=a, expected=(400,409))
    email = 'worker_' + RUN + '@example.invalid'
    worker = employee(a, 'worker', email=email, password=PASSWORD)
    login('worker', email, PASSWORD)
    check('Initial employee password change', 'POST', '/auth/change-password',
        {'currentPassword':PASSWORD,'newPassword':NEW_PASSWORD}, actor='worker', company=a)
    login('worker', email, NEW_PASSWORD)
    own = check('Employee self-service profile', 'GET', '/ess/me', actor='worker', company=a)
    verify('Self-service returns own employee', own['id'] == worker['id'])
    for name, path in [('directory','/employees'),('billing',f'/billing/organizations/{oa}')]:
        check('Employee cannot manage ' + name, 'GET', path, actor='worker', company=a, expected=(403,))
    while billing(oa)['usage']['currentEmployees'] < 20:
        employee(a, 'Free filler')
    check('Free user 21 denied', 'POST', '/employees', {'firstName':'Synthetic overflow','companyId':a}, company=a, expected=(400,409))
    check('Archive first branch', 'DELETE', f'/companies/{branch}', company=a)
    check('Replacement branch', 'POST', f'/companies/{a}/branches', {'name':'E2E replacement'}, company=a)
    check('Free branch restoration denied', 'POST', f'/companies/{branch}/restore', {}, company=a, expected=(400,409))
    activate(a, oa, 'BASIC')
    check('Basic branch restoration allowed', 'POST', f'/companies/{branch}/restore', {}, company=a)
    check('Basic third branch denied', 'POST', f'/companies/{a}/branches', {'name':'E2E overflow'}, company=a, expected=(400,409))
    check('Over-limit Free downgrade denied', 'POST', f'/billing/organizations/{oa}/free-activation', {}, company=a, expected=(409,))
    wid = worker['id']
    check('Archive employee', 'POST', f'/employees/{wid}/archive?companyId={a}', {}, company=a)
    while billing(oa)['usage']['currentEmployees'] < 50:
        employee(a, 'Basic filler')
    check('Basic user 51 denied', 'POST', '/employees', {'firstName':'Synthetic overflow','companyId':a}, company=a, expected=(400,409))
    check('Single restore respects capacity', 'POST', f'/employees/{wid}/restore?companyId={a}', {}, company=a, expected=(400,409))
    check('Bulk restore respects capacity', 'POST', '/employees/bulk-toggle-active', {'ids':[wid],'active':True}, company=a, expected=(400,409))
    owner_id = TOKENS['owner_software']['employeeId']
    people = request('GET','/employees?size=100&active=true',company=a)[1]['content']
    other = next(p['id'] for p in people if p['id'] != owner_id)
    check('Release one slot', 'POST', f'/employees/{other}/archive?companyId={a}', {}, company=a)
    check('Over-limit restoration batch rejected', 'POST', '/employees/bulk-toggle-active', {'ids':[wid,other],'active':True}, company=a, expected=(400,409))
    verify('Restoration batch rolled back', billing(oa)['usage']['currentEmployees'] == 49 and all(
        not request('GET',f'/employees/{i}',company=a)[1]['isActive'] for i in [wid,other]))
    def race(n):
        return request('POST','/employees',{'firstName':'Synthetic race '+str(n),'companyId':a},company=a)[0]
    with ThreadPoolExecutor(max_workers=2) as executor:
        statuses = sorted(executor.map(race,[1,2]))
    verify('Concurrent final-slot creation serialized', statuses in ([200,400],[200,409]) and billing(oa)['usage']['currentEmployees']==50)
    before = billing(oa)
    key = str(uuid.uuid4())
    renewed = activate(a,oa,'BASIC',request_id=key)
    replayed = activate(a,oa,'BASIC',request_id=key)
    verify('Renewal retains start and extends expiry once', renewed['startedAt']==before['startedAt'] and renewed['paidUntil']>before['paidUntil'] and renewed['paidUntil']==replayed['paidUntil'])
    check('Unconfigured Stripe checkout fails cleanly', 'POST', f'/billing/organizations/{oa}/checkout',
        {'plan':'STANDARD','cycle':'MONTHLY'},actor='owner_software',company=a,expected=(503,))
    positions = {p['name']:p for p in sb['jobPositions']}
    for role in ['CEO','COO']:
        position=positions[role]
        path=f"/companies/{b}/job-positions/{position['id']}/access"
        policy=check('Read '+role+' policy','GET',path,actor='owner_medical',company=b)
        check('Configure '+role+' policy','PUT',path,{'profile':role,'version':policy['policy']['version']},actor='owner_medical',company=b)
        email=role.lower()+'_'+RUN+'@example.invalid'
        employee(b,role,email=email,password=PASSWORD,departmentId=position['departmentId'],jobPositionId=position['id'])
        login(role,email,PASSWORD)
        check(role+' first password change','POST','/auth/change-password',{'currentPassword':PASSWORD,'newPassword':NEW_PASSWORD},actor=role,company=b)
        login(role,email,NEW_PASSWORD)
        check(role+' workforce access','GET','/employees',actor=role,company=b)
    check('CEO organization billing','GET',f'/billing/organizations/{ob}',actor='CEO',company=b)
    check('CEO payroll','GET','/payroll/contracts',actor='CEO',company=b)
    check('CEO excluded from platform','GET','/organizations',actor='CEO',company=b,expected=(403,))
    check('COO excluded from payroll','GET','/payroll/contracts',actor='COO',company=b,expected=(403,))
    check('COO excluded from billing','GET',f'/billing/organizations/{ob}',actor='COO',company=b,expected=(403,))
    p=positions['CEO'];path=f"/companies/{b}/job-positions/{p['id']}/access"
    check('COO cannot grant CEO policy','PUT',path,{'profile':'CEO','version':1},actor='COO',company=b,expected=(403,))
    policy=check('Read CEO revocation version','GET',path,actor='owner_medical',company=b)
    check('Revoke CEO policy','PUT',path,{'profile':'NONE','version':policy['policy']['version']},actor='owner_medical',company=b)
    check('Existing CEO token immediately loses access','GET',f'/billing/organizations/{ob}',actor='CEO',company=b,expected=(403,))
    branch=check('Create medical branch','POST',f'/companies/{b}/branches',{'name':'E2E medical branch'},company=b)['id']
    email='branch_'+RUN+'@example.invalid'
    employee(branch,'branch admin',email=email,password=PASSWORD,role='BRANCH_ADMIN',accessScope='BRANCH')
    login('branch',email,PASSWORD)
    check('Branch admin first password change','POST','/auth/change-password',{'currentPassword':PASSWORD,'newPassword':NEW_PASSWORD},actor='branch',company=branch)
    login('branch',email,NEW_PASSWORD)
    victim=employee(b,'outside branch')
    check('Branch cannot read head-office employee','GET',f"/employees/{victim['id']}",actor='branch',company=branch,expected=(404,))
    check('Branch cannot bulk-edit head-office employee','POST','/employees/bulk-update',{'employeeIds':[victim['id']]},actor='branch',company=branch,expected=(404,))
    check('Branch can read own workforce','GET','/employees',actor='branch',company=branch)


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--confirm-disposable-database',action='store_true',required=True)
    parser.add_argument('--report',type=Path,required=True)
    args=parser.parse_args()
    try:
        run()
    finally:
        args.report.write_text(json.dumps({'run':RUN,'baseUrl':BASE,'checks':RESULTS},indent=2)+'\n')
    print(f'PASS: {len(RESULTS)} checks. Synthetic fixtures remain only in the disposable database.')
