import json,re,math,os,statistics as st,sys,unicodedata
# Усі варіанти житла у Відні → data/vienna.js (сторінка vienna.html)
# python3 -I scripts/vienna.py [дата]   вхід: data/raw/vienna_*.json
CENTRE=(48.2085,16.3731)  # Stephansplatz
DATE=sys.argv[1] if len(sys.argv)>1 else '08.10.2026'
# Приблизні центри районів — для відстані, коли платформа дає лише район
DISTRICTS={'Innere Stadt':(48.2092,16.3700),'Leopoldstadt':(48.2167,16.4000),'Landstraße':(48.1983,16.3950),'Wieden':(48.1920,16.3710),
 'Margareten':(48.1867,16.3550),'Mariahilf':(48.1960,16.3480),'Neubau':(48.2020,16.3480),'Josefstadt':(48.2110,16.3480),'Alsergrund':(48.2250,16.3550),
 'Favoriten':(48.1550,16.3800),'Simmering':(48.1670,16.4400),'Meidling':(48.1720,16.3250),'Hietzing':(48.1700,16.2700),'Penzing':(48.2050,16.2700),
 'Rudolfsheim-Fünfhaus':(48.1960,16.3250),'Ottakring':(48.2130,16.3050),'Hernals':(48.2250,16.2900),'Währing':(48.2300,16.3250),'Döbling':(48.2550,16.3250),
 'Brigittenau':(48.2380,16.3700),'Floridsdorf':(48.2750,16.4000),'Donaustadt':(48.2300,16.4800),'Liesing':(48.1400,16.2900)}
def km(p,q):
    R=6371;la1,lo1,la2,lo2=map(math.radians,(*p,*q))
    return 2*R*math.asin(math.sqrt(math.sin((la2-la1)/2)**2+math.cos(la1)*math.cos(la2)*math.sin((lo2-lo1)/2)**2))
def num(pat,txt,cast=int):
    m=re.search(pat,txt or ''); return cast(m.group(1)) if m else None
def places(txt):
    n=0
    for cnt,kind in re.findall(r'(\d+)\s+(?:extra-large |large |)(single|double|sofa|bunk|futon|queen|king)',txt):
        n+=int(cnt)*(1 if kind in('single','futon') else 2)
    return n or None
def load(name):
    p=f'data/raw/vienna_{name}.json'
    return json.load(open(p)) if os.path.exists(p) else None
def district_dist(k):
    for d,c in DISTRICTS.items():
        if d.lower() in (k or '').lower(): return round(km(CENTRE,c),1)
    return None

items=[]
def add(**x):
    x.setdefault('pl',None); x.setdefault('u2',None); x.setdefault('da',False); x.setdefault('via',None)
    if x['d'] is None and x['k']:
        x['d']=district_dist(x['k']); x['da']=x['d'] is not None
    items.append(x)

a=load('airbnb')
for l in (a or {}).get('vienna',[]):
    if not l['total']: continue
    txt=' · '.join(dict.fromkeys(l['beds']))
    m=re.match(r'([\d.]+) \((\d+)\)',l['rating'] or '')
    r,n=(float(m.group(1)),int(m.group(2))) if m else (None,0)
    pic=l['pic']; pic=pic+('&' if '?' in pic else '?')+'im_w=720' if pic else None
    add(s='Airbnb',n=l['name'] or l['title'],k=re.sub(r'^.*? in ','',l['title'] or ''),p=l['total'],t='без туристичного збору',
        r=f"{r:.2f}" if r else None,r10=round(r*2,2) if r else None,v=n,
        d=round(km(CENTRE,(l['lat'],l['lng'])),1) if l['lat'] is not None else None,
        br=0 if 'Studio' in txt else num(r'(\d+) bedrooms?',txt),b=num(r'(\d+) (?:\w+ )?beds?\b',txt),i=txt,u=l['url'],im=pic)
b=load('booking')
for c in (b or {}).get('vienna',{}).get('cards',[]):
    name,url,dist,score,unit,price,tax,img,addr=c
    if not price: continue
    dm=re.match(r'([\d.]+)\s*(km|m)\b',dist or '')
    sm=re.match(r'Scored ([\d.]+)\|.*\|([\d,]+) reviews?',score or '')
    r,n=(float(sm.group(1)),int(sm.group(2).replace(',',''))) if sm else (None,0)
    add(s='Booking',n=name,k=re.sub(r'^\d+\.\s*|,\s*Vienna$','',addr or ''),p=price+tax,t='з податками',
        r=f"{r:.1f}" if r else None,r10=r,v=n,d=round(float(dm.group(1))/(1000 if dm.group(2)=='m' else 1),1) if dm else None,
        br=0 if 'Entire studio' in unit else num(r'(\d+) bedrooms?',unit),b=num(r'(\d+) beds?\b',unit),pl=places(unit),
        i=unit.replace('Recommended for your group | ',''),
        u='https://www.booking.com/hotel/'+url+'?checkin=2026-12-28&checkout=2027-01-05&group_adults=6&no_rooms=1&selected_currency=EUR',im=img)

# Решта платформ у спільному форматі (див. scripts/fewo.py, hometogo.py, holidu.py, interhome.py, willhaben.py)
# willhaben не підключено: там лише довгострокова оренда, на 6 гостей подобово нічого (див. scripts/willhaben.py)
LABEL={'fewo':'Vrbo','hometogo':'HomeToGo','holidu':'Holidu','interhome':'Interhome'}
# Коротка примітка до ціни для картки (повні пояснення — у примітках сторінки)
NOTE={'fewo':'з податками й зборами','hometogo':'без міського податку','holidu':'без туристичного збору','interhome':'збори можуть бути окремо'}
for src,label in LABEL.items():
    for l in load(src) or []:
        price=l.get('price')
        if not price: continue
        d=l.get('dist')
        if d is None and l.get('lat') is not None: d=round(km(CENTRE,(l['lat'],l['lng'])),1)
        x=dict(s=label,n=l['name'],k=l.get('kind') or '',p=int(price),t=NOTE[src],
            r=l.get('rating'),r10=l.get('r10'),v=l.get('reviews') or 0,d=d,br=l.get('bedrooms'),b=l.get('beds'),
            i=l.get('info') or '',u=l['url'],im=l.get('img'))
        if src=='fewo':
            x['u2']=x['u']; x['u']=f"https://www.vrbo.com/{l['id']}ha?chkin=2026-12-28&chkout=2027-01-05&startDate=2026-12-28&endDate=2027-01-05&adults=6"
        if src in('hometogo','holidu'): x['via']=l.get('provider')
        add(**x)

# Дублікати: агрегатори (HomeToGo, Holidu) показують оголошення інших платформ.
# 1) Пропозиції з платформ, які ми збираємо напряму, відкидаємо — вони вже є з першоджерела.
DIRECT=re.compile(r'booking|airbnb|vrbo|fewo|homeaway|interhome',re.I)
# HousingAnywhere — середньострокова оренда кімнат/коливінгу, не підходить для 8 ночей
SKIP=re.compile(r'housinganywhere',re.I)
before=len(items)
items=[x for x in items if not (x['via'] and (DIRECT.search(x['via']) or SKIP.search(x['via'])))]
dropped_direct=before-len(items)
# 2) Однакова назва й ціна в межах 10% на різних платформах — лишаємо дешевшу пропозицію
def norm(s):
    s=unicodedata.normalize('NFKD',s or '').encode('ascii','ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+',' ',s).strip()
PRIO={'Airbnb':0,'Booking':0,'Vrbo':0,'Interhome':0,'HomeToGo':1,'Holidu':1}
items.sort(key=lambda x:(PRIO[x['s']],x['p']))
keep=[]; seen={}
for x in items:
    key=norm(x['n'])
    dup=next((y for y in seen.get(key,[]) if y['s']!=x['s'] and abs(y['p']-x['p'])<=0.1*max(y['p'],x['p'])),None) if len(key)>=8 else None
    if dup:
        dup.setdefault('also',[]).append(dict(s=x['s'],p=x['p'],u=x['u']))
        continue
    seen.setdefault(key,[]).append(x); keep.append(x)
items=sorted(keep,key=lambda x:x['p'])
# Стабільний id для вибору житла на сторінці: джерело + id оголошення з посилання
for x in items:
    m=re.search(r'/rooms/(\d+)|/hotel/([^?]+?)\.en-gb|/(\d+)ha\b|/d/(\d+)|[?&]id=([^&]+)|/(?:rental|offer)/([^/?]+)',x['u'])
    x['id']=x['s'].lower()+':'+(next((g for g in m.groups() if g),'') if m else '') or x['u']
ids=[x['id'] for x in items]
assert len(ids)==len(set(ids)), [i for i in ids if ids.count(i)>1][:5]
P=[x['p'] for x in items]
cnt={}
for x in items: cnt[x['s']]=cnt.get(x['s'],0)+1
meta=dict(date=DATE,n=len(items),src=cnt,min=P[0],median=round(st.median(P)),dropped_direct=dropped_direct,merged=before-dropped_direct-len(items))
with open('data/vienna.js','w') as f:
    f.write('// Згенеровано scripts/vienna.py — усі варіанти житла у Відні\n')
    f.write('window.VIENNA = '+json.dumps(dict(meta=meta,items=items),ensure_ascii=False,separators=(',',':'))+';\n')
print(meta,file=sys.stderr)
