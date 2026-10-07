rf(){ curl -s -A "Mozilla/5.0" "https://www.ryanair.com/api/farfnd/v4/oneWayFares?departureAirportIataCode=$1&arrivalAirportIataCode=$2&outboundDepartureDateFrom=$3&outboundDepartureDateTo=$4&currency=EUR" | python3 -c "
import json,sys
d=json.load(sys.stdin)
for f in d.get('fares',[]): o=f['outbound']; print('  ',o['departureDate'][:16],'->',o['arrivalDate'][11:16],o['price']['value'])
" 2>/dev/null; }
echo "### OUT 27-28.12"; for r in "KRK NAP" "KTW NAP" "WMI NAP" "WRO NAP" "RZE NAP" "KRK BVA" "KTW BVA" "WRO BVA" "WMI BVA" "RZE BVA" "KRK BSL" "KRK FKB" "KTW FKB" "KRK HHN" "WMI FKB" "KRK CIA" "KRK BGY" "RZE STN"; do set -- $r; echo "$1-$2"; rf $1 $2 2026-12-27 2026-12-28; done
echo "### BACK 05.01"; for r in "NAP KRK" "NAP KTW" "NAP WMI" "NAP WRO" "NAP RZE" "BVA KRK" "BVA KTW" "BVA WRO" "BVA WMI" "BVA RZE" "BSL KRK" "FKB KRK" "FKB KTW" "FKB WMI"; do set -- $r; echo "$1-$2"; rf $1 $2 2027-01-05 2027-01-05; done
