import json,re,math,statistics as st,sys
a=json.load(open('data/raw/airbnb.json')); b=json.load(open('data/raw/booking.json'))
C={'paris':(48.8566,2.3522),'vienna':(48.2082,16.3738),'prague':(50.0875,14.4213),'brno':(49.1951,16.6068),'berlin':(52.52,13.405),'budapest':(47.4979,19.0402),'naples':(40.8518,14.2681),'strasbourg':(48.5734,7.7521)}
def km(p,q):
    R=6371;la1,lo1,la2,lo2=map(math.radians,(*p,*q))
    return 2*R*math.asin(math.sqrt(math.sin((la2-la1)/2)**2+math.cos(la1)*math.cos(la2)*math.sin((lo2-lo1)/2)**2))
def places(txt):
    n=0
    for cnt,kind in re.findall(r'(\d+)\s+(?:extra-large |large |)(single|double|sofa|bunk|futon|queen|king)',txt):
        n+=int(cnt)*(1 if kind in('single','futon') else 2)
    return n
out={}
for city in C:
    allp=[]; ab=[]; bk=[]
    for l in a[city]:
        if not l['total'] or l['lat'] is None: continue
        d=km(C[city],(l['lat'],l['lng']))
        if d>9: continue
        info=list(dict.fromkeys(l['beds']))
        br=next((int(re.match(r'(\d+)',x).group(1)) for x in info if 'bedroom' in x),0)
        bedsn=next((int(re.match(r'(\d+)',x).group(1)) for x in info if re.match(r'\d+ (\w+ )?beds?$',x)),0)
        if br<2: continue
        allp.append(l['total'])
        m=re.match(r'([\d.]+) \((\d+)\)',l['rating'] or '')
        r,n=(float(m.group(1)),int(m.group(2))) if m else (None,0)
        if r and r>=4.6 and n>=5 and bedsn>=3:
            ab.append(dict(src='Airbnb',name=l['name'],kind=l['title'],price=l['total'],taxnote='без туристичного збору',rating=f"{r:.2f}",reviews=n,dist=round(d,1),info=' · '.join(info),url=l['url'],img=l['pic']))
    for c in b[city]['cards']:
        name,url,dist,score,unit,price,tax,img=c
        if not price: continue
        m=re.search(r'(\d+) bedroom',unit); br=int(m.group(1)) if m else 0
        dm=re.match(r'([\d.]+)\s*(km|m)',dist or ''); d=float(dm.group(1))/(1000 if dm and dm.group(2)=='m' else 1) if dm else 99
        if br<2 or d>9: continue
        tot=price+tax; allp.append(tot)
        sm=re.match(r'Scored ([\d.]+)\|.*\|([\d,]+) reviews?',score or '')
        r,n=(float(sm.group(1)),int(sm.group(2).replace(',',''))) if sm else (None,0)
        if r and r>=7.0 and n>=5 and places(unit)>=6:
            bk.append(dict(src='Booking',name=name,kind='',price=tot,taxnote='з податками',rating=f"{r:.1f}",reviews=n,dist=round(d,1),info=unit.replace('Recommended for your group | ','').split(' | Free cancellation')[0].split(' | No prepayment')[0],url='https://www.booking.com/hotel/'+url+'?checkin=2026-12-28&checkout=2027-01-05&group_adults=6&no_rooms=1&selected_currency=EUR',img=img))
    allp.sort(); t=allp[len(allp)//10: len(allp)-len(allp)//10]
    ab.sort(key=lambda x:x['price']); bk.sort(key=lambda x:x['price'])
    out[city]=dict(n=len(allp),mean=round(st.mean(t)),median=round(st.median(allp)),min=allp[0],airbnb=ab[:2],booking=bk[:2])
    print(city,out[city]['n'],out[city]['mean'],out[city]['median'],[ (x['price'],x['rating'],x['dist'],x['name'][:30]) for x in ab[:2]+bk[:2]],file=sys.stderr)
json.dump(out,open('data/raw/selected.json','w'),ensure_ascii=False,indent=1)
