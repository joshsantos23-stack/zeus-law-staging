/**
 * ZEUS LAW FIRM — Production JavaScript
 * Architecture: Vanilla ES6+, no dependencies
 */

'use strict';

const state = {
  currentStep: 1, totalSteps: 3, caseType: null, intakeSource: null,
  hasAttorney: 'no', wasInjured: 'yes', formData: {}
};

let dom = {};

document.addEventListener('DOMContentLoaded', () => {
  dom = {
    header: document.getElementById('siteHeader'),
    mobileMenuBtn: document.getElementById('mobileMenuBtn'),
    mobileNav: document.getElementById('mobileNav'),
    intakeOverlay: document.getElementById('intakeOverlay'),
    intakeProgress: document.getElementById('intakeProgress'),
    progressFill: document.getElementById('intakeProgressFill'),
    progressLabel: document.getElementById('intakeProgressLabel'),
    step1: document.getElementById('intakeStep1'),
    step2: document.getElementById('intakeStep2'),
    step3: document.getElementById('intakeStep3'),
    confirmation: document.getElementById('intakeConfirmation'),
    step1Next: document.getElementById('step1Next'),
    footerYear: document.getElementById('footerYear'),
  };
  initHeader(); initMobileMenu(); initScrollAnimations();
  initCounters(); initFAQ(); initFooter(); initKeyboardTrap();
});

function initHeader() {
  if (!dom.header) return;
  const onScroll = throttle(() => {
    dom.header.classList.toggle('is-scrolled', window.scrollY > 40);
  }, 50);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

function initMobileMenu() {
  if (!dom.mobileMenuBtn || !dom.mobileNav) return;
  dom.mobileMenuBtn.addEventListener('click', () => {
    const isOpen = dom.mobileNav.classList.toggle('is-open');
    dom.mobileMenuBtn.classList.toggle('is-open', isOpen);
    dom.mobileMenuBtn.setAttribute('aria-expanded', String(isOpen));
    dom.mobileNav.setAttribute('aria-hidden', String(!isOpen));
  });
  document.addEventListener('click', (e) => {
    if (dom.mobileNav.classList.contains('is-open') && !dom.header.contains(e.target)) closeMobileMenu();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && dom.mobileNav.classList.contains('is-open')) closeMobileMenu();
  });
  dom.mobileNav.querySelectorAll('.mobile-nav__link').forEach(link => {
    link.addEventListener('click', closeMobileMenu);
  });
}

function closeMobileMenu() {
  dom.mobileNav.classList.remove('is-open');
  dom.mobileMenuBtn.classList.remove('is-open');
  dom.mobileMenuBtn.setAttribute('aria-expanded', 'false');
  dom.mobileNav.setAttribute('aria-hidden', 'true');
}

function openIntake(source) {
  state.intakeSource = source || 'unknown';
  state.currentStep = 1;
  resetIntake();
  dom.intakeOverlay.classList.add('is-open');
  dom.intakeOverlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  setTimeout(() => {
    const firstBtn = dom.step1.querySelector('.case-type-btn');
    if (firstBtn) firstBtn.focus();
  }, 300);
  trackEvent('intake_open', { source: state.intakeSource });
}

function closeIntake() {
  dom.intakeOverlay.classList.remove('is-open');
  dom.intakeOverlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function resetIntake() {
  state.caseType = null; state.hasAttorney = 'no'; state.wasInjured = 'yes'; state.formData = {};
  showStep(1);
  document.querySelectorAll('.case-type-btn').forEach(btn => {
    btn.classList.remove('is-selected'); btn.setAttribute('aria-pressed', 'false');
  });
  if (dom.step1Next) dom.step1Next.disabled = true;
  const form = document.getElementById('intakeForm');
  if (form) form.reset();
  clearValidation();
}

function selectCaseType(btn) {
  document.querySelectorAll('.case-type-btn').forEach(b => {
    b.classList.remove('is-selected'); b.setAttribute('aria-pressed', 'false');
  });
  btn.classList.add('is-selected'); btn.setAttribute('aria-pressed', 'true');
  state.caseType = btn.getAttribute('data-type');
  if (dom.step1Next) dom.step1Next.disabled = false;
  trackEvent('case_type_selected', { type: state.caseType });
}

function goToStep(stepNum) {
  if (stepNum === 3 && !validateStep2()) return;
  showStep(stepNum); updateProgress(stepNum); state.currentStep = stepNum;
  const modal = document.querySelector('.intake-modal');
  if (modal) modal.scrollTop = 0;
  trackEvent('intake_step', { step: stepNum, caseType: state.caseType });
}

function showStep(num) {
  const allSteps = [dom.step1, dom.step2, dom.step3, dom.confirmation];
  allSteps.forEach(step => { if (step) step.classList.add('intake-step--hidden'); });
  const stepMap = { 1: dom.step1, 2: dom.step2, 3: dom.step3, 4: dom.confirmation };
  const target = stepMap[num];
  if (target) {
    target.classList.remove('intake-step--hidden');
    const title = target.querySelector('.intake-step__title, .confirmation__title');
    if (title) { title.setAttribute('tabindex', '-1'); title.focus(); }
  }
}

function updateProgress(step) {
  const pct = step === 4 ? 100 : Math.round((step / state.totalSteps) * 100);
  if (dom.progressFill) dom.progressFill.style.width = pct + '%';
  if (dom.progressLabel) dom.progressLabel.textContent = step <= 3 ? 'Step ' + step + ' of ' + state.totalSteps : 'Complete';
  if (dom.intakeProgress) dom.intakeProgress.setAttribute('aria-valuenow', String(step));
}

function selectToggle(btn, fieldName) {
  const group = btn.closest('.toggle-group');
  if (!group) return;
  group.querySelectorAll('.toggle-btn').forEach(b => {
    b.classList.remove('is-active'); b.setAttribute('aria-pressed', 'false');
  });
  btn.classList.add('is-active'); btn.setAttribute('aria-pressed', 'true');
  state[fieldName] = btn.getAttribute('data-val');
}

function validateStep2() {
  clearValidation(); let valid = true;
  const name = document.getElementById('clientName');
  const phone = document.getElementById('clientPhone');
  if (!name || !name.value.trim() || name.value.trim().length < 2) {
    showFieldError('nameError', 'Please enter your full name.');
    if (name) name.classList.add('is-invalid'); valid = false;
  }
  if (!phone || !isValidPhone(phone.value)) {
    showFieldError('phoneError', 'Please enter a valid phone number.');
    if (phone) phone.classList.add('is-invalid'); valid = false;
  }
  if (!valid && name && !name.value.trim()) name.focus();
  else if (!valid && phone) phone.focus();
  return valid;
}

function submitIntake() {
  const consent = document.getElementById('consentCheck');
  if (!consent || !consent.checked) {
    showFieldError('consentError', 'Please agree to the consent statement to continue.');
    if (consent) consent.focus(); return;
  }
  state.formData = {
    caseType: state.caseType,
    name: document.getElementById('clientName')?.value.trim() || '',
    phone: document.getElementById('clientPhone')?.value.trim() || '',
    email: document.getElementById('clientEmail')?.value.trim() || '',
    details: document.getElementById('caseDetails')?.value.trim() || '',
    hasAttorney: state.hasAttorney, wasInjured: state.wasInjured,
    source: state.intakeSource, submittedAt: new Date().toISOString()
  };
  submitLeadToBackend(state.formData);
  const confirmPhone = document.getElementById('confirmPhone');
  if (confirmPhone) confirmPhone.textContent = state.formData.phone;
  goToStep(4);
  trackEvent('intake_submitted', { caseType: state.caseType, source: state.intakeSource });
}

async function submitLeadToBackend(data) {
  try {
    const res = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error('Server error: ' + res.status);
  } catch (err) {
    console.error('Lead submission error:', err);
    const stored = JSON.parse(localStorage.getItem('zeus_leads') || '[]');
    stored.push(data); localStorage.setItem('zeus_leads', JSON.stringify(stored));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('intakeOverlay');
  if (overlay) overlay.addEventListener('click', (e) => { if (e.target === overlay) closeIntake(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeIntake(); });
});

function initKeyboardTrap() {
  const overlay = document.getElementById('intakeOverlay');
  if (!overlay) return;
  overlay.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || !overlay.classList.contains('is-open')) return;
    const focusable = overlay.querySelectorAll('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex="0"], a[href]');
    const visibleFocusable = Array.from(focusable).filter(el => el.offsetParent !== null && !el.closest('.intake-step--hidden'));
    if (!visibleFocusable.length) return;
    const first = visibleFocusable[0]; const last = visibleFocusable[visibleFocusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
}

function initCounters() {
  const counters = document.querySelectorAll('.counter[data-val]');
  if (!counters.length) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (entry.isIntersecting) { animateCounter(entry.target); observer.unobserve(entry.target); } });
  }, { threshold: 0.5 });
  counters.forEach(counter => observer.observe(counter));
}

function animateCounter(el) {
  const target = parseFloat(el.getAttribute('data-val'));
  const duration = 1800; const start = performance.now();
  const isDecimal = target % 1 !== 0;
  const tick = (now) => {
    const elapsed = now - start; const progress = Math.min(elapsed / duration, 1);
    const eased = easeOutCubic(progress); const current = target * eased;
    el.textContent = isDecimal ? current.toFixed(1) : Math.floor(current).toLocaleString();
    if (progress < 1) requestAnimationFrame(tick);
    else el.textContent = isDecimal ? target.toFixed(1) : target.toLocaleString();
  };
  requestAnimationFrame(tick);
}

function initScrollAnimations() {
  const targets = document.querySelectorAll('.settlement-card, .practice-card, .attorney-card, .testimonial-card, .differentiator, .result-stat, .area-link');
  targets.forEach((el, i) => {
    el.classList.add('animate-on-scroll');
    el.style.transitionDelay = ((i % 4) * 80) + 'ms';
  });
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  targets.forEach(el => observer.observe(el));
}

function initFAQ() {
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    item.addEventListener('toggle', () => {
      if (item.open) faqItems.forEach(other => { if (other !== item && other.open) other.removeAttribute('open'); });
    });
  });
}

function initFooter() {
  if (dom.footerYear) dom.footerYear.textContent = new Date().getFullYear();
}

function trackEvent(eventName, params = {}) {
  if (typeof gtag === 'function') gtag('event', eventName, params);
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') console.log('[ZEUS Analytics] ' + eventName, params);
}

function throttle(fn, wait) {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last >= wait) { last = now; return fn.apply(this, args); }
  };
}
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
function isValidPhone(phone) { return phone.replace(/\D/g, '').length >= 10; }
function showFieldError(fieldId, message) { const el = document.getElementById(fieldId); if (el) el.textContent = message; }
function clearValidation() {
  document.querySelectorAll('.form-error').forEach(el => el.textContent = '');
  document.querySelectorAll('.form-input.is-invalid, .form-textarea.is-invalid').forEach(el => el.classList.remove('is-invalid'));
}

document.addEventListener('DOMContentLoaded', () => {
  const phoneInput = document.getElementById('clientPhone');
  if (!phoneInput) return;
  phoneInput.addEventListener('input', function () {
    const digits = this.value.replace(/\D/g, '').slice(0, 10);
    if (digits.length === 0) { this.value = ''; return; }
    if (digits.length <= 3) { this.value = '(' + digits; return; }
    if (digits.length <= 6) { this.value = '(' + digits.slice(0,3) + ') ' + digits.slice(3); return; }
    this.value = '(' + digits.slice(0,3) + ') ' + digits.slice(3,6) + '-' + digits.slice(6);
  });
});

let exitIntentFired = false;
document.addEventListener('mouseleave', (e) => {
  if (e.clientY <= 0 && !exitIntentFired && !document.getElementById('intakeOverlay')?.classList.contains('is-open')) {
    exitIntentFired = true;
    setTimeout(() => openIntake('exit-intent'), 300);
  }
});
