rf(){ curl -s -A "Mozilla/5.0" "https://www.ryanair.com/api/farfnd/v4/oneWayFares?departureAirportIataCode=$1&arrivalAirportIataCode=$2&outboundDepartureDateFrom=$3&outboundDepartureDateTo=$4&currency=EUR" | python3 -c "
import json,sys
d=json.load(sys.stdin)
for f in d.get('fares',[]): o=f['outbound']; print('  ',o['departureDate'][:16],'->',o['arrivalDate'][11:16],o['price']['value'])
" 2>/dev/null; }
for r in "NAP KRK" "NAP KTW" "NAP WRO" "NAP WMI" "BGY KRK" "CIA KRK" "STN RZE"; do set -- $r; echo "$1-$2 (4-6.01)"; rf $1 $2 2027-01-04 2027-01-06; done
fx(){ curl -s "https://global.api.flixbus.com/search/service/v4/search?from_city_id=$1&to_city_id=$2&departure_date=$3&products=%7B%22adult%22%3A1%7D&currency=EUR&locale=en&search_by=cities&include_after_midnight_rides=1" | python3 -c "
import json,sys
d=json.load(sys.stdin); out=[]
for tr in d.get('trips',[]):
  for k,r in tr.get('results',{}).items():
    if r.get('status')!='available': continue
    dur=r.get('duration',{}); out.append((r.get('price',{}).get('total'),r['departure']['date'][:16],r['arrival']['date'][:16],f\"{dur.get('hours')}h{dur.get('minutes')}\",len(r.get('legs',[]))-1))
for o in sorted(out)[:2]: print('  ',o)
" 2>/dev/null; }
K=183cda51-3912-4707-95af-05238cd58ab8
for p in "Paris 40de8964-8646-11e6-9066-549f350fcb0c" "Strasbourg 40d90f52-8646-11e6-9066-549f350fcb0c" "Naples 40e096c1-8646-11e6-9066-549f350fcb0c"; do set -- $p; echo "Kyiv->$1 27.12"; fx $K $2 27.12.2026; done
for p in "Wroclaw 40de575f-8646-11e6-9066-549f350fcb0c" "Prague 40de1ad1-8646-11e6-9066-549f350fcb0c" "Brno 40e2c245-8646-11e6-9066-549f350fcb0c" "Berlin 40d8f682-8646-11e6-9066-549f350fcb0c" "Budapest 40de6527-8646-11e6-9066-549f350fcb0c" "Vienna 40de1f31-8646-11e6-9066-549f350fcb0c" "Krakow 40de7eb5-8646-11e6-9066-549f350fcb0c" "Paris 40de8964-8646-11e6-9066-549f350fcb0c" "Strasbourg 40d90f52-8646-11e6-9066-549f350fcb0c"; do set -- $p; echo "$1->Kyiv 05.01"; fx $2 $K 05.01.2027; done
P=40de8964-8646-11e6-9066-549f350fcb0c; S=40d90f52-8646-11e6-9066-549f350fcb0c
echo "Paris->Strasbourg 28.12"; fx $P $S 28.12.2026
echo "Strasbourg->Paris 05.01"; fx $S $P 05.01.2027
