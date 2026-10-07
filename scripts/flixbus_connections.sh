fx(){ curl -s "https://global.api.flixbus.com/search/service/v4/search?from_city_id=$1&to_city_id=$2&departure_date=$3&products=%7B%22adult%22%3A1%7D&currency=EUR&locale=en&search_by=cities&include_after_midnight_rides=1" | python3 -c "
import json,sys
d=json.load(sys.stdin); out=[]
for tr in d.get('trips',[]):
  for k,r in tr.get('results',{}).items():
    if r.get('status')!='available': continue
    dur=r.get('duration',{}); out.append((r['departure']['date'][:16],r['arrival']['date'][:16],f\"{dur.get('hours')}h{dur.get('minutes')}\",r.get('price',{}).get('total'),len(r.get('legs',[]))-1))
for o in sorted(out): print('  ',o)
" 2>/dev/null; }
cid(){ curl -s "https://global.api.flixbus.com/search/autocomplete/cities?q=$1&lang=en" | python3 -c "import json,sys;print(json.load(sys.stdin)[0]['id'])"; }
K=183cda51-3912-4707-95af-05238cd58ab8; KRK=40de7eb5-8646-11e6-9066-549f350fcb0c; WRO=40de575f-8646-11e6-9066-549f350fcb0c
KTW=$(cid Katowice); WAW=$(cid Warsaw); RZE=$(cid Rzeszow); STR=40d90f52-8646-11e6-9066-549f350fcb0c
echo "Kyiv->Katowice 27.12"; fx $K $KTW 27.12.2026
echo "Kyiv->Warsaw 27.12"; fx $K $WAW 27.12.2026
echo "Kyiv->Krakow 26.12"; fx $K $KRK 26.12.2026
echo "Kyiv->Rzeszow 27.12"; fx $K $RZE 27.12.2026
echo "Kyiv->Wroclaw 27.12 all"; fx $K $WRO 27.12.2026
echo "Krakow->Kyiv 06.01"; fx $KRK $K 06.01.2027
echo "Katowice->Kyiv 05.01"; fx $KTW $K 05.01.2027
echo "Wroclaw->Kyiv 06.01"; fx $WRO $K 06.01.2027
echo "Strasbourg->Kyiv 05.01"; fx $STR $K 05.01.2027
