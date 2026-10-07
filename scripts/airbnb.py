import re,json,sys,base64,subprocess,urllib.parse,time
OUT=sys.argv[1]
CITIES={"paris":"Paris--France","vienna":"Vienna--Austria","prague":"Prague--Czechia","brno":"Brno--Czechia","berlin":"Berlin--Germany","budapest":"Budapest--Hungary","naples":"Naples--Italy","strasbourg":"Strasbourg--France","salzburg":"Salzburg--Austria","ljubljana":"Ljubljana--Slovenia","zagreb":"Zagreb--Croatia","tallinn":"Tallinn--Estonia","riga":"Riga--Latvia","munich":"Munich--Germany"}
# Опційно: python3 airbnb.py out.json salzburg riga …  — лише вказані міста
if len(sys.argv)>2: CITIES={k:v for k,v in CITIES.items() if k in sys.argv[2:]}
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
def find(o,k):
    if isinstance(o,dict):
        for kk,v in o.items():
            if kk==k: yield v
            yield from find(v,k)
    elif isinstance(o,list):
        for x in o: yield from find(x,k)
def fetch(url):
    h=subprocess.run(["curl","-sL","-A",UA,"-H","Accept-Language: en-US",url],capture_output=True,text=True).stdout
    m=re.search(r'<script id="data-deferred-state-0"[^>]*>(.*?)</script>',h,re.S)
    return json.loads(m.group(1)) if m else None
def money(s):
    m=re.search(r'€([\d,]+)',s or ''); return int(m.group(1).replace(',','')) if m else None
res={}
for key,slug in CITIES.items():
    seen={}
    for pmax in [None]:
        base=f"https://www.airbnb.com/s/{slug}/homes?checkin=2026-12-28&checkout=2027-01-05&adults=6&room_types%5B%5D=Entire%20home%2Fapt&min_bedrooms=2&currency=EUR&locale=en"
        if pmax: base+=f"&price_max={pmax}"
        cursors=[None]; i=0
        while i<len(cursors) and i<15:
            url=base+(f"&pagination_search=true&cursor={urllib.parse.quote(cursors[i])}" if cursors[i] else "")
            d=fetch(url); i+=1
            if not d: print(key,'fail',i,file=sys.stderr); continue
            if i==1:
                pc=list(find(d,'pageCursors'))
                if pc and pc[0]: cursors=pc[0]
            for r in next(find(d,'searchResults'),[]) or []:
                ds=r.get('demandStayListing') or {}
                try: lid=base64.b64decode(ds['id']).decode().split(':')[1]
                except Exception: continue
                p=r.get('structuredDisplayPrice') or {}
                pl=p.get('primaryLine') or {}
                tot=money(pl.get('discountedPrice') or pl.get('price'))
                acc=pl.get('accessibilityLabel','')
                beds=[x.get('body') for x in (r.get('structuredContent') or {}).get('mapPrimaryLine') or []]
                beds2=[x.get('body') for x in (r.get('structuredContent') or {}).get('primaryLine') or []]
                pics=[x['picture'] for x in r.get('contextualPictures') or []][:1]
                loc=(ds.get('location') or {}).get('coordinate') or {}
                seen[lid]=dict(id=lid,title=r.get('title'),name=r.get('subtitle'),rating=r.get('avgRatingLocalized'),total=tot,label=acc,beds=beds+beds2,pic=pics[0] if pics else None,lat=loc.get('latitude'),lng=loc.get('longitude'),url=f"https://www.airbnb.com.ua/rooms/{lid}?check_in=2026-12-28&check_out=2027-01-05&adults=6")
            time.sleep(0.5)
    res[key]=list(seen.values())
    vals=[x['total'] for x in seen.values() if x['total']]
    print(key,len(seen),min(vals) if vals else None,file=sys.stderr)
    json.dump(res,open(OUT,'w'),ensure_ascii=False,indent=1)
