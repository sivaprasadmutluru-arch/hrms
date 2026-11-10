#!/usr/bin/env python3
"""Seed only hrms_loadtest_20261103. Requires schema-only snapshots in /private/tmp.
No production users or records are copied. Credentials remain in a private temp file.
"""
import json, pathlib, subprocess, time
ROOT=pathlib.Path('/private/tmp/hrms-loadtest')
DB='hrms_loadtest_20261103'
config=json.loads((ROOT/'credentials.json').read_text())
assert config['database']==DB and config['organizations']==30

def sql(text):
    result=subprocess.run(['docker','exec','-i','hrms-local-postgres','psql','-X','-U','postgres','-d',DB,'-v','ON_ERROR_STOP=1','-qAt'],input=text,text=True,capture_output=True)
    if result.returncode: raise RuntimeError(result.stderr[-1800:])
    return result.stdout.strip()

def quote(value): return "'"+value.replace("'","''")+"'"

sql('CREATE EXTENSION IF NOT EXISTS pgcrypto;')
hash=sql('SELECT crypt('+quote(config['password'])+",gen_salt('bf',10));")
sql("INSERT INTO public.backup_settings(id) VALUES(1) ON CONFLICT DO NOTHING;")
# Identities and organization records are synthetic and deterministic for validation.
for org in range(1,31):
    name=f'Load Organization {org:02d}';schema=f'load_org_{org:02d}';offset=(org-1)*200;slug='accruehr' if org==1 else f'load-org-{org:02d}'
    sql(f"""BEGIN;
    INSERT INTO public.organizations(id,name,slug,is_active,status,industry_type,subscription_plan,max_branches,employee_range,created_at,updated_at)
      VALUES({org},{quote(name)},'{slug}',true,'ACTIVE','GENERAL','STANDARD',5,NULL,now(),now());
    INSERT INTO public.companies(id,name,organization_id,company_type,status,is_active,schema_name,schema_ready,country,currency,branch_limit,created_at,updated_at)
      VALUES({org},{quote(name+' Head Office')},{org},'HEAD_OFFICE','ACTIVE',true,'{schema}',true,'India','INR',5,now(),now());
    INSERT INTO public.users(id,username,email,password,first_name,last_name,is_active,is_superuser,must_change_password,quick_start_tour_completed,login_held,account_manager_company_limit,created_at,updated_at)
      SELECT {offset}+i,'employee.'||lpad(i::text,3,'0')||'@org{org:02d}.loadtest.invalid','employee.'||lpad(i::text,3,'0')||'@org{org:02d}.loadtest.invalid',{quote(hash)},'Load{org:02d}-'||lpad(i::text,3,'0'),'Fixture',true,false,false,true,false,6,now(),now() FROM generate_series(1,200) i;
    INSERT INTO public.user_roles(user_id,role_id,company_id,access_scope,access_level,assignment_status,effective_from,is_active,created_at,updated_at)
      SELECT {offset}+i,r.id,{org},'SELF','FULL','ACTIVE',CURRENT_DATE,true,now(),now() FROM generate_series(1,200) i CROSS JOIN public.roles r WHERE r.name='EMPLOYEE';
    INSERT INTO public.user_roles(user_id,role_id,company_id,access_scope,access_level,assignment_status,effective_from,is_active,created_at,updated_at)
      SELECT {offset}+1,r.id,{org},'ENTERPRISE','FULL','ACTIVE',CURRENT_DATE,true,now(),now() FROM public.roles r WHERE r.name='ENTERPRISE_ADMIN';
    COMMIT;""")
    template=pathlib.Path('/private/tmp/hrms-load-tenant.sql').read_text().replace('accrue_technologies',schema)
    sql(template)
    sql(f"""BEGIN;
    INSERT INTO {schema}.departments(id,name,company_id,is_active,created_at,updated_at) VALUES(1,'Operations',{org},true,now(),now()),(2,'Engineering',{org},true,now(),now()),(3,'Human Resources',{org},true,now(),now());
    INSERT INTO {schema}.job_positions(id,name,company_id,department_id,is_active,created_at,updated_at) VALUES(1,'Operations Staff',{org},1,true,now(),now()),(2,'Software Engineer',{org},2,true,now(),now()),(3,'HR Executive',{org},3,true,now(),now());
    INSERT INTO {schema}.employees(id,badge_id,employee_first_name,employee_last_name,email,company_id,user_id,department_id,job_position_id,date_joining,is_active,created_at,updated_at)
      SELECT i,'LOAD-{org:02d}-'||lpad(i::text,3,'0'),'Load{org:02d}-'||lpad(i::text,3,'0'),'Fixture','employee.'||lpad(i::text,3,'0')||'@org{org:02d}.loadtest.invalid',{org},{offset}+i,((i-1)%3)+1,((i-1)%3)+1,'2025-01-01',true,now(),now() FROM generate_series(1,200) i;
    UPDATE {schema}.employees SET reporting_manager_id=1 WHERE id>1;
    INSERT INTO {schema}.attendances(attendance_date,company_id,employee_id,attendance_status,at_work_second,worked_hour,minimum_hour,attendance_overtime,overtime_minutes,overtime_second,deduction_minutes,deduction_amount,check_in,check_out,check_in_date,check_out_date,is_holiday,is_active,created_at,updated_at)
      SELECT CURRENT_DATE-days,{org},i,'REGULAR',28800,8,8,0,0,0,0,0,'09:00','17:00',CURRENT_DATE-days,CURRENT_DATE-days,false,true,now(),now() FROM generate_series(1,200) i CROSS JOIN generate_series(1,30) days;
    INSERT INTO {schema}.payslips(company_id,employee_id,start_date,end_date,basic_pay,gross_pay,net_pay,deduction,status,pay_head_data,auto_generated,sent_to_employee,is_active,created_at,updated_at)
      SELECT {org},i,(date_trunc('month',CURRENT_DATE)-make_interval(months=>m))::date,(date_trunc('month',CURRENT_DATE)-make_interval(months=>m)+interval '1 month - 1 day')::date,50000,55000,50000,5000,'CONFIRMED','{{}}',false,false,true,now(),now() FROM generate_series(1,200) i CROSS JOIN generate_series(1,3) m;
    INSERT INTO {schema}.leave_types(id,name,company_id,total_days,payment_type,is_organization_wide,limit_leave,require_attachment,exclude_company_leave,exclude_holiday,exclude_weekend,accrual_enabled,is_active,created_at,updated_at) VALUES(1,'Load Annual Leave',{org},20,'PAID',true,true,false,true,true,true,false,true,now(),now());
    INSERT INTO {schema}.leave_requests(company_id,employee_id,leave_type_id,start_date,end_date,requested_days,leave_duration,status,description,is_active,created_at,updated_at)
      SELECT {org},i,1,CURRENT_DATE+(i%20)+1,CURRENT_DATE+(i%20)+1,1,'FULL_DAY','REQUESTED','Synthetic load test leave',true,now(),now() FROM generate_series(1,200) i;
    INSERT INTO {schema}.tickets(title,description,company_id,raised_by_id,assigned_to_id,department_id,priority,status,is_active,created_at,updated_at)
      SELECT 'Load{org:02d} ticket '||i,'Synthetic performance fixture',{org},i,1,1,'MEDIUM','OPEN',true,now(),now() FROM generate_series(1,200) i;
    SELECT setval(pg_get_serial_sequence('{schema}.employees','id'),200);
    SELECT setval(pg_get_serial_sequence('{schema}.departments','id'),3);
    SELECT setval(pg_get_serial_sequence('{schema}.job_positions','id'),3);
    SELECT setval(pg_get_serial_sequence('{schema}.leave_types','id'),1);
    COMMIT;""")
    print(json.dumps({'preparedOrganization':org,'employees':org*200}),flush=True)
# Separate synthetic platform account, never linked to a real organization.
sql(f"""INSERT INTO public.users(id,username,email,password,first_name,last_name,is_active,is_superuser,must_change_password,quick_start_tour_completed,login_held,account_manager_company_limit,created_at,updated_at)
VALUES(6001,'platform@loadtest.invalid','platform@loadtest.invalid',{quote(hash)},'Load','Platform',true,false,false,true,false,6,now(),now());
INSERT INTO public.user_roles(user_id,role_id,company_id,access_scope,access_level,assignment_status,effective_from,is_active,created_at,updated_at) SELECT 6001,id,NULL,'ENTERPRISE','FULL','ACTIVE',CURRENT_DATE,true,now(),now() FROM public.roles WHERE name='PLATFORM_SUPER_ADMIN';
SELECT setval(pg_get_serial_sequence('public.users','id'),6001);
SELECT setval(pg_get_serial_sequence('public.companies','id'),30);
SELECT setval(pg_get_serial_sequence('public.organizations','id'),30);
ANALYZE;""")
print(json.dumps({'dataset':'ready','organizations':30,'employees':6000,'attendanceRecords':180000,'payslips':18000,'leaveRequests':6000,'tickets':6000}),flush=True)
