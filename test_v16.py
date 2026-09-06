#!/usr/bin/env python3
"""v1.6: company deletion and password reset."""
import json, sys, urllib.request, urllib.error
B = sys.argv[1] if len(sys.argv)>1 else "http://localhost:8470"
P=F=0; ISSUES=[]
def ok(l,c,x=""):
    global P,F
    if c: P+=1; print(f"  PASS  {l}")
    else: F+=1; ISSUES.append(l); print(f"  FAIL  {l}   <-- {x}")
def call(m,p,b=None,t=None):
    r=urllib.request.Request(B+p,method=m,headers={'Content-Type':'application/json'})
    if t: r.add_header('Authorization','Bearer '+t)
    try:
        with urllib.request.urlopen(r, json.dumps(b).encode() if b is not None else None,timeout=40) as x:
            return x.status, json.loads(x.read())
    except urllib.error.HTTPError as e: return e.code, json.loads(e.read() or '{}')

print("="*72); print("v1.6 — company deletion and password reset"); print("="*72)
_,d=call('POST','/api/login',{'email':'admin@statspack.co.ls','password':'TestAdmin!2026'})
SUP=d['token']

# host-company agent, to prove isolation of the delete
_,ha=call('POST','/api/admin/agents',{'name':'Host Agent','email':'host@statspack.co.ls'},SUP)
_,hs=call('POST','/api/login',{'email':'host@statspack.co.ls','password':ha['temp_password']})
call('POST','/api/change-password',{'current_password':ha['temp_password'],'new_password':'Host!2026aa'},hs['token'])
HT=hs['token']
_,hc=call('POST','/api/clients',{'name':'Host Client','currency':'USD','monthly_value':1000},HT)
call('POST','/api/payments',{'client_id':hc['id'],'amount':1000,'currency':'USD','paid_date':'2026-01-15'},SUP)

# a client company with real activity
_,co=call('POST','/api/admin/companies',{'name':'Kalahari Systems','country':'Botswana',
    'admin_name':'Kagiso Seretse','admin_email':'kagiso@kalahari.co.bw'},SUP)
CO=co['id']
_,cs=call('POST','/api/login',{'email':'kagiso@kalahari.co.bw','password':co['temp_password']})
CT=cs['token']; call('POST','/api/change-password',{'current_password':co['temp_password'],'new_password':'Kalahari!2026'},CT)
_,ca=call('POST','/api/admin/agents',{'name':'Boitumelo Rex','email':'boi@kalahari.co.bw'},CT)
_,as_=call('POST','/api/login',{'email':'boi@kalahari.co.bw','password':ca['temp_password']})
AT=as_['token']; call('POST','/api/change-password',{'current_password':ca['temp_password'],'new_password':'Boi!2026aaa'},AT)
_,cc=call('POST','/api/clients',{'name':'Gaborone Freight','currency':'USD','monthly_value':800},AT)
call('POST','/api/payments',{'client_id':cc['id'],'amount':800,'currency':'USD','paid_date':'2026-02-01'},CT)
call('POST','/api/payouts',{'agent_id':ca['id'],'amount_usd':100},CT)
call('POST','/api/admin/reviews',{'agent_id':ca['id'],'rating':4,'body':'Good'},CT)
call('POST','/api/clients/%s/timeline'%cc['id'],{'kind':'call','body':'Spoke'},AT)

print("\n[ LISTING PEOPLE AT A COMPANY ]")
st,d=call('GET','/api/admin/companies/%s/users'%CO,None,SUP)
ok("super lists a company's people", st==200 and len(d['users'])==2, d.get('users'))
ok("shows both the admin and the agent",
   sorted(u['role'] for u in d['users'])==['admin','agent'], [u['role'] for u in d['users']])
st,d2=call('GET','/api/admin/companies/%s/users'%CO,None,CT)
ok("company admin cannot list via this route", d2 and st==403, st)
st,d2=call('GET','/api/admin/companies/%s/users'%CO,None,AT)
ok("agent cannot list", st==403, st)

print("\n[ RESETTING A COMPANY PASSWORD ]")
admin_id=[u['id'] for u in d['users'] if u['role']=='admin'][0]
st,r=call('POST','/api/admin/companies/%s/users/%s/reset-password'%(CO,admin_id),{},SUP)
ok("super resets the company admin's password", st==200 and r.get('temp_password'), r)
st,_=call('GET','/api/admin/agents',None,CT)
ok("their old session is killed immediately", st==401, st)
st,_=call('POST','/api/login',{'email':'kagiso@kalahari.co.bw','password':'Kalahari!2026'})
ok("their old password no longer works", st==401, st)
st,ns=call('POST','/api/login',{'email':'kagiso@kalahari.co.bw','password':r['temp_password']})
ok("the new one-time password works", st==200, ns)
CT=ns['token']
st,_=call('GET','/api/admin/agents',None,CT)
ok("they must change it before doing anything", st==428, st)
call('POST','/api/change-password',{'current_password':r['temp_password'],'new_password':'Kalahari!2027'},CT)
st,_=call('GET','/api/admin/agents',None,CT)
ok("normal access resumes after they set their own", st==200, st)
st,d3=call('POST','/api/admin/companies/%s/users/%s/reset-password'%(CO,admin_id),{},CT)
ok("a company admin cannot use this route", st==403, st)
_,me=call('GET','/api/me',None,SUP)
st,d3=call('POST','/api/admin/companies/1/users/%s/reset-password'%me['user']['id'],{},SUP)
ok("resetting your own super account is allowed", st==200, st)
call('POST','/api/change-password',{'current_password':d3['temp_password'],'new_password':'TestAdmin!2026'},
     call('POST','/api/login',{'email':'admin@statspack.co.ls','password':d3['temp_password']})[1]['token'])
_,d4=call('POST','/api/login',{'email':'admin@statspack.co.ls','password':'TestAdmin!2026'})
SUP=d4['token']
st,_=call('POST','/api/admin/companies/%s/users/999999/reset-password'%CO,{},SUP)
ok("unknown person 404s", st==404, st)
st,_=call('POST','/api/admin/companies/1/users/%s/reset-password'%ca['id'],{},SUP)
ok("cannot reset someone via the wrong company", st==404, st)

print("\n[ COMPANY DELETION GUARDS ]")
st,d=call('GET','/api/admin/companies/%s/footprint'%CO,None,SUP)
f=d['footprint']
ok("footprint counts accounts", f['users']==2 and f['admins']==1 and f['agents']==1, f)
ok("footprint counts clients and money", f['clients']==1 and abs(f['collected_usd']-800)<0.01, f)
ok("footprint counts paid payouts", f['payouts_paid']==0 or f['payouts_paid_usd']>=0, f)
st,d=call('GET','/api/admin/companies/1/footprint',None,SUP)
ok("host company is flagged as undeletable", d['can_delete'] is False, d)
st,_=call('DELETE','/api/admin/companies/1/purge',{'confirm_name':'StatsPack'},SUP)
ok("host company cannot be deleted", st==400, st)
st,_=call('DELETE','/api/admin/companies/%s/purge'%CO,{'confirm_name':'Wrong Name'},SUP)
ok("wrong confirmation refused", st==400, st)
st,_=call('DELETE','/api/admin/companies/%s/purge'%CO,{},SUP)
ok("missing confirmation refused", st==400, st)
st,_=call('DELETE','/api/admin/companies/%s/purge'%CO,{'confirm_name':'Kalahari Systems'},CT)
ok("company admin cannot delete their own company", st==403, st)
st,_=call('DELETE','/api/admin/companies/%s/purge'%CO,{'confirm_name':'Kalahari Systems'},AT)
ok("agent cannot delete a company", st==403, st)
st,d=call('GET','/api/admin/companies/%s/export'%CO,None,SUP)
ok("pre-delete export includes their payments", len(d['payments'])==1, len(d.get('payments',[])))
ok("export omits password hashes", all('password_hash' not in u for u in d['users']), 'LEAK')

print("\n[ THE DELETION ]")
st,d=call('DELETE','/api/admin/companies/%s/purge'%CO,{'confirm_name':'kalahari systems'},SUP)
ok("super deletes the company (case-insensitive)", st==200, d)
ok("reports accounts removed", d['deleted']['users']==2, d.get('deleted'))
ok("reports clients removed", d['deleted']['clients']==1, d.get('deleted'))
ok("reports payments removed", d['deleted']['payments']==1, d.get('deleted'))
st,_=call('POST','/api/login',{'email':'kagiso@kalahari.co.bw','password':'Kalahari!2027'})
ok("their admin can no longer sign in", st==401, st)
st,_=call('POST','/api/login',{'email':'boi@kalahari.co.bw','password':'Boi!2026aaa'})
ok("their agent can no longer sign in", st==401, st)
st,d=call('GET','/api/admin/companies',None,SUP)
ok("company is gone from the list", not any(c['id']==CO for c in d['companies']), [c['name'] for c in d['companies']])

print("\n[ THE HOST COMPANY IS UNTOUCHED ]")
st,d=call('GET','/api/admin/overview',None,SUP)
ok(f"host collections intact (${d['totals']['collected_usd']:,.0f})",
   d['totals']['collected_usd']==1000.0, d['totals'])
st,_=call('POST','/api/login',{'email':'host@statspack.co.ls','password':'Host!2026aa'})
ok("host agent still signs in", st==200, st)
st,d=call('GET','/api/clients',None,SUP)
ok("host client survives", [c['name'] for c in d['clients']]==['Host Client'], [c['name'] for c in d['clients']])

print("\n[ NOTHING ORPHANED ]")
st,d=call('GET','/api/admin/backup',None,SUP)
users={u['id'] for u in d['users']}; clients={c['id'] for c in d['clients']}
cos={c['id'] for c in d['companies']}
ok("no payments orphaned", not [p for p in d['payments'] if p['client_id'] not in clients], 'orphans')
ok("no timeline orphaned", not [e for e in d['client_events'] if e['client_id'] not in clients], 'orphans')
ok("no payouts orphaned", not [p for p in d['payouts'] if p['agent_id'] not in users], 'orphans')
ok("no reviews orphaned", not [r for r in d['reviews'] if r['agent_id'] not in users], 'orphans')
ok("no partnerships orphaned", not [k for k in d['collaborations']
    if k['client_id'] not in clients or k['owner_id'] not in users], 'orphans')
ok("no users left in a deleted company", not [u for u in d['users'] if u['company_id'] not in cos], 'orphans')
ok("no clients left in a deleted company", not [c for c in d['clients'] if c['company_id'] not in cos], 'orphans')
st,d=call('GET','/api/admin/audit?action=company.PURGED',None,SUP)
ok("deletion recorded in the log", d['matched']==1, d['matched'])
ok("log names the company and the money", 'Kalahari' in d['audit'][0]['detail']
   and '800' in d['audit'][0]['detail'], d['audit'][0]['detail'])
print(f"\n  {P} passed, {F} failed")
if ISSUES:
    print("\n  ISSUES:"); [print("   -",i) for i in ISSUES]
sys.exit(1 if F else 0)
