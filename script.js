/* Stackly Academy — shared behaviour. Vanilla JS: CSS transitions, IntersectionObserver and requestAnimationFrame only. */
'use strict';

/* ================= shared state (declared before anything uses it) ================= */
const REAL_PAGES = ['index.html', 'courses.html', 'course-detail.html', 'admissions.html', 'about.html', 'contact.html',
  'signin.html', 'signup.html', 'dashboard-student.html', 'dashboard-admin.html', '404.html', 'privacy-policy.html', 'terms-conditions.html'];
window.REAL_PAGES = REAL_PAGES;
const STATE = {
  reduce: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  finePointer: window.matchMedia('(pointer: fine)').matches,
  fxDone: new WeakSet(),
  sweepRaf: 0,
  splashTimer: 0,
  carouselIndex: 0,
  quoteIndex: 0,
  lightboxIndex: 0,
  lastFocus: null,
};
window.STATE = STATE;
const COMMON_PASSWORDS = ['password', 'password1', 'password123', 'password@123', 'passw0rd', 'passw0rd!', '12345678', '123456789', '1234567890',
  'qwerty123', 'qwertyuiop', 'iloveyou', 'admin123', 'admin@123', 'welcome1', 'welcome@123', 'abc12345', 'letmein1', 'india@123', 'stackly@123'];

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const inr = n => '₹' + Math.round(n).toLocaleString('en-IN');

/* ================= routing: every non-real link goes to 404.html ================= */
function sweepLinks() {
  $$('a[href]').forEach(a => {
    const href = a.getAttribute('href');
    const file = href.split('#')[0].split('?')[0];
    if (!REAL_PAGES.includes(file)) a.setAttribute('href', '404.html');
  });
}

/* ================= overlays: menu, splash, lightbox, modal, drawer ================= */
function clearOverlays() {
  clearTimeout(STATE.splashTimer);
  const splash = $('#splash'); if (splash) splash.hidden = true;
  closeMenu(); closeLightbox(true); closeModal(); closeDrawer();
  document.documentElement.style.overflow = '';
}
function closeMenu() {
  const m = $('#mmenu'), b = $('.hdr__burger');
  if (m) m.hidden = true;
  if (b) b.setAttribute('aria-expanded', 'false');
}
function initMenu() {
  const b = $('.hdr__burger'), m = $('#mmenu');
  if (!b || !m) return;
  b.addEventListener('click', () => {
    const open = m.hidden;
    m.hidden = !open; b.setAttribute('aria-expanded', String(open));
    if (open) m.querySelector('a').focus();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !m.hidden) { closeMenu(); b.focus(); } });
  window.addEventListener('resize', () => { if (window.innerWidth > 1100) closeMenu(); });
}
function initSplash() {
  $$('[data-splash]').forEach(a => a.addEventListener('click', e => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    const s = $('#splash'); if (!s) { location.href = 'index.html'; return; }
    s.hidden = false;
    STATE.splashTimer = setTimeout(() => { location.href = 'index.html'; }, STATE.reduce ? 200 : 1300);
  }));
}

/* ================= reveal ================= */
function initReveal() {
  const els = $$('.rv');
  if (STATE.reduce || !('IntersectionObserver' in window)) { els.forEach(el => el.classList.add('in')); return; }
  const vh = window.innerHeight;
  els.forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.top < vh && r.bottom > 0) { el.style.transition = 'none'; el.classList.add('in'); }
  });
  void document.body.offsetHeight;
  const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
  }), { rootMargin: '0px 0px -8% 0px' });
  els.forEach(el => { if (!el.classList.contains('in')) io.observe(el); });
  STATE.revealIO = io;
}
function revealSweep() {
  const vh = window.innerHeight;
  $$('.rv:not(.in)').forEach(el => { if (el.getBoundingClientRect().top < vh) el.classList.add('in'); });
}

/* ================= set-pieces (dispatched by data-fx) ================= */
const FX = {
  counter(el) {
    const to = parseFloat(el.dataset.to), dec = (el.dataset.to.split('.')[1] || '').length;
    const fmt = v => dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-IN');
    const out = el.querySelector('.cv') || el;
    if (STATE.reduce) { out.textContent = fmt(to); return; }
    const t0 = performance.now(), dur = 1400;
    const step = t => { const p = Math.min((t - t0) / dur, 1); out.textContent = fmt(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  },
  chart(el) {
    $$('.chart__row', el).forEach(row => {
      const v = +row.dataset.v, bar = $('.chart__bar', row);
      bar.style.width = v + '%';
      const val = $('.chart__val', row); val.innerHTML = v + '<span class="suf">%</span>';
    });
  },
  vchart(el) {
    const max = Math.max(...$$('[data-v]', el).map(d => +d.dataset.v));
    $$('[data-v]', el).forEach(d => {
      $('b', d).style.height = (d.dataset.v / max * 78) + '%';
      $('em', d).textContent = d.dataset.v + (el.dataset.unit || '');
    });
  },
  seats(el) {
    const taken = +el.dataset.taken, total = +el.dataset.total;
    $('.meter__fill', el).style.width = (taken / total * 100) + '%';
    $('.meter__n', el).innerHTML = (total - taken) + '<span class="suf"> left</span>';
    $('.meter__caption', el).textContent = `${taken} of ${total} seats taken in the January batch`;
  },
  timeline(el) {
    const fill = document.createElement('span'); fill.className = 'tl__fill'; fill.setAttribute('aria-hidden', 'true'); el.prepend(fill);
    const items = $$(':scope > li', el);
    const update = () => {
      const r = el.getBoundingClientRect(), mid = window.innerHeight * .62;
      const p = STATE.reduce ? 1 : Math.max(0, Math.min(1, (mid - r.top) / r.height));
      fill.style.height = (p * (r.height - 12)) + 'px';
      items.forEach(li => li.classList.toggle('on', li.getBoundingClientRect().top < mid || p >= 1));
    };
    update();
    window.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
    window.addEventListener('resize', update);
    el.dataset.ready = '1';
  },
  rail(el) {
    const track = $('.rail', el), prev = $('[data-rail="-1"]', el), next = $('[data-rail="1"]', el), bar = $('.rail__bar i', el);
    const upd = () => {
      const max = track.scrollWidth - track.clientWidth;
      prev.disabled = track.scrollLeft <= 2; next.disabled = track.scrollLeft >= max - 2;
      bar.style.width = Math.max(18, track.clientWidth / track.scrollWidth * 100) + '%';
      bar.style.transform = `translateX(${max ? track.scrollLeft / max * (100 / (parseFloat(bar.style.width) / 100) - 100) : 0}%)`;
    };
    [prev, next].forEach(b => b.addEventListener('click', () => {
      const card = track.firstElementChild; const step = card.getBoundingClientRect().width + 18;
      track.scrollBy({ left: step * +b.dataset.rail, behavior: STATE.reduce ? 'auto' : 'smooth' });
    }));
    track.addEventListener('scroll', () => requestAnimationFrame(upd), { passive: true });
    window.addEventListener('resize', upd); upd();
  },
  carousel(el) {
    const books = $$('.book', el.parentElement === null ? el : el), names = books.map(b => b.dataset.name);
    const live = $('#car-live'), dots = $$('.dots [data-go]');
    const show = i => {
      STATE.carouselIndex = (i + books.length) % books.length;
      books.forEach((b, k) => {
        const pos = (k - STATE.carouselIndex + books.length) % books.length;
        b.dataset.pos = pos; b.toggleAttribute('inert', pos !== 0); b.setAttribute('aria-hidden', String(pos !== 0));
        b.style.removeProperty('--tx'); b.style.removeProperty('--ty');
      });
      dots.forEach((d, k) => d.setAttribute('aria-current', String(k === STATE.carouselIndex)));
      if (live) live.textContent = names[STATE.carouselIndex];
    };
    $$('[data-car]').forEach(b => b.addEventListener('click', () => show(STATE.carouselIndex + +b.dataset.car)));
    dots.forEach(d => d.addEventListener('click', () => show(+d.dataset.go)));
    el.addEventListener('keydown', e => { if (e.key === 'ArrowRight') show(STATE.carouselIndex + 1); if (e.key === 'ArrowLeft') show(STATE.carouselIndex - 1); });
    if (!STATE.reduce && STATE.finePointer) {
      el.addEventListener('pointermove', e => requestAnimationFrame(() => {
        const b = books[STATE.carouselIndex], r = b.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        if (Math.abs(x) > .6 || Math.abs(y) > .6) return;
        b.style.setProperty('--ty', (x * 7).toFixed(2) + 'deg'); b.style.setProperty('--tx', (-y * 5).toFixed(2) + 'deg');
      }));
      el.addEventListener('pointerleave', () => { const b = books[STATE.carouselIndex]; b.style.removeProperty('--tx'); b.style.removeProperty('--ty'); });
    }
    show(0);
  },
  quotes(el) {
    const qs = $$('.quote', el), count = $('.quotes__count', el);
    const show = i => {
      STATE.quoteIndex = (i + qs.length) % qs.length;
      qs.forEach((q, k) => q.classList.toggle('is-on', k === STATE.quoteIndex));
      count.textContent = `${STATE.quoteIndex + 1} / ${qs.length}`;
    };
    $$('[data-q]', el).forEach(b => b.addEventListener('click', () => show(STATE.quoteIndex + +b.dataset.q)));
    show(0);
  },
  calc(el) {
    const f = $('form', el), out = $('.calc__total', el), lines = $('.calc__lines', el);
    const run = () => {
      const opt = f.course.selectedOptions[0];
      if (!opt || !opt.value) { out.textContent = inr(0); lines.innerHTML = '<li><span>Choose a course to see your fee</span></li>'; return; }
      const fee = +opt.dataset.fee;
      const online = f.mode.value === 'online' ? .1 : 0;
      const sch = +f.scholarship.value;
      const plan = f.plan.value;
      const afterMode = fee * (1 - online), schAmt = afterMode * sch, sub = afterMode - schAmt;
      const disc = plan === 'full' ? sub * .05 : 0, total = sub - disc;
      out.textContent = inr(total);
      lines.innerHTML = `<li><span>Course fee</span><span class="num">${inr(fee)}</span></li>` +
        (online ? `<li><span>Live online (10% off)</span><span class="num">−${inr(fee * online)}</span></li>` : '') +
        (sch ? `<li><span>Scholarship (${sch * 100}%)</span><span class="num">−${inr(schAmt)}</span></li>` : '') +
        (disc ? `<li><span>Pay in full (5% off)</span><span class="num">−${inr(disc)}</span></li>` : '') +
        (plan === 'emi' ? `<li><span>3 instalments of</span><span class="num">${inr(total / 3)}</span></li>` : '');
    };
    f.addEventListener('input', run); f.addEventListener('change', run); run();
  },
};
function runFx(el) {
  if (STATE.fxDone.has(el)) return;
  const fn = FX[el.dataset.fx];
  if (!fn) { console.error(`Unknown data-fx "${el.dataset.fx}"`, el); STATE.fxDone.add(el); return; }
  STATE.fxDone.add(el); el.dataset.fxRan = '1';
  fn(el);
}
function initFx() {
  const els = $$('[data-fx]');
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(entries => entries.forEach(en => {
    if (en.isIntersecting) { runFx(en.target); io.unobserve(en.target); }
  }), { rootMargin: '0px 0px -5% 0px' }) : null;
  els.forEach(el => io ? io.observe(el) : runFx(el));
  sweep();
  window.addEventListener('scroll', () => { cancelAnimationFrame(STATE.sweepRaf); STATE.sweepRaf = requestAnimationFrame(sweep); }, { passive: true });
}
/* scroll sweep: anything scrolled past (jump-scrolls) still runs */
function sweep() {
  const vh = window.innerHeight;
  $$('[data-fx]').forEach(el => { if (!STATE.fxDone.has(el) && el.getBoundingClientRect().top < vh) runFx(el); });
  revealSweep();
}

/* ================= 3D pointer tilt ================= */
function initTilt() {
  if (STATE.reduce || !STATE.finePointer) return;
  $$('[data-tilt]').forEach(el => {
    const base = parseFloat(el.dataset.tilt) || 0;
    el.addEventListener('pointermove', e => requestAnimationFrame(() => {
      const r = el.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      el.style.setProperty('--ty', (base + x * 6).toFixed(2) + 'deg'); el.style.setProperty('--tx', (-y * 4).toFixed(2) + 'deg');
    }));
    el.addEventListener('pointerleave', () => { el.style.removeProperty('--ty'); el.style.removeProperty('--tx'); });
  });
}

/* ================= course filters + save/compare ================= */
function initFilters() {
  const form = $('#filters'); if (!form) return;
  const cards = $$('[data-course]'), count = $('#f-count'), empty = $('#f-empty');
  const apply = () => {
    const cat = form.category.value, lvl = form.level.value, fee = form.fee.value;
    let n = 0;
    cards.forEach(c => {
      const f = +c.dataset.fee;
      const feeOk = !fee || (fee === 'lt50' && f < 50000) || (fee === '50to65' && f >= 50000 && f <= 65000) || (fee === 'gt65' && f > 65000);
      const ok = (!cat || c.dataset.category === cat) && (!lvl || c.dataset.level === lvl) && feeOk;
      c.hidden = !ok; if (ok) n++;
    });
    count.textContent = `Showing ${n} of ${cards.length} courses`;
    empty.hidden = n > 0;
  };
  form.addEventListener('change', apply);
  form.addEventListener('reset', () => setTimeout(apply));
  apply();
}
function initToggles() {
  $$('[data-toggle]').forEach(b => b.addEventListener('click', e => {
    e.preventDefault();
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-label', (on ? 'Remove from ' : 'Add to ') + b.dataset.toggle + ': ' + b.dataset.name);
    const status = $('#toggle-status'); if (status) status.textContent = `${b.dataset.name} ${on ? 'added to' : 'removed from'} ${b.dataset.toggle}`;
  }));
}

/* ================= gallery lightbox ================= */
function initGallery() {
  const btns = $$('[data-lb]'), lb = $('#lightbox'); if (!btns.length || !lb) return;
  const img = $('img', lb), cap = $('figcaption', lb);
  const show = i => {
    STATE.lightboxIndex = (i + btns.length) % btns.length;
    const src = $('img', btns[STATE.lightboxIndex]);
    img.src = src.currentSrc || src.src; img.alt = src.alt; cap.textContent = src.alt;
  };
  btns.forEach((b, i) => b.addEventListener('click', () => { STATE.lastFocus = b; show(i); lb.hidden = false; document.documentElement.style.overflow = 'hidden'; $('.lightbox__x', lb).focus(); }));
  $('.lightbox__x', lb).addEventListener('click', () => closeLightbox());
  $$('[data-lbn]', lb).forEach(b => b.addEventListener('click', () => show(STATE.lightboxIndex + +b.dataset.lbn)));
  lb.addEventListener('click', e => { if (e.target === lb) closeLightbox(); });
  document.addEventListener('keydown', e => {
    if (lb.hidden) return;
    if (e.key === 'Escape') closeLightbox(); if (e.key === 'ArrowRight') show(STATE.lightboxIndex + 1); if (e.key === 'ArrowLeft') show(STATE.lightboxIndex - 1);
  });
}
function closeLightbox(silent) {
  const lb = $('#lightbox'); if (!lb || lb.hidden) return;
  lb.hidden = true; document.documentElement.style.overflow = '';
  if (!silent && STATE.lastFocus) STATE.lastFocus.focus();
}

/* ================= modal ================= */
function openModal(title, text) {
  const m = $('#modal'); if (!m) return;
  $('h2', m).textContent = title; $('p', m).textContent = text; m.hidden = false; $('button', m).focus();
}
function closeModal() { const m = $('#modal'); if (m) m.hidden = true; }
function initModal() {
  const m = $('#modal'); if (!m) return;
  $('button', m).addEventListener('click', closeModal);
  m.addEventListener('click', e => { if (e.target === m) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
}

/* ================= validation ================= */
const V = {
  name(v) { if (!v) return 'This field is required.'; if (!/^[A-Za-z]+$/.test(v)) return 'Only alphabets are allowed.'; return ''; },
  phone(v) { if (!v) return 'This field is required.'; if (!/^\d+$/.test(v)) return 'Only numbers are allowed.'; if (v.length !== 10) return 'Enter exactly 10 digits.'; return ''; },
  email(v) { if (!v) return 'This field is required.'; return emailOk(v) ? '' : 'Use a format like name@example.com.'; },
  password(v) {
    if (!v) return 'This field is required.';
    if (COMMON_PASSWORDS.includes(v.toLowerCase())) return 'This password is too common. Choose another.';
    if (v.length < 8) return 'Use at least 8 characters.';
    if (!/[A-Z]/.test(v)) return 'Add at least one uppercase letter.';
    if (!/[a-z]/.test(v)) return 'Add at least one lowercase letter.';
    if (!/\d/.test(v)) return 'Add at least one number.';
    if (!/[^A-Za-z0-9]/.test(v)) return 'Add at least one symbol.';
    if (/\s/.test(v)) return 'Remove spaces from the password.';
    return '';
  },
  confirm(v, el) { if (!v) return 'This field is required.'; const p = el.form.querySelector('[data-v="password"]'); return p && v !== p.value ? 'Passwords do not match.' : ''; },
  select(v) { return v ? '' : 'Please choose an option.'; },
  pincode(v) { if (!v) return 'This field is required.'; if (!/^\d+$/.test(v)) return 'Only numbers are allowed.'; return v.length === 6 ? '' : 'Enter exactly 6 digits.'; },
  range(v, el) {
    if (!v) return 'This field is required.';
    if (!/^\d+$/.test(v)) return 'Only numbers are allowed.';
    const n = +v, min = +el.dataset.min, max = +el.dataset.max;
    return n >= min && n <= max ? '' : `Enter a number from ${min} to ${max}.`;
  },
  future(v) {
    if (!v) return 'Choose a date.';
    const d = new Date(v + 'T00:00:00'); if (isNaN(d)) return 'Choose a real date.';
    const t = new Date(); t.setHours(0, 0, 0, 0);
    return d > t ? '' : 'Choose a date after today.';
  },
  text(v) { if (!v.trim()) return 'This field is required.'; return v.trim().length < 10 ? 'Write at least 10 characters.' : ''; },
  required(v) { return v.trim() ? '' : 'This field is required.'; },
  fee(v) { if (!v) return 'This field is required.'; if (!/^\d+$/.test(v)) return 'Only numbers are allowed.'; return +v >= 1000 && +v <= 500000 ? '' : 'Enter a fee from 1000 to 500000.'; },
  radio(v) { return v ? '' : 'Please choose an option.'; },
  check(v, el) { return el.checked ? '' : (el.dataset.msg || 'Please tick this box.'); },
};
function emailOk(v) {
  if (/\s/.test(v) || v.length > 64) return false;
  const parts = v.split('@'); if (parts.length !== 2) return false;
  const [local, domain] = parts;
  if (!local || !domain || v.includes('..')) return false;
  if (/^[.]|[.]$/.test(local) || !/^[A-Za-z0-9._%+-]+$/.test(local)) return false;
  const labels = domain.split('.');
  if (labels.length < 2) return false;
  const tld = labels[labels.length - 1];
  if (!/^[A-Za-z]{2,}$/.test(tld)) return false;
  const badLabel = labels.some(l => !l || l.length < 2 || /^-|-$/.test(l) || !/^[A-Za-z0-9-]+$/.test(l) || /^\d+$/.test(l));
  return !badLabel;
}
function fieldOf(el) { return el.closest('.field') || el.closest('.roles-wrap') || el.parentElement; }
function setError(el, msg) {
  const field = fieldOf(el);
  let b = field.querySelector(':scope > .bubble');
  if (msg) {
    if (!b) { b = document.createElement('span'); b.className = 'bubble'; b.setAttribute('role', 'alert'); field.appendChild(b); }
    b.textContent = msg; b.id = b.id || 'err-' + (el.id || el.name);
    el.setAttribute('aria-invalid', 'true'); el.setAttribute('aria-describedby', b.id);
    if (el.classList.contains('inp')) el.classList.add('bad');
  } else {
    if (b) b.remove();
    el.removeAttribute('aria-invalid'); el.removeAttribute('aria-describedby'); el.classList.remove('bad');
  }
  return !msg;
}
function validate(el) {
  const rule = el.dataset.v;
  if (el.type === 'radio') {
    const checked = el.form.querySelector(`input[name="${el.name}"]:checked`);
    const first = el.form.querySelector(`input[name="${el.name}"]`);
    return setError(first, V.radio(checked ? checked.value : ''));
  }
  return setError(el, V[rule](el.type === 'checkbox' ? '' : el.value, el));
}
function initForms() {
  $$('form[data-validate]').forEach(form => {
    form.noValidate = true;
    const fields = () => $$('[data-v]', form);
    fields().forEach(el => {
      if (el.type === 'radio' || el.type === 'checkbox') {
        el.addEventListener('change', () => validate(el));
        return;
      }
      el.addEventListener('blur', () => { if (el.value || el.dataset.touched) validate(el); el.dataset.touched = '1'; });
      el.addEventListener('input', () => { setError(el, ''); });
      el.addEventListener('change', () => { if (el.tagName === 'SELECT' || el.type === 'date') validate(el); });
      if (el.dataset.v === 'name') {
        el.addEventListener('keydown', e => { if (e.key === ' ' || e.code === 'Space') e.preventDefault(); });
        el.addEventListener('paste', e => {
          e.preventDefault();
          const t = (e.clipboardData || window.clipboardData).getData('text').replace(/\s+/g, '');
          const s = el.selectionStart, en = el.selectionEnd;
          el.value = (el.value.slice(0, s) + t + el.value.slice(en)).slice(0, el.maxLength > 0 ? el.maxLength : 999);
          el.dispatchEvent(new Event('input'));
        });
      }
    });
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (form.dataset.terms) {
        const t = form.querySelector('#terms');
        if (!t.checked) { openModal('Accept the terms first', 'Tick "I accept the terms" to create your account.'); return; }
      }
      const seen = new Set(); let firstBad = null;
      fields().forEach(el => {
        if (el.type === 'radio') { if (seen.has(el.name)) return; seen.add(el.name); }
        if (!validate(el) && !firstBad) firstBad = el;
      });
      if (firstBad) { (firstBad.type === 'radio' ? firstBad.closest('label') : firstBad).scrollIntoView({ block: 'center', behavior: 'auto' }); firstBad.focus({ preventScroll: true }); return; }
      const handler = FORM_OK[form.dataset.validate]; if (handler) handler(form);
    });
  });
  $$('.pw__t').forEach(b => b.addEventListener('click', () => {
    const i = b.parentElement.querySelector('input'); const show = i.type === 'password';
    i.type = show ? 'text' : 'password'; b.setAttribute('aria-pressed', String(show)); b.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  }));
}
const FORM_OK = {
  signup(f) {
    const role = f.querySelector('input[name="role"]:checked').value;
    sessionStorage.setItem('sa_account', JSON.stringify({ first: f.first.value, last: f.last.value, email: f.email.value.toLowerCase(), role }));
    sessionStorage.setItem('sa_created', '1');
    location.href = 'signin.html';
  },
  signin(f) {
    const role = f.querySelector('input[name="role"]:checked').value;
    let acc = null; try { acc = JSON.parse(sessionStorage.getItem('sa_account') || 'null'); } catch (e) { acc = null; }
    const email = f.email.value.toLowerCase();
    const local = email.split('@')[0].split(/[._-]/)[0];
    const name = acc && acc.email === email ? acc.first : local.charAt(0).toUpperCase() + local.slice(1);
    sessionStorage.setItem('sa_user', JSON.stringify({ name, role }));
    location.href = role === 'staff' ? 'dashboard-admin.html' : 'dashboard-student.html';
  },
  enquiry(f) { showOk(f, `Thanks, ${f.first.value}. An admissions counsellor will call you on ${f.phone.value} within one working day.`); },
  profile(f) { showOk(f, 'Profile saved.'); },
  course(f) {
    const tb = $('#enrol-body');
    showOk(f, `${f.cname.value} added with ${f.seats.value} seats, starting ${new Date(f.start.value + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}.`);
  },
};
function showOk(f, msg) {
  let ok = f.querySelector('.form-ok');
  if (!ok) { ok = document.createElement('p'); ok.className = 'form-ok'; ok.setAttribute('role', 'status'); f.appendChild(ok); }
  ok.textContent = msg;
}

/* ================= auth + dashboards ================= */
function initAuthNotice() {
  const n = $('#created-note'); if (!n) return;
  if (sessionStorage.getItem('sa_created') === '1') { n.hidden = false; sessionStorage.removeItem('sa_created');
    try { const a = JSON.parse(sessionStorage.getItem('sa_account')); if (a) { $('#email').value = a.email; const r = $(`input[name="role"][value="${a.role}"]`); if (r) r.checked = true; } } catch (e) { /* ignore */ }
  }
}
function initDashboard() {
  const g = $('[data-greet]'); if (!g) return;
  let u = null; try { u = JSON.parse(sessionStorage.getItem('sa_user') || 'null'); } catch (e) { u = null; }
  g.textContent = u && u.name ? `Welcome back, ${u.name}` : 'Welcome back';
  const btn = $('.dhdr__menu'), side = $('#side');
  const hdr = $('.dhdr');
  const setH = () => document.documentElement.style.setProperty('--dh', hdr.getBoundingClientRect().height + 'px');
  setH(); window.addEventListener('resize', setH);
  btn.addEventListener('click', () => { side.classList.contains('open') ? closeDrawer() : openDrawer(); });
  $$('[data-logout]').forEach(a => a.addEventListener('click', () => sessionStorage.removeItem('sa_user')));
  window.addEventListener('resize', () => { if (window.innerWidth >= 1000) closeDrawer(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
}
function openDrawer() {
  const side = $('#side'), btn = $('.dhdr__menu'); side.classList.add('open'); btn.setAttribute('aria-expanded', 'true');
  let s = $('.scrim'); if (!s) { s = document.createElement('div'); s.className = 'scrim'; s.addEventListener('click', closeDrawer); document.body.appendChild(s); }
  s.hidden = false; side.querySelector('a').focus();
}
function closeDrawer() {
  const side = $('#side'); if (!side) return;
  side.classList.remove('open'); const btn = $('.dhdr__menu'); if (btn) btn.setAttribute('aria-expanded', 'false');
  const s = $('.scrim'); if (s) s.hidden = true;
}

/* ================= boot ================= */
function boot() {
  sweepLinks(); initMenu(); initSplash(); initModal(); initReveal(); initFx(); initTilt();
  initFilters(); initToggles(); initGallery(); initForms(); initAuthNotice(); initDashboard();
}
window.addEventListener('pageshow', clearOverlays);
window.addEventListener('popstate', clearOverlays);
window.addEventListener('pagehide', clearOverlays);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
