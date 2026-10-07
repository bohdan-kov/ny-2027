# FlixBus-стикування для рейсів Wizz Air (Варшава, Ясси, Кишинів)
fx(){ curl -s "https://global.api.flixbus.com/search/service/v4/search?from_city_id=$1&to_city_id=$2&departure_date=$3&products=%7B%22adult%22%3A1%7D&currency=EUR&locale=en&search_by=cities&include_after_midnight_rides=1" | python3 -c "
import json,sys
d=json.load(sys.stdin); out=[]
for tr in d.get('trips',[]):
  for k,r in tr.get('results',{}).items():
    if r.get('status')!='available': continue
    dur=r.get('duration',{}); out.append((r['departure']['date'][:16],r['arrival']['date'][:16],f\"{dur.get('hours')}h{dur.get('minutes')}\",r.get('price',{}).get('total'),len(r.get('legs',[]))-1))
for o in sorted(out): print('  ',o)
" 2>/dev/null; }
cid(){ curl -s "https://global.api.flixbus.com/search/autocomplete/cities?q=$1&lang=en" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d[0]['id'] if d else '')"; }
K=183cda51-3912-4707-95af-05238cd58ab8; WAW=$(cid Warsaw); IAS=$(cid Iasi); KIV=$(cid Chisinau)
echo "Kyiv->Warsaw 27.12"; fx $K $WAW 27.12.2026
echo "Warsaw->Kyiv 05.01"; fx $WAW $K 05.01.2027
echo "Kyiv->Iasi 26.12 ($IAS)"; fx $K $IAS 26.12.2026
echo "Kyiv->Chisinau 27.12 ($KIV)"; fx $K $KIV 27.12.2026
