# Ryanair: польські аеропорти ↔ SZG, LJU, ZAG, TLL, RIX, MUC, FMM (Меммінген)
rf(){ curl -s -A "Mozilla/5.0" "https://www.ryanair.com/api/farfnd/v4/oneWayFares?departureAirportIataCode=$1&arrivalAirportIataCode=$2&outboundDepartureDateFrom=$3&outboundDepartureDateTo=$4&currency=EUR" | python3 -c "
import json,sys
d=json.load(sys.stdin)
for f in d.get('fares',[]): o=f['outbound']; print('  ',o['departureAirport']['iataCode']+'-'+o['arrivalAirport']['iataCode'],o['departureDate'][:16],'->',o['arrivalDate'][11:16],o['price']['value'])
" 2>/dev/null; }
for a in KRK KTW WAW WMI WRO RZE GDN POZ LUZ; do for b in SZG LJU ZAG TLL RIX MUC FMM; do
  rf $a $b 2026-12-26 2026-12-28; rf $b $a 2027-01-04 2027-01-06; sleep 0.3
done; done
