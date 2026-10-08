import re,json,sys,html,subprocess,time
# python3 -I scripts/booking.py data/raw/booking.json [місто …]
# Ціле житло (privacy_type=3), оцінка від 6 (review_score=60), сортування за ціною, перші PAGES сторінок по 25 карток.
OUT=sys.argv[1]
CITIES={"paris":"Paris","vienna":"Vienna","prague":"Prague","brno":"Brno","berlin":"Berlin","budapest":"Budapest","naples":"Naples","strasbourg":"Strasbourg","salzburg":"Salzburg","ljubljana":"Ljubljana","zagreb":"Zagreb","tallinn":"Tallinn","riga":"Riga","munich":"Munich"}
if len(sys.argv)>2: CITIES={k:v for k,v in CITIES.items() if k in sys.argv[2:]}
PAGES=3
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36"
def fetch(url):
    return subprocess.run(["curl","-sL","-A",UA,"-H","Accept-Language: en-GB",url],capture_output=True,text=True).stdout
def text(card,tid):
    # Текст елемента з data-testid до його закриваючого тегу (приблизно), частини через "|"
    m=re.search(r'<(\w+)[^>]*data-testid="'+tid+r'"',card)
    if not m: return ''
    tag=m.group(1); i=m.start(); depth=0
    for t in re.finditer(r'<(/?)'+tag+r'\b[^>]*?(/?)>',card[i:]):
        if t.group(2): continue
        depth+=-1 if t.group(1) else 1
        if depth==0: seg=card[i:i+t.end()]; break
    else: seg=card[i:i+3000]
    parts=[html.unescape(x).strip() for x in re.sub(r'<[^>]+>','\x00',seg).split('\x00')]
    return [x for x in parts if x]
def euro(s):
    m=re.search(r'€\s*([\d,]+)',s or ''); return int(m.group(1).replace(',','')) if m else None
res={}
try: res=json.load(open(OUT))
except Exception: pass
for key,q in CITIES.items():
    cards=[]; h1=''
    for p in range(PAGES):
        url=f"https://www.booking.com/searchresults.en-gb.html?ss={q}&checkin=2026-12-28&checkout=2027-01-05&group_adults=6&no_rooms=1&group_children=0&selected_currency=EUR&lang=en-gb&order=price&nflt=privacy_type%3D3%3Breview_score%3D60&offset={25*p}"
        h=fetch(url)
        h=re.sub(r'<svg.*?</svg>','',h,flags=re.S)
        if not h1:
            m=re.search(r'<h1[^>]*>([^<]*)',h); h1=html.unescape(m.group(1)) if m else ''
        chunks=h.split('data-testid="property-card"')[1:]
        if not chunks: print(key,'page',p,'empty',file=sys.stderr); break
        for c in chunks:
            c='<div data-testid="property-card"'+c
            m=re.search(r'data-testid="title-link"[^>]*href="https://www\.booking\.com/hotel/([^"?]+)',c) or re.search(r'href="https://www\.booking\.com/hotel/([^"?]+)',c)
            if not m: continue
            name=' '.join(text(c,'title')[:1])
            dist=' '.join(text(c,'distance')[:1])
            sc=text(c,'review-score')
            score='|'.join(sc) if sc else ''
            unit=' | '.join(x for x in [' '.join(text(c,'recommended-units')[:2]).replace('Recommended for your group ','Recommended for your group | ')] if x)
            cfg=' '.join(text(c,'property-card-unit-configuration'))
            rec=text(c,'recommended-units')
            # "Recommended for your group | <назва юніта> | Entire apartment • 3 bedrooms … | 4 beds (…)"
            head=[x for x in rec if x!='•'][:2] if rec and rec[0].startswith('Recommended') else [x for x in rec if x!='•'][:1]
            cfgp=[x for x in text(c,'property-card-unit-configuration') if x!='•']
            # Ліжка бувають і всередині unit-configuration, і окремим рядком після нього
            beds=[x for x in cfgp+(rec or []) if re.match(r'\d+ beds?\b',x)]
            conf=[x for x in cfgp if x not in beds and not re.match(r'\d+ beds?\b',x)]
            unit=' | '.join(head+[' • '.join(conf)]+beds[:1])
            price=euro(' '.join(text(c,'price-and-discounted-price')[:1]))
            tax=euro(' '.join(text(c,'taxes-and-charges'))) or 0
            im=re.search(r'<img[^>]*src="([^"]+)"[^>]*data-testid="image"',c) or re.search(r'<img[^>]*data-testid="image"[^>]*src="([^"]+)"',c)
            img=html.unescape(im.group(1)) if im else None
            cards.append([name,m.group(1),dist,score,unit,price,tax,img])
        if len(chunks)<25: break
        time.sleep(1)
    res[key]=dict(h1=h1,cards=cards)
    print(key,h1,len(cards),[c[5] for c in cards[:5]],file=sys.stderr)
    json.dump(res,open(OUT,'w'),ensure_ascii=False,indent=1)
