import re,json,sys,subprocess,time,os,tempfile
# HomeToGo (агрегатор): Відень, 6 дорослих, 28.12.2026 → 05.01.2027 (8 ночей), ціни в EUR
# Потік: /search/{loc}?…&_format=json → liveSearchTokens → опитуємо /livesearch/results, доки не завершиться,
# потім повторний /search дає згруповані ID (300 на сторінку, далі &page=N). Деталі (ціна, провайдер, рейтинг) — /searchdetails пачками по 12.
# Ціна: price.totalRawFull (з відомими зборами провайдера); у посиланнях HomeToGo стоїть «calculable_taxes_excluded» —
# міський податок (Ortstaxe) не входить. Сторінки /rental/ закриті Cloudflare для curl, тож ліжок (beds) немає.
# Щоб зібрати більше, робимо кілька пошуків (фільтри спалень, цінові діапазони, сортування) і об'єднуємо.
OUT=sys.argv[1] if len(sys.argv)>1 else 'data/raw/vienna_hometogo.json'
LOC='5460aec4cbc80'  # Vienna, Austria
BASE='adults=6&arrival=2026-12-28&duration=8'
H='https://www.hometogo.com'
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
JAR=tempfile.mktemp(suffix='.htg')
def get(url,form=None):
    c=["curl","-s","-b",JAR,"-c",JAR,"-b","c=EUR","-A",UA,"-H","Accept-Language: en-US",url]  # cookie c=EUR — валюта
    for k,v in (form or {}).items(): c+=["-F",f"{k}={v}"]
    for _ in range(3):
        try: return json.loads(subprocess.run(c,capture_output=True,text=True).stdout)
        except Exception: time.sleep(2)
def search(q):
    d=get(f"{H}/search/{LOC}?{q}&_format=json")
    if not d: return []
    tok=d.get('liveSearchTokens') or []
    for _ in range(40):  # live search: опитуємо, доки repeatable
        if not tok: break
        r=get(f"{H}/livesearch/results?location={LOC}&{q}",{f"tokens[{j}]":t for j,t in enumerate(tok)})
        if not r or not r.get('repeatable'): break
        time.sleep((r.get('repeatIn') or 2))
    if tok: d=get(f"{H}/search/{LOC}?{q}&_format=json") or d
    res=[o['id'] for o in d.get('offers') or []]
    for n in range(2,10):  # сторінки по 300
        if (d.get('filters') or {}).get('pagerFilter',{}).get('pager',{}).get('isLastPage',True): break
        d=get(f"{H}/search/{LOC}?{q}&page={n}&_format=json") or {}
        res+=[o['id'] for o in d.get('offers') or []]
    return res
QS=[('',None),('sot=best_value',None)]+[(f'bedrooms={n}',n) for n in range(1,7)]
BANDS=['minPricePerNight=9&maxPricePerNight=200','minPricePerNight=200&maxPricePerNight=300','minPricePerNight=300&maxPricePerNight=400',
 'minPricePerNight=400&maxPricePerNight=550','minPricePerNight=550&maxPricePerNight=750','minPricePerNight=750&maxPricePerNight=1000','minPricePerNight=1000']  # €/ніч
QS+=[(b,None) for b in BANDS]+[('type=holiday_apartment',None)]+[(f'type=holiday_apartment&{b}',None) for b in BANDS]
QS+=[(f'type={t}',None) for t in ('holiday_house','condo','holiday_park','other_accommodation')]+[('',None)]  # base ще раз — live search доповнюється
ids={};bmin={}
for q,bed in QS:
    r=search(BASE+('&'+q if q else ''))
    n0=len(ids)
    for i in r:
        ids.setdefault(i,1)
        if bed: bmin[i]=max(bmin.get(i,0),bed)  # з'являється у фільтрі «≥N спалень»
    print(q or 'base',len(r),'+',len(ids)-n0,file=sys.stderr)
def km(s):  # «5.1 km to center» / «970 m to center»
    m=re.search(r'([\d.,]+)\s*(km|m)\b',s or ''); return None if not m else round(float(m.group(1).replace(',',''))/(1 if m.group(2)=='km' else 1000),2)
def num(s):
    m=re.search(r'[\d.]+',str(s or '')); return float(m.group()) if m else None
SKIP={'Hotel','Private room','Bed and breakfast','Hostel','Pension','Room','Shared room'}  # лише житло цілком
out=[];L=list(ids)
for k in range(0,len(L),12):
    d=get(f"{H}/searchdetails/{LOC}?{BASE}&fieldTreeId=SearchDetailsFields.SERP",{'offers':','.join(L[k:k+12])}) or {}
    for o in d.get('offers') or []:
        p=o.get('price') or {}
        if o.get('bookedOut') or not p.get('totalRawEur') or p.get('currency')!='EUR': continue
        if (o.get('persons') or 0)<6 or o.get('type') in SKIP: continue
        full=p.get('totalRawFull') or p['totalRawEur']
        rt=o.get('ratings') or {}
        loc=o.get('location') or {};g=o.get('geoLocation') or {}
        bth=o.get('bathrooms')
        at=o.get('attributesTitle') or ''
        m=re.search(r'(\d+) bedroom',at)
        bd=o.get('bedrooms') if o.get('bedrooms') is not None else int(m.group(1)) if m else 0 if 'studio' in (at+str(o.get('type'))).lower() else None
        if bd is None and bmin.get(o['id'],0)>=2: bd=bmin[o['id']]  # нижня межа з фільтра «≥N спалень» (на перевірених збігається точно)
        info=' · '.join(x for x in [o.get('attributesTitle'),f"{bth} bath" if bth else None] if x)
        img=(o.get('images') or [{}])[0].get('large')
        out.append(dict(id=o['id'],name=o.get('secondaryTitle') or o.get('name'),
            kind=' · '.join(x for x in [o.get('type'),loc.get('level3')] if x),
            price=round(full),taxnote='з обов. зборами, без міськ. податку' if full>p['totalRawEur']+1 else 'без міськ. податку (збори не вказані)',
            rating=rt.get('starValue'),r10=num(rt.get('value')),reviews=rt.get('reviewCount') or 0,
            lat=g.get('lat'),lng=g.get('lon'),dist=km((o.get('locationTrailHeading') or {}).get('toCenterShort')),
            bedrooms=bd,beds=None,guests=o.get('persons'),info=info,
            url=f"{H}/rental/{o['id']}?duration=8&arrival=2026-12-28&adults=6&persons=6&location={LOC}",
            img=('https:'+img) if img and img.startswith('//') else img,provider=o.get('provider') or o.get('providerV2')))
    time.sleep(0.3)
os.path.exists(JAR) and os.remove(JAR)
out.sort(key=lambda x:x['price'])
json.dump(out,open(OUT,'w'),ensure_ascii=False,indent=1)
v=sorted(x['price'] for x in out)
print('ids',len(ids),'kept',len(out),'min',v[0] if v else None,'median',v[len(v)//2] if v else None,file=sys.stderr)
