#!/usr/bin/env python3
"""Local resource sampling for the disposable stress-test backend only."""
import argparse,json,pathlib,subprocess,time,datetime
parser=argparse.ArgumentParser();parser.add_argument('--pid',required=True,type=int);parser.add_argument('--report',type=pathlib.Path,default=pathlib.Path('docs/testing/loadtest-6000-employees-2026-11-03.json'));parser.add_argument('--output',type=pathlib.Path,default=pathlib.Path('/private/tmp/hrms-loadtest/resources.jsonl'));args=parser.parse_args();PID=str(args.pid);started=time.time()
report=args.report
output=args.output
with output.open('w') as stream:
 for _ in range(100):
  sample={'at':datetime.datetime.now(datetime.timezone.utc).isoformat()}
  ps=subprocess.run(['ps','-p',PID,'-o','%cpu=,rss=,etime='],capture_output=True,text=True)
  values=ps.stdout.split()
  if len(values)>=3:sample.update({'backendCpuPercent':float(values[0]),'backendRssMB':round(int(values[1])/1024,2),'elapsed':values[2]})
  sql="SELECT count(*) FILTER(WHERE state='active'),count(*),count(*) FILTER(WHERE wait_event_type='Lock'),count(*) FILTER(WHERE state='active' AND now()-query_start>interval '1 second') FROM pg_stat_activity WHERE datname='hrms_loadtest_20261103';"
  result=subprocess.run(['docker','exec','hrms-local-postgres','psql','-U','postgres','-d','hrms_loadtest_20261103','-Atc',sql],capture_output=True,text=True)
  if result.returncode==0:
   values=result.stdout.strip().split('|')
   sample.update(dict(zip(['dbActiveConnections','dbConnections','dbLockWaits','queriesOverOneSecond'],map(int,values))))
  stream.write(json.dumps(sample)+'\n');stream.flush()
  if report.exists() and report.stat().st_mtime>=started:break
  time.sleep(5)
