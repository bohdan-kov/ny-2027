# Новий рік 2027: вибір міста

Порівняння 14 міст для поїздки 6 людей з Києва на 28.12.2026–05.01.2027 (8 ночей): житло з Airbnb і Booking, середні ціни та найдешевші маршрути.

## Як відкрити

Онлайн: https://bohdan-kov.github.io/ny-2027/

Локально: відкрийте `index.html` у браузері подвійним кліком. Сервер не потрібен.

## Деплой

Сайт публікується через GitHub Pages з гілки `main` (корінь репозиторію). Після `git push` оновлення з'являється за 1–2 хвилини. Файл `.nojekyll` вимикає обробку Jekyll.

## Оцінка поїздки

Оцінка поїздки = 60% NY Experience + 20% логістика + 20% ціна.

- **NY Experience (100):** святкування 31.12 (25), атмосфера (20), nightlife (15), унікальність (10), що робити 8 днів (10), офіційні події (10), погода (5), комфорт (5). Бали й факти з джерелами лежать у `data/ny-experience.js` (`scores_research` — початкові оцінки дослідження, `scores` — після коригування компанією).
- **Логістика (100):** час у дорозі (50), пересадки (20), ризик стикувань (15), нічні переїзди (10), прибуття в місто (5). Метрики записані в полі `logi` у `data/transport.js`, формули в `app.js`.
- **Ціна (100):** 100 × найнижча ціна на людину / ціна міста.

## Структура

```
index.html          сторінка
styles.css          стилі (світла й темна тема)
app.js              рейтинг, картки міст, маршрути
vienna.html         усі варіанти житла у Відні з фільтрами (vienna-app.js)
                    кнопка «Обрати це житло» зберігає вибір у браузері (localStorage `ny27-choice`),
                    головна рахує Відень за обраним житлом замість найдешевшого
data/vienna.js      дані для vienna.html
data/stays.js       вибране житло (по 2 з Airbnb і Booking) + середні ціни
data/stays.json     те саме в JSON
trip.html           обрана поїздка: Відень, житло Vrbo 5738837, потяг; повний підрахунок (trip-app.js)
data/trip.js        дані обраної поїздки; фото квартири в img/trip/
data/trains.js      потяг як альтернатива автобусу (зараз лише Відень), перемикач у розділі міста
currency.js         валюта показу (EUR/UAH/USD/PLN, курс НБУ), дані завжди в євро
data/transport.js   маршрути з Києва: рейси, час, ціни, метрики логістики
data/ny-experience.js  оцінки NY Experience, події 31.12, ярмарки, погода, джерела
data/raw/           сирі результати пошуку Airbnb і Booking
img/                фото житла
img/cities/         новорічні фото міст (Wikimedia Commons)
data/city-photos.js автори й ліцензії фото міст
scripts/            скрипти збору даних
```

## Оновлення цін

1. Airbnb: `python3 scripts/airbnb.py data/raw/airbnb.json` (≈10 хв).
2. Booking збирався через Playwright, результат у `data/raw/booking.json`.
3. Усі варіанти у Відні (`vienna.html`), сирі дані в `data/raw/vienna_*.json`:
   - Airbnb: `python3 -I scripts/airbnb.py data/raw/vienna_airbnb.json vienna --all` (по цінових діапазонах).
   - Booking: повна видача з фільтром «6+», прокручена в Playwright, розбір `scripts/booking.py` → `data/raw/vienna_booking.json`.
   - Vrbo / FeWo-direkt (спільний каталог): видача fewo-direkt.de по сторінках у Playwright → `python3 -I scripts/fewo.py <картки.json> data/raw/vienna_fewo.json`.
   - HomeToGo: `python3 -I scripts/hometogo.py`; Holidu: `python3 -I scripts/holidu.py data/raw/vienna_holidu.json`; Interhome: `python3 -I scripts/interhome.py data/raw/vienna_interhome.json`.
   - willhaben: `python3 -I scripts/willhaben.py data/raw/vienna_willhaben.json` — лише для перевірки, на сторінку не йде.
   - Зведення й дедуплікація: `python3 -I scripts/vienna.py` → `data/vienna.js`.
4. Відбір і середні ціни: `python3 scripts/select.py`, результат у `data/raw/selected.json`.
5. Транспорт: `bash scripts/ryanair.sh`, `bash scripts/ryanair_new_cities.sh`, `bash scripts/flixbus_*.sh`. Ціни Wizz Air беруться з календаря цін на wizzair.com через браузер (Playwright), бо пошук рейсів закритий антибот-захистом. Знайдені рейси вручну внесіть у `data/transport.js`.

## Критерії відбору житла

- Ціле житло на 6 гостей, від 2 спалень, 6 спальних місць (двоспальне ліжко чи диван рахуються як 2), до 9 км від центру.
- Рейтинг: Booking від 6.0 (фільтр пошуку «6+»), Airbnb від 4.6, щонайменше 5 відгуків.
- Середня ціна рахується по всіх оголошеннях від 2 спалень, без 10% найдешевших і 10% найдорожчих.

Ціни зібрано 07.10.2026. На Airbnb не враховано туристичний податок. Ryanair вказано за базовим тарифом без валізи. Ціни на потяги УЗ орієнтовні («≈»).
