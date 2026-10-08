import json,sys,subprocess,time,uuid,urllib.parse,collections
# python3 -I scripts/holidu.py [out.json]
# Holidu: пошук через api.holidu.com/rest/v6/search/offers (по 30 на сторінку).
# Перша відповідь дає лише орієнтовні ціни (isExact=false, часто дуже неточні);
# точні ціни й доступність приходять асинхронно через /rest/v6/messaging/messages
# (як у фронтенді: subscriberId + topicId на кожну сторінку, чекаємо DONE_BATCH).
# Вже перевірені оферти Holidu кешує: тоді вони одразу приходять з isExact=true, а недоступні випадають.
OUT=sys.argv[1] if len(sys.argv)>1 else 'data/raw/vienna_holidu.json'
CI,CO,AD='2026-12-28','2027-01-05',6
TERM='Vienna, Vienna State, Austria'
API='https://api.holidu.com'
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
SUB=str(uuid.uuid4())
def get(path,**q):
    url=API+path+('?'+urllib.parse.urlencode(q) if q else '')
    for _ in range(3):
        r=subprocess.run(["curl","-s","--max-time","40","-A",UA,"-H","Accept: application/json",url],capture_output=True,text=True).stdout
        try: return json.loads(r)
        except Exception: time.sleep(2)
    return None
def page(i,tries=3,**extra):
    # Одна сторінка: пошук із новим subscriberId/topicId, далі опитуємо повідомлення до DONE_BATCH
    # (+ кілька секунд тиші). Якщо точних цін замало — повторюємо.
    best=({},{})
    for t in range(tries):
        sub,tid=str(uuid.uuid4()),str(uuid.uuid4())
        d=get('/rest/v6/search/offers',topicId=tid,subscriberId=sub,checkin=CI,checkout=CO,searchTerm=TERM,adults=AD,
              asyncSubscriptions='true',searchMultiUnits='true',domainId=2,locale='en-US',currency='EUR',pageIndex=i,pageSize=30,**extra) or {}
        upd={}; done=None; t0=time.time()
        while time.time()-t0<60 and not (done and time.time()-done>3):
            time.sleep(1.2)
            for m in get('/rest/v6/messaging/messages',subscriberId=sub) or []:
                meta=m.get('meta') or {}
                if meta.get('topicId')!=tid: continue
                if meta.get('type') in('OFFER_UPDATE_BATCH','OFFER_ADD_BATCH'):
                    for o in m.get('body') or []: upd[o['id']]=o
                elif meta.get('type')=='DONE_BATCH': done=done or time.time()
        # Оферти, що вже мають точну ціну (кеш Holidu) або явно недоступні, теж рахуються
        for o in d.get('offers') or []:
            if ((o.get('price') or {}).get('isExact') or o.get('isAvailable') is False) and o['id'] not in upd: upd[o['id']]=o
        n=len(d.get('offers') or [])
        if len(upd)>len(best[1]): best=(d,upd)
        if len(upd)>=0.8*n: break
        print(' page',i,'try',t,'offers',n,'updates',len(upd),file=sys.stderr)
    return best
def usp(o,k):
    for u in o.get('usps') or []:
        if u.get('id')==k: return u
def conv(v,unit):
    if v is None: return None
    return round(v*1.609344,1) if unit=='UNIT_MI' else round(v*0.092903) if unit=='UNIT_SF' else v
def row(o):
    de=o.get('details') or {}; lo=o.get('location') or {}; pr=o.get('price') or {}; rt=o.get('rating') or {}
    beds=None
    sa=(de.get('sleepingArrangements') or {}).get('rooms')
    if sa: beds=sum(a.get('count') or 1 for r in sa for a in r.get('amenities') or [] if a.get('group')=='BED')
    br=de.get('bedroomsCount'); u=usp(o,'USP_BATH_ROOM'); bath=u and u.get('value')
    ar=de.get('area') or {}; m2=conv(ar.get('value'),ar.get('unit'))
    # Деякі партнери (Booking.com) віддають м² з одиницею UNIT_SF — тоді «ft²» неправдоподібно мале
    if m2 and m2<20 and (de.get('guestsCount') or 0)>=4: m2=ar.get('value')
    info=' · '.join(x for x in [
        ('studio' if br==0 else f"{br} bedroom{'s'*(br!=1)}") if br is not None else '',
        f"{beds} bed{'s'*(beds!=1)}" if beds else '', f"{bath} bath" if bath else '', f"{m2} m²" if m2 else '',
        f"до {de.get('guestsCount')} гостей" if de.get('guestsCount') else ''] if x)
    dist=lo.get('distanceToSearchRegionCenter') or {}
    district=(lo.get('name') or '').split(',')[0].replace(' (Wien)','')
    if district=='Vienna': district=''
    rv=rt.get('value') if rt.get('count') else None
    ph=(o.get('photos') or [{}])[0]
    pv=o.get('provider') or {}
    return dict(id=o['id'],name=de.get('name'),kind=' · '.join(x for x in [(de.get('apartmentType') or '').replace('_',' ').capitalize(),district] if x),
        price=pr.get('total'),taxnote='точна ціна Holidu за 8 ночей з обов. зборами; тур. збір може бути окремо',
        rating=f"{rv/10:.1f}" if rv else None,r10=round(rv/10,1) if rv else None,reviews=rt.get('count') or 0,
        lat=lo.get('lat'),lng=lo.get('lng'),dist=None if lo.get('lat') else conv(dist.get('value'),dist.get('unit')),
        bedrooms=br,beds=beds,guests=de.get('guestsCount'),info=info,
        url=f"https://www.holidu.com/d/{o['id']}?checkin={CI}&checkout={CO}&adults={AD}&currency=EUR",
        img=ph.get('l') or ph.get('m'),provider=pv.get('shortName') or 'Holidu',providerId=pv.get('id'))
est={}; seen={}; unavail=set()
total=None; i=0
while total is None or i*30<total:
    d,upd=page(i)
    if total is None: total=(d.get('metaData') or {}).get('cursor',{}).get('totalCount',0); print('total',total,file=sys.stderr)
    for o in d.get('offers') or []: est[o['id']]=o
    for k,o in upd.items():
        if o.get('isAvailable') and (o.get('price') or {}).get('isExact'): seen[k]=o; unavail.discard(k)
        elif k not in seen: unavail.add(k)
    print('page',i,len(d.get('offers') or []),'updates',len(upd),'kept',len(seen),file=sys.stderr)
    i+=1
# Повний список id беремо з пошуку без підписки (там лише орієнтовні ціни, але без фільтра доступності):
# з підпискою сторінки зсуваються, і частина доступних житл не потрапляє в жодну сторінку.
for i in range(-(-total//30)+1):
    for o in get('/rest/v6/search/offers',checkin=CI,checkout=CO,searchTerm=TERM,adults=AD,searchMultiUnits='true',domainId=2,
                 locale='en-US',currency='EUR',pageIndex=i,pageSize=30).get('offers') or []: est.setdefault(o['id'],o)
# Добираємо пропущені id: includeOfferIds примусово додає їх у видачу й запускає перевірку цін
for rnd in range(2):
    miss=sorted(set(est)-set(seen)-unavail)
    print('recheck round',rnd,len(miss),file=sys.stderr)
    for c in range(0,len(miss),20):
        ch=miss[c:c+20]
        _,upd=page(0,tries=1,includeOfferIds=','.join(ch))
        for k in ch:
            o=upd.get(k)
            if not o: continue
            if o.get('isAvailable') and (o.get('price') or {}).get('isExact'): seen[k]=o
            else: unavail.add(k)
    print(' kept',len(seen),'unavailable',len(unavail),file=sys.stderr)
# Лише житло на 6+ гостей з ціною; готелі (apartmentType=HOTEL) відкидаємо — потрібне ціле житло
hotels=[o for o in seen.values() if (o.get('details') or {}).get('apartmentType')=='HOTEL']
res=[row(o) for o in seen.values() if (o.get('details') or {}).get('guestsCount',0)>=AD and (o.get('price') or {}).get('total') and o not in hotels]
print('hotels dropped',len(hotels),file=sys.stderr)
noex=set(est)-set(seen)-unavail
print('ids',len(est|seen),'exact+avail',len(seen),'unavailable',len(unavail),'no exact price',len(noex),'kept',len(res),file=sys.stderr)
res.sort(key=lambda x:x['price'])
json.dump(res,open(OUT,'w'),ensure_ascii=False,indent=1)
P=sorted(x['price'] for x in res)
if P: print('price',P[0],P[len(P)//2],P[-1],file=sys.stderr)
print(collections.Counter(x['provider'] for x in res).most_common(),file=sys.stderr)
