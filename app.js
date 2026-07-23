/* ============================================================
   Lhůtovník – app.js
   Funkce: výpočet lhůty + posun přes víkendy + české státní svátky
   ============================================================ */

'use strict';

// ─────────────────────────────────────────────
// ČESKÉ STÁTNÍ SVÁTKY
// Pevné svátky (MM-DD) + Velikonoce počítáme dynamicky
// ─────────────────────────────────────────────

/** Vrátí datum Velkého pátku pro daný rok (den před Bílou sobotou) */
function getGoodFriday(year) {
  const easter = getEasterSunday(year);
  const gf = new Date(easter);
  gf.setDate(gf.getDate() - 2);
  return gf;
}

/** Vrátí datum Velikonočního pondělí pro daný rok */
function getEasterMonday(year) {
  const easter = getEasterSunday(year);
  const em = new Date(easter);
  em.setDate(em.getDate() + 1);
  return em;
}

/**
 * Anonymní Graegorianský algoritmus pro výpočet Velikonoční neděle
 * Zdroj: algoritmus de Lilius / Clavius
 */
function getEasterSunday(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=březen, 4=duben
  const day   = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

/** Vrátí Set řetězců 'YYYY-MM-DD' pro všechny české státní svátky v daném roce */
function getCzechHolidays(year) {
  const fixed = [
    `${year}-01-01`, // Nový rok
    `${year}-05-01`, // Svátek práce
    `${year}-05-08`, // Den vítězství
    `${year}-07-05`, // Cyril a Metoděj
    `${year}-07-06`, // Jan Hus
    `${year}-09-28`, // Den české státnosti
    `${year}-10-28`, // Den vzniku Československa
    `${year}-11-17`, // Den boje za svobodu
    `${year}-12-24`, // Štědrý den
    `${year}-12-25`, // 1. svátek vánoční
    `${year}-12-26`, // 2. svátek vánoční
  ];

  const gf = getGoodFriday(year);
  const em = getEasterMonday(year);

  fixed.push(formatDateISO(gf));
  fixed.push(formatDateISO(em));

  return new Set(fixed);
}

// ─────────────────────────────────────────────
// POMOCNÉ FUNKCE
// ─────────────────────────────────────────────

/** Formátuje Date na 'YYYY-MM-DD' */
function formatDateISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Formátuje Date na čitelný český formát: 'D. M. YYYY' */
function formatDateCZ(date) {
  return date.toLocaleDateString('cs-CZ', {
    day:   'numeric',
    month: 'numeric',
    year:  'numeric',
  });
}

/** Vrátí název dne v týdnu česky */
function getDayNameCZ(date) {
  return date.toLocaleDateString('cs-CZ', { weekday: 'long' });
}

/**
 * Posune datum na nejbližší pracovní den (přeskočí víkendy i svátky).
 * Vrátí objekt { date, shifted, reason }
 */
function shiftToWorkday(date) {
  let current = new Date(date);
  let shifted  = false;
  const reasons = [];

  // Shromáždíme svátky pro příslušný rok (a možná i rok+1 kvůli přelomu roku)
  const holidays = new Set([
    ...getCzechHolidays(current.getFullYear()),
    ...getCzechHolidays(current.getFullYear() + 1),
  ]);

  // Opakujeme dokud nenarazíme na pracovní den
  while (true) {
    const dow = current.getDay(); // 0=ne, 6=so
    const iso = formatDateISO(current);

    if (dow === 6) {
      // Sobota → přesunout na pondělí (+2)
      current.setDate(current.getDate() + 2);
      shifted = true;
      reasons.push('Původní datum padlo na sobotu → posunuto na pondělí.');
      continue;
    }

    if (dow === 0) {
      // Neděle → přesunout na pondělí (+1)
      current.setDate(current.getDate() + 1);
      shifted = true;
      reasons.push('Původní datum padlo na neděli → posunuto na pondělí.');
      continue;
    }

    if (holidays.has(iso)) {
      // Státní svátek → +1 den
      current.setDate(current.getDate() + 1);
      shifted = true;
      reasons.push(`Datum padlo na státní svátek (${formatDateCZ(new Date(iso))}) → posunuto o 1 den dále.`);
      continue;
    }

    // Je to pracovní den, jsme hotovi
    break;
  }

  return { date: current, shifted, reason: reasons.join(' ') };
}

// ─────────────────────────────────────────────
// DOM REFERENCE
// ─────────────────────────────────────────────

const startDateInput   = document.getElementById('startDate');
const durationSelect   = document.getElementById('durationSelect');
const durationCustom   = document.getElementById('durationCustom');
const btnCalculate     = document.getElementById('btnCalculate');
const btnReset         = document.getElementById('btnReset');

const resultCard       = document.getElementById('resultCard');
const resultIcon       = document.getElementById('resultIcon');
const resultDate       = document.getElementById('resultDate');
const resultLabel      = document.getElementById('resultLabel');
const resultDetail     = document.getElementById('resultDetail');
const resultInfoBox    = document.getElementById('resultInfoBox');

// Nastav výchozí datum na dnešek
startDateInput.valueAsDate = new Date();

// ─────────────────────────────────────────────
// EVENT LISTENERS
// ─────────────────────────────────────────────

// Zobrazit/skrýt ruční zadání počtu dní
durationSelect.addEventListener('change', () => {
  if (durationSelect.value === 'custom') {
    durationCustom.classList.remove('hidden');
    durationCustom.focus();
  } else {
    durationCustom.classList.add('hidden');
    durationCustom.value = '';
  }
  removeError();
});

btnCalculate.addEventListener('click', calculate);
btnReset.addEventListener('click', resetForm);

// ─────────────────────────────────────────────
// VÝPOČET
// ─────────────────────────────────────────────

function calculate() {
  removeError();

  // --- Validace vstupů ---
  const startValue = startDateInput.value;
  if (!startValue) {
    showError('Zadej prosím datum doručení dokumentu.');
    return;
  }

  let days = 0;
  if (durationSelect.value === 'custom') {
    days = parseInt(durationCustom.value, 10);
    if (!days || days < 1 || days > 365) {
      showError('Zadej platný počet dní (1–365).');
      return;
    }
  } else if (durationSelect.value) {
    days = parseInt(durationSelect.value, 10);
  } else {
    showError('Vyber nebo zadej délku lhůty.');
    return;
  }

  // --- Výpočet ---
  // Parsujeme datum bez timezone posunu
  const [y, mo, d] = startValue.split('-').map(Number);
  const startDate = new Date(y, mo - 1, d);

  // Přičteme dny
  const rawEnd = new Date(startDate);
  rawEnd.setDate(rawEnd.getDate() + days);

  // Posun přes víkendy / svátky
  const { date: finalDate, shifted, reason } = shiftToWorkday(rawEnd);

  // --- Zobrazení výsledku ---
  const dayName = getDayNameCZ(finalDate);
  resultDate.textContent  = formatDateCZ(finalDate);
  resultLabel.textContent = `${dayName} · Konec lhůty`;

  resultDetail.textContent =
    `Počáteční datum: ${formatDateCZ(startDate)} · Délka lhůty: ${days} dní`;

  if (shifted) {
    resultInfoBox.textContent = `⚠️ ${reason}`;
    resultCard.classList.add('warning');
    resultCard.classList.remove('hidden');
    resultIcon.textContent = '⚠️';
  } else {
    resultInfoBox.textContent = '✅ Lhůta padá na pracovní den.';
    resultCard.classList.remove('warning');
    resultCard.classList.remove('hidden');
    resultIcon.textContent = '✅';
  }

  // Scrollneme na výsledek
  resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─────────────────────────────────────────────
// RESET
// ─────────────────────────────────────────────

function resetForm() {
  startDateInput.valueAsDate = new Date();
  durationSelect.value = '';
  durationCustom.value = '';
  durationCustom.classList.add('hidden');
  resultCard.classList.add('hidden');
  removeError();
  startDateInput.focus();
}

// ─────────────────────────────────────────────
// CHYBOVÉ HLÁŠKY
// ─────────────────────────────────────────────

function showError(msg) {
  removeError();
  const el = document.createElement('p');
  el.className = 'error-msg';
  el.id = 'errorMsg';
  el.textContent = msg;
  btnCalculate.insertAdjacentElement('afterend', el);
}

function removeError() {
  const el = document.getElementById('errorMsg');
  if (el) el.remove();
}
