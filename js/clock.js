const digitEls = [0, 1, 2, 3].map(i => document.getElementById('d' + i));
const dotAm    = document.getElementById('dot-am');
const dotPm    = document.getElementById('dot-pm');

function setDigit(wrap, ch) {
  const cur = wrap.querySelector('span');
  if (cur && cur.textContent === ch) return;
  const nxt = document.createElement('span');
  nxt.textContent = ch;
  nxt.style.animation = 'd-in 0.38s cubic-bezier(0,0.55,0.45,1) forwards';
  wrap.appendChild(nxt);
  if (cur) {
    cur.style.animation = 'd-out 0.38s cubic-bezier(0,0.55,0.45,1) forwards';
    setTimeout(() => cur.remove(), 420);
  }
}

function updateClock() {
  const now  = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const h = now.getHours(), m = now.getMinutes();
  const isAm = h < 12, h12 = h % 12 || 12;
  const str = String(h12).padStart(2, '0') + String(m).padStart(2, '0');
  str.split('').forEach((ch, i) => setDigit(digitEls[i], ch));
  dotAm.classList.toggle('active', isAm);
  dotPm.classList.toggle('active', !isAm);
}

export function init() {
  updateClock();
  setInterval(updateClock, 1000);
}
