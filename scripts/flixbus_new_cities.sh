# FlixBus Київ ↔ Зальцбург, Любляна, Загреб, Таллінн, Рига, Мюнхен
fx(){ curl -s "https://global.api.flixbus.com/search/service/v4/search?from_city_id=$1&to_city_id=$2&departure_date=$3&products=%7B%22adult%22%3A1%7D&currency=EUR&locale=en&search_by=cities&include_after_midnight_rides=1" | python3 -c "
import json,sys
d=json.load(sys.stdin); out=[]
for tr in d.get('trips',[]):
  for k,r in tr.get('results',{}).items():
    if r.get('status')!='available': continue
    dur=r.get('duration',{}); out.append((r.get('price',{}).get('total'),r['departure']['date'][:16],r['arrival']['date'][:16],f\"{dur.get('hours')}h{dur.get('minutes')}\",len(r.get('legs',[]))-1))
for o in sorted(out)[:4]: print('  ',o)
" 2>/dev/null; }
cid(){ curl -s "https://global.api.flixbus.com/search/autocomplete/cities?q=$1&lang=en" | python3 -c "import json,sys;d=json.load(sys.stdin);print(d[0]['id'] if d else '')"; }
K=183cda51-3912-4707-95af-05238cd58ab8
for c in Salzburg Ljubljana Zagreb Tallinn Riga Munich; do
  id=$(cid $c); echo "== $c"
  for dt in 26.12.2026 27.12.2026; do echo " Kyiv->$c $dt"; fx $K $id $dt; done
  echo " $c->Kyiv 05.01"; fx $id $K 05.01.2027
done
