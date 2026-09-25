import re,os,json
d='supabase/migrations'; files=sorted(os.listdir(d))
ID=r'(?:"?(?:public|auth|storage)"?\.)?"?([A-Za-z0-9_]+)"?'
out=[]
for i,f in enumerate(files,1):
    s=open(os.path.join(d,f),encoding='utf-8',errors='ignore').read()
    s=re.sub(r'--[^\n]*','',s)
    # strip dollar-quoted bodies but keep function headers
    body=re.sub(r'\$([A-Za-z_]*)\$.*?\$\1\$','$$',s,flags=re.S)
    ev=[]
    for m in re.finditer(r'create\s+table\s+(?:if\s+not\s+exists\s+)?'+ID,body,re.I): ev.append(('+','t',m.group(1).lower()))
    for m in re.finditer(r'drop\s+table\s+(?:if\s+exists\s+)?'+ID,body,re.I): ev.append(('-','t',m.group(1).lower()))
    for m in re.finditer(r'alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?'+ID+r'(.*?);',body,re.I|re.S):
        t=m.group(1).lower()
        for c in re.finditer(r'add\s+column\s+(?:if\s+not\s+exists\s+)?"?([A-Za-z0-9_]+)"?',m.group(2),re.I): ev.append(('+','c',t+'.'+c.group(1).lower()))
        for c in re.finditer(r'drop\s+column\s+(?:if\s+exists\s+)?"?([A-Za-z0-9_]+)"?',m.group(2),re.I): ev.append(('-','c',t+'.'+c.group(1).lower()))
        for c in re.finditer(r'rename\s+column\s+"?(\w+)"?\s+to\s+"?(\w+)"?',m.group(2),re.I): ev.append(('-','c',t+'.'+c.group(1).lower())); ev.append(('+','c',t+'.'+c.group(2).lower()))
    for m in re.finditer(r'create\s+(?:or\s+replace\s+)?function\s+'+ID,body,re.I): ev.append(('+','f',m.group(1).lower()))
    for m in re.finditer(r'drop\s+function\s+(?:if\s+exists\s+)?'+ID,body,re.I): ev.append(('-','f',m.group(1).lower()))
    for m in re.finditer(r'create\s+policy\s+("[^"]+"|\w+)\s+on\s+'+ID,body,re.I): ev.append(('+','p',m.group(2).lower()+'.'+m.group(1).strip('"')))
    for m in re.finditer(r'drop\s+policy\s+(?:if\s+exists\s+)?("[^"]+"|\w+)\s+on\s+'+ID,body,re.I): ev.append(('-','p',m.group(2).lower()+'.'+m.group(1).strip('"')))
    for m in re.finditer(r'create\s+(?:or\s+replace\s+)?(?:constraint\s+)?trigger\s+"?(\w+)"?.*?\bon\s+'+ID,body,re.I|re.S): ev.append(('+','g',m.group(2).lower()+'.'+m.group(1).lower()))
    for m in re.finditer(r'drop\s+trigger\s+(?:if\s+exists\s+)?"?(\w+)"?\s+on\s+'+ID,body,re.I): ev.append(('-','g',m.group(2).lower()+'.'+m.group(1).lower()))
    for m in re.finditer(r'create\s+(?:unique\s+)?index\s+(?:concurrently\s+)?(?:if\s+not\s+exists\s+)?"?(\w+)"?',body,re.I): ev.append(('+','i',m.group(1).lower()))
    for m in re.finditer(r'drop\s+index\s+(?:concurrently\s+)?(?:if\s+exists\s+)?(?:public\.)?"?(\w+)"?',body,re.I): ev.append(('-','i',m.group(1).lower()))
    for m in re.finditer(r'alter\s+table\s+(?:if\s+exists\s+)?(?:only\s+)?'+ID+r'\s+rename\s+to\s+"?(\w+)"?',body,re.I): ev.append(('-','t',m.group(1).lower())); ev.append(('+','t',m.group(2).lower()))
    # order events by position is lost; approximate: keep as found
    out.append({'i':i,'f':f,'ev':ev})
json.dump(out,open(os.environ['HOME']+'/work/events.json','w'))
# replay
final={}
for m in out:
    # process drops before creates within file? keep creates after drops (common pattern drop-if-exists then create)
    for op,k,n in [e for e in m['ev'] if e[0]=='-']+[e for e in m['ev'] if e[0]=='+']:
        key=k+':'+n
        if op=='+': final[key]=m['i']
        else: final.pop(key,None)
        if k=='t' and op=='-':
            for kk in [x for x in final if x.startswith(('c:'+n+'.','p:'+n+'.','g:'+n+'.'))]: final.pop(kk)
print(len(final), sum(len(m['ev']) for m in out))
from collections import Counter; print(Counter(k.split(':')[0] for k in final))
compact={}
for key,i in final.items(): compact.setdefault(i,[]).append(key)
json.dump(compact,open(os.environ['HOME']+'/work/final.json','w'),separators=(',',':'))
print(os.path.getsize(os.environ['HOME']+'/work/final.json'))
print(sorted(set(range(1,221))-set(compact)))
