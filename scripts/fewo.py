import json,re,sys
# FeWo-direkt (той самий інвентар Expedia, що й Vrbo) → data/raw/vienna_fewo.json
# Вхід: картки з видачі, зібрані в Playwright (див. README): [{t: innerText, u: href, im: src}, …]
# python3 -I scripts/fewo.py .playwright-mcp/vienna_fewo_cards.json data/raw/vienna_fewo.json
IN,OUT=sys.argv[1],sys.argv[2]
raw=json.load(open(IN))
if isinstance(raw,str): raw=json.loads(raw)
def num(s): return float(s.replace('.','').replace(',','.'))
res={}
for c in raw:
    t=c['t'].replace('\xa0',' '); L=[x.strip() for x in t.split('\n') if x.strip()]
    m=re.search(r'/p(\d+)',c['u'] or '')
    if not m: continue
    pid=m.group(1)
    pm=re.search(r'Der aktuelle Preis beträgt ([\d.]+) €',t) or re.search(r'\n([\d.]+) €\nfür ',t)
    if not pm: continue
    name=re.sub(r'^Fotogalerie von ','',L[0])
    loc=next((x for x in L[2:5] if x.startswith('In ') or 'entfernt' in x),'')
    dm=re.search(r'([\d,]+) km von Wien entfernt',loc)
    unit=next((x for x in L if re.match(r'^[\wÄÖÜäöüß -]+ · ',x) and ('Schlafzimmer' in x or 'Bett' in x or 'Studio' in x)),'')
    rm=re.search(r'\n([\d,]+) von 10\n',t)
    rv=re.search(r'([\d.]+) (?:externe )?Bewertung',t)
    br=0 if 'Studio' in unit else (int(re.search(r'(\d+) Schlafzimmer',unit).group(1)) if 'Schlafzimmer' in unit else None)
    bm=re.search(r'(\d+) (?:\w+)?[Bb]etten?\b',unit)
    r10=num(rm.group(1)) if rm else None
    url=re.sub(r'&(pwa_ts|searchId|rfrr|referrerUrl|x_pwa|useRewards|top_dp|top_cur|userIntent|containsVideo)=[^&]*','',c['u'])
    res[pid]=dict(id=pid,name=name,kind=re.sub(r'^In ','',loc) if not dm else loc.split(',')[0],
        price=int(pm.group(1).replace('.','')),taxnote='з податками й зборами',
        rating=f"{r10:.1f}" if r10 else None,r10=r10,reviews=int(rv.group(1).replace('.','')) if rv else 0,
        lat=None,lng=None,dist=num(dm.group(1)) if dm else None,bedrooms=br,beds=int(bm.group(1)) if bm else None,
        guests=None,info=unit,url=url,img=c.get('im'),provider='FeWo-direkt')
json.dump(list(res.values()),open(OUT,'w'),ensure_ascii=False,indent=1)
print(len(raw),'cards →',len(res),file=sys.stderr)
