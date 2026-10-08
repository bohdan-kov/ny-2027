// Валюта відображення. Усі ціни в даних — у євро, тут лише перерахунок для показу.
// Курси НБУ на 09.10.2026 (bank.gov.ua): 1 € = 50.1385 ₴, 1 $ = 44.8526 ₴, 1 zł = 11.4567 ₴.
(() => {
  const UAH = { EUR: 50.1385, USD: 44.8526, PLN: 11.4567, UAH: 1 };
  const LIST = [['EUR', '€'], ['UAH', '₴'], ['USD', '$'], ['PLN', 'zł']];
  const SYM = Object.fromEntries(LIST);
  const KEY = 'ny27-cur';
  let code = 'EUR';
  try { const c = localStorage.getItem(KEY); if (SYM[c]) code = c; } catch (e) {}
  const subs = [];
  const conv = eur => eur * UAH.EUR / UAH[code];
  // dec — знаків після коми; для гривні завжди цілі
  const fmt = (eur, dec = 0) => {
    const d = code === 'UAH' ? 0 : dec, v = conv(eur);
    return v.toLocaleString('uk-UA', { minimumFractionDigits: d, maximumFractionDigits: d }).replace(/\s/g, ' ') + ' ' + SYM[code];
  };
  function set(c) {
    if (!SYM[c] || c === code) return;
    code = c;
    try { localStorage.setItem(KEY, c); } catch (e) {}
    document.querySelectorAll('.cur-switch button').forEach(b => b.setAttribute('aria-pressed', b.dataset.cur === code));
    subs.forEach(f => f());
  }
  // перемикач валют у контейнері el
  function mount(el) {
    el.innerHTML = LIST.map(([c, s]) => `<button type="button" data-cur="${c}" aria-pressed="${c === code}" title="${c}">${s} ${c}</button>`).join('');
    el.addEventListener('click', e => { const b = e.target.closest('button'); if (b) set(b.dataset.cur); });
  }
  window.CUR = {
    fmt, conv, set, mount, onChange: f => subs.push(f),
    get code() { return code; }, get sym() { return SYM[code]; },
    note: 'Курси НБУ на 09.10.2026: 1 € = 50.14 ₴, 1 $ = 44.85 ₴, 1 zł = 11.46 ₴'
  };
})();
