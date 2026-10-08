import re,json,sys,subprocess,time
# python3 -I scripts/interhome.py [data/raw/vienna_interhome.json]
# Interhome.com тепер працює на платформі HomeToGo: /search/{locationId} з "Accept: application/json"
# віддає JSON зі списком оголошень (ціни там приблизні), а POST /searchdetails/{locationId} з offers=id,…
# повертає точну ціну за весь термін (price.totalRawEur), спальні, гостей, рейтинг.
# Валюту сайт бере з гео-IP (у нас UAH), тому беремо саме totalRawEur.
# Довільні дати дозволені (не лише суботи) — шукаємо рівно 28.12–05.01, 8 ночей, 6 дорослих.
OUT=sys.argv[1] if len(sys.argv)>1 else 'data/raw/vienna_interhome.json'
LOC='5460aec4cbc80'  # Vienna, Austria (з /api/v2/autocomplete?q=Vienna)
ARR,NIGHTS,ADULTS,DATES='2026-12-28',8,6,'2026-12-28–2027-01-05'
Q=f'arrival={ARR}&duration={NIGHTS}&persons={ADULTS}&adults={ADULTS}&pricetype=totalPrice'
BASE='https://www.interhome.com'
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36"
def get(url,*extra):
    r=subprocess.run(["curl","-s","-A",UA,"-H","Accept: application/json","-H","Accept-Language: en-US",*extra,url],capture_output=True,text=True).stdout
    try: return json.loads(r)
    except Exception: print('не JSON:',url,r[:200],file=sys.stderr); return None
# 1) Список оголошень, посторінково (page=N), поки не порожньо
ids=[]; total=None
for page in range(1,30):
    d=get(f'{BASE}/search/{LOC}?{Q}'+(f'&page={page}' if page>1 else ''))
    if not d: break
    if total is None: total=d['searchSummary']['totalCountRaw']; print('всього за пошуком:',total,file=sys.stderr)
    new=[o['id'] for o in d.get('offers') or [] if o['id'] not in ids]
    if not new: break
    ids+=new
    if len(ids)>=total: break
    time.sleep(0.5)
# 2) Деталі з точною ціною; повторюємо, поки HomeToGo не завершить живий запит ціни (completed)
det={}
for i in range(0,len(ids),12):
    chunk=ids[i:i+12]
    for attempt in range(6):
        d=get(f'{BASE}/searchdetails/{LOC}?fieldTreeId=SearchDetailsFields.SERP&{Q}','-F','offers='+','.join(chunk))
        offs=(d or {}).get('offers') or []
        for o in offs: det[o['id']]=o
        if offs and all(o.get('completed') for o in offs): break
        time.sleep(2)
def num(s):
    m=re.search(r'[\d.]+',s or ''); return float(m.group()) if m else None
res=[]
for oid in ids:
    o=det.get(oid)
    if not o: print('без деталей:',oid,file=sys.stderr); continue
    p=o.get('price') or {}; rt=o.get('ratings') or {}; loc=o.get('location') or {}; g=o.get('geoLocation') or {}
    price=p.get('totalRawEur') if p.get('mode')=='totalPrice' and not o.get('bookedOut') else None
    guests=o.get('persons')
    if not price or (guests or 0)<ADULTS: continue
    br,ba,sq=o.get('bedrooms'),o.get('bathrooms'),o.get('squareMeter')
    info=' · '.join(x for x in [f'{br} bedroom'+('s' if br!=1 else '') if br is not None else '',f'{ba} bath' if ba else '',sq or '',f'{guests} guests'] if x)
    img=(o.get('images') or [{}])[0].get('large') or ''
    lat,lng=g.get('lat'),g.get('lon')
    res.append(dict(id=o.get('niceId') or oid,name=o.get('name') or o.get('h1'),
        kind=', '.join(x for x in [o.get('type'),loc.get('level3')] if x),
        price=int(round(price)),
        taxnote='Загальна ціна Interhome за 8 ночей'+('' if p.get('exact') else ' (орієнтовна)')+'; обов’язкові додаткові витрати (прибирання, турзбір тощо) можуть сплачуватися на місці',
        rating=(str(rt['starValue']) if rt.get('starValue') else None),r10=(float(rt['value']) if rt.get('value') else None),reviews=rt.get('reviewCount') or 0,
        lat=lat,lng=lng,dist=None if lat else num((o.get('locationTrailHeading') or {}).get('toCenterShort')),
        bedrooms=br,beds=None,guests=guests,info=info,
        url=f'{BASE}/rental/{oid}?duration={NIGHTS}&location={LOC}&arrival={ARR}&persons={ADULTS}&adults={ADULTS}&pricetype=totalPrice',
        img=('https:'+img if img.startswith('//') else img) or None,provider='Interhome',dates=DATES))
json.dump(res,open(OUT,'w'),ensure_ascii=False,indent=1)
vals=[x['price'] for x in res]
print('збережено',len(res),'з',len(ids),'ціни',min(vals) if vals else None,'–',max(vals) if vals else None,file=sys.stderr)
