import re,json,sys,html,subprocess,time,urllib.parse
# python3 -I scripts/willhaben.py data/raw/vienna_willhaben.json
# willhaben.at — переважно довгострокова оренда. Збираємо: усю категорію «Ferienimmobilie mieten» у Відні
# + пошук за ключовими словами короткої оренди в «Mietwohnungen» і «Haus mieten», потім читаємо повні оголошення
# і лишаємо лише ті, де явно можна жити поночі/потижнево (не «мінімум 1 місяць») і житло на ~6 осіб.
OUT=sys.argv[1] if len(sys.argv)>1 else 'data/raw/vienna_willhaben.json'
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
BASE="https://www.willhaben.at/iad/"
KW=["kurzzeitmiete","kurzzeit","kurzzeitvermietung","ferienwohnung","ferien","tageweise","wochenweise","nacht","pro nacht","urlaub","short term","short-term","shortterm","airbnb","kurzaufenthalt","silvester","monteurwohnung","touristen","tourist","holiday","vacation","per night","temporary","temporär","vorübergehend"]
SEARCHES=[("immobilien/ferienimmobilien-mieten/wien",None)]+[(c,k) for c in ["immobilien/mietwohnungen/wien","immobilien/haus-mieten/wien"] for k in KW]
def fetch(url):
    return subprocess.run(["curl","-sL","-A",UA,"-H","Accept-Language: de-AT",url],capture_output=True,text=True).stdout
def nextdata(h):
    m=re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>',h,re.S)
    return json.loads(m.group(1))['props']['pageProps'] if m else {}
def attrs(a): return {x['name']:x['values'][0] for x in a['attributes']['attribute'] if x['values']}
def num(s):
    try: return int(float(str(s).replace(',','.')))
    except Exception: return None
# 1. Пошукова видача з пагінацією (rows=90, page=N)
ads={}
for path,k in SEARCHES:
    for p in range(1,20):
        q={'rows':90,'page':p}
        if k: q['keyword']=k
        sr=nextdata(fetch(BASE+path+'?'+urllib.parse.urlencode(q))).get('searchResult') or {}
        lst=(sr.get('advertSummaryList') or {}).get('advertSummary') or []
        for a in lst: ads.setdefault(a['id'],a)
        if not lst or p*90>=sr.get('rowsFound',0): break
        time.sleep(0.5)
    print(path.split('/')[1],k,sr.get('rowsFound'),file=sys.stderr)
print('унікальних оголошень:',len(ads),file=sys.stderr)
# 2. Попередній фільтр за заголовком/коротким текстом, далі — повне оголошення
SHORT=re.compile(r'nacht|night|tageweise|pro tag|wochenweise|pro woche|per week|ferien|urlaub(?!s?feeling| zu ?hause|sgefühl)|holiday(?! feeling)|vacation|monteur|notfall|kurzzeit|short[- ]?term|airbnb|tourist|kurzaufenthalt',re.I)
NIGHT=re.compile(r'pro\s+(?:nacht|tag)|per\s+(?:night|day)|/\s*(?:nacht|night)\b|tageweise|wochenweise|pro\s+woche|per\s+week|mindest\w*\s+\w+\s+\d+\s*(?:nacht|nächte|tag)|ab\s+\d+\s+nächte|monat\w*\s+oder\s+nacht',re.I)
MINMONTH=re.compile(r'(?:mindest\w*|minimum|min\.)\s*(?:\w+\s+){0,2}(?:1|ein(?:en)?|one|\d+)\s*(?:monat|month)|(?:one|1)\s+month\s+or\s+longer|\b\d+\s*[-–]\s*\d+\s*(?:monat|month)',re.I)
res=[]
for i,a in ads.items():
    at=attrs(a)
    if not (SHORT.search(a['description']+' '+at.get('BODY_DYN','')) or at.get('PROPERTY_TYPE_ID')=='13'): continue
    ad=nextdata(fetch(BASE+'object?adId='+i)).get('advertDetails')
    if not ad: continue
    d=attrs(ad)
    desc=re.sub(r'\s+',' ',re.sub(r'<[^>]+>',' ',html.unescape(d.get('DESCRIPTION','')+' '+d.get('RENTAL_PRICE/PRICE_DESCRIPTION',''))))
    txt=a['description']+' '+desc
    ferien=d.get('PROPERTY_TYPE_ID')=='13'
    # поночі/потижнево мусить бути явно можливо; «мінімум 1 місяць / 1–6 місяців» — відкидаємо
    if not NIGHT.search(txt): continue
    if MINMONTH.search(txt) and not re.search(r'mindest\w*\s+\w+\s+\d+\s*(?:nacht|tag)',txt,re.I): continue
    rooms=num(d.get('NO_OF_ROOMS') or at.get('NUMBER_OF_ROOMS')) or None
    bedrooms=num(d.get('NO_OF_BEDROOMS')); beds=num(d.get('NO_OF_BEDS'))
    pers=[int(x) for x in re.findall(r'(\d+)\s*(?:erwachsene|personen|persons|people|guests|gäste)',txt,re.I)]
    gm=re.search(r'(?:bis zu|maximal|max\.?|platz für(?: maximal)?|for up to|up to)\s*(\d+)\s*(?:erwachsene|personen|persons|people|guests)',txt,re.I)
    guests=int(gm.group(1)) if gm else None
    big=max(pers or [0])>=6
    if guests and guests<6 and not big: continue
    if not (big or (rooms or 0)>=2 or (bedrooms or 0)>=2): continue
    if pers and max(pers)<6: continue  # явно сказано, що менше ніж на 6 осіб
    # Ціна: як у полі PRICE, інакше з тексту «EUR 66,-- … pro Nacht»
    price=num(d.get('PRICE') or at.get('PRICE'))
    if price is None:
        m=re.search(r'(?:EUR|€)\s*(\d+)[^.]{0,60}?pro\s+nacht',txt,re.I) or re.search(r'(\d+)\s*(?:€|EUR|euro)\s*pro\s+nacht',txt,re.I)
        price=int(m.group(1)) if m else None
    unit='unknown'
    if price is not None:
        if price<=400 and re.search(r'nacht|night|pro tag|per day|tageweise',txt,re.I): unit='ніч'
        elif price<=2000 and re.search(r'pro woche|per week|wochenweise',txt,re.I) and not re.search(r'monat|month',txt,re.I): unit='тиждень'
        elif price>=400 or re.search(r'pro monat|per month|/\s*monat|monatlich',txt,re.I): unit='місяць'
    price8=round(price*8) if unit=='ніч' else round(price*8/7) if unit=='тиждень' else None
    note=['ціна з оголошення']
    if unit=='ніч' and re.search(r'für (?:eine Nutzung von )?2 Personen',txt,re.I): note.append('за ніч для 2 осіб, за більше людей — доплата')
    if unit=='місяць': note.append('місячна ставка, поночі — за домовленістю')
    m=re.search(r'Endreinigung\w*\s*(?:von\s*)?(?:EUR|€)?\s*(\d+)',txt,re.I)
    if m: note.append(f'+ прибирання {m.group(1)} €')
    note.append('наявність на дати не перевірена')
    loc=at.get('LOCATION','') or ''
    distr=loc.split(',')[-1].strip() if 'Bezirk' in loc else ''
    lat=lng=None
    c=(d.get('COORDINATES') or at.get('COORDINATES') or '').split(',')
    if len(c)==2: lat,lng=float(c[0]),float(c[1])
    area=num(d.get('ESTATE_SIZE') or at.get('ESTATE_SIZE'))
    rng=re.search(r'(\d+)\s*[-–]\s*(\d+)\s*Personen',txt)
    info=' · '.join(x for x in [f'{rooms} Zimmer' if rooms else '',f'{bedrooms} Schlafzimmer' if bedrooms else '',f'{area} m²' if area else '',f'bis {guests} Personen' if guests else (f'{rng.group(1)}–{rng.group(2)} Personen je nach Wohnung' if rng else ''),{'ніч':'Preis pro Nacht','тиждень':'Preis pro Woche','місяць':'Preis pro Monat'}.get(unit,'')] if x)
    imgs=(a.get('advertImageList') or {}).get('advertImage') or []
    res.append(dict(id='willhaben-'+i,name=a['description'],kind=' · '.join(x for x in [d.get('PROPERTY_TYPE') or at.get('PROPERTY_TYPE'),' '.join(x for x in [at.get('POSTCODE'),distr] if x)] if x),
        price=price,price_unit=unit,price8=price8,taxnote=', '.join(note),rating=None,r10=None,reviews=0,lat=lat,lng=lng,dist=None,
        bedrooms=bedrooms,rooms=rooms,area_m2=area,beds=beds,guests=guests,info=info,url=BASE+at.get('SEO_URL','object?adId='+i),
        img=imgs[0].get('mainImageUrl') if imgs else None,provider='willhaben'))
    print(i,unit,price,price8,'|',info,'|',a['description'][:80],file=sys.stderr)
    time.sleep(0.3)
json.dump(res,open(OUT,'w'),ensure_ascii=False,indent=1)
print('записано',len(res),'→',OUT,file=sys.stderr)
