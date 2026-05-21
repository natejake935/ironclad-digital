/* ================================================================
   IRONCLAD DIGITAL — Free Lead Leak Audit funnel controller
   Vanilla JS. No build step. Self-contained state machine.
================================================================ */
(function () {
  'use strict';

  /* ──────────────────────────────────────────────────────────────
     1. QUESTION CONFIG (panes 1–10)
        Each step is structurally identical and rendered from here.
        - field:    key in the answers object
        - type:     'single' | 'multi'
        - other:    show an inline "Other" text input, stored in otherField
        - hint(v):  returns { text, tone } | null  based on the selection
  ────────────────────────────────────────────────────────────── */
  var STEPS = [
    {
      key: 'q1', field: 'businessType', type: 'single',
      question: 'What type of work do you do?',
      sub: 'This helps us understand your business before the audit.',
      options: [
        { value: 'electrical', label: 'Electrical' },
        { value: 'hvac', label: 'HVAC' },
        { value: 'plumbing', label: 'Plumbing' },
        { value: 'roofing', label: 'Roofing' },
        { value: 'remodeling', label: 'Remodeling / General Contractor' },
        { value: 'other', label: 'Other' }
      ],
      other: { field: 'businessTypeOther', label: 'What type of work?' }
    },
    {
      key: 'q2', field: 'leadSources', type: 'multi',
      question: 'Where do most new customer calls come from?',
      sub: 'Pick all that apply.',
      options: [
        { value: 'google', label: 'Google Search / Maps' },
        { value: 'yelp', label: 'Yelp / Angi / HomeAdvisor' },
        { value: 'referrals', label: 'Referrals / word of mouth' },
        { value: 'social', label: 'Facebook / Instagram' },
        { value: 'paid', label: 'Paid ads' },
        { value: 'other', label: 'Other' }
      ],
      other: { field: 'leadSourceOther', label: 'Where else do calls come from?' },
      helper: { text: 'Shared leads usually go to more than one contractor.', tone: 'neutral', always: true }
    },
    {
      key: 'q3', field: 'monthlyLeadVolumeRange', type: 'single',
      question: 'About how many new calls or leads do you get each month?',
      sub: 'This helps us estimate how many job chances may be slipping away.',
      options: [
        { value: '0-10', label: '0–10' },
        { value: '10-25', label: '10–25' },
        { value: '25-50', label: '25–50' },
        { value: '50-100', label: '50–100' },
        { value: '100-200', label: '100–200' },
        { value: '200+', label: '200+' }
      ]
    },
    {
      key: 'q4', field: 'adSpendRange', type: 'single',
      question: 'How much are you spending on ads or lead platforms each month?',
      sub: 'This helps us see what a missed call could be costing you.',
      options: [
        { value: '0', label: '$0 right now' },
        { value: '<500', label: 'Under $500' },
        { value: '500-1500', label: '$500–$1,500' },
        { value: '1500-3000', label: '$1,500–$3,000' },
        { value: '3000-7500', label: '$3,000–$7,500' },
        { value: '7500+', label: '$7,500+' }
      ],
      hint: function (v) {
        if (v === '1500-3000' || v === '3000-7500' || v === '7500+') {
          return { text: 'At this spend, missed calls can get expensive fast.', tone: 'amber' };
        }
        return null;
      }
    },
    {
      key: 'q5', field: 'averageJobValueRange', type: 'single',
      question: 'What is an average booked job worth to you?',
      sub: 'A rough number is fine. This helps us estimate what extra booked jobs may be worth.',
      options: [
        { value: 'u250', label: 'Under $250' },
        { value: '250-750', label: '$250–$750' },
        { value: '750-1500', label: '$750–$1,500' },
        { value: '1500-3000', label: '$1,500–$3,000' },
        { value: '3000-7500', label: '$3,000–$7,500' },
        { value: '7500+', label: '$7,500+' }
      ],
      hint: function (v) {
        if (v === '3000-7500' || v === '7500+') {
          return { text: 'At that job value, even one lost customer can hurt.', tone: 'amber' };
        }
        return null;
      }
    },
    {
      key: 'qClose', field: 'currentBookedJobRateRange', type: 'single',
      question: 'Out of every 10 new calls or leads, how many usually turn into booked jobs?',
      sub: 'A rough guess is fine. This helps us compare where you are now with what may be possible.',
      options: [
        { value: '0-1', label: '0–1' },
        { value: '2-3', label: '2–3' },
        { value: '4-5', label: '4–5' },
        { value: '6-7', label: '6–7' },
        { value: '8-10', label: '8–10' },
        { value: 'other', label: 'Other' }
      ],
      other: { field: 'currentBookedJobRateOther', label: 'How many out of 10 usually book?' },
      helper: { text: 'This helps estimate your current lead revenue.', tone: 'neutral', whenAnswered: true }
    },
    {
      key: 'q6', field: 'responseSpeed', type: 'single',
      question: 'When a new customer reaches out, how fast do you usually reply?',
      sub: 'Be honest. This is where a lot of jobs are won or lost.',
      options: [
        { value: 'right-away', label: 'Right away' },
        { value: '15min', label: 'Within 15 minutes' },
        { value: 'hour', label: 'Within an hour' },
        { value: 'later-day', label: 'Later that day' },
        { value: 'miss', label: 'Sometimes I miss them' },
        { value: 'other', label: 'Other' }
      ],
      other: { field: 'responseSpeedOther', label: 'How fast do you usually reply?' },
      hint: function (v) {
        if (v === 'hour' || v === 'later-day' || v === 'miss') {
          return { text: 'Possible leak found: slow replies.', tone: 'amber' };
        }
        return null;
      }
    },
    {
      key: 'q7', field: 'missedCallsRange', type: 'single',
      question: 'About how many customer calls do you miss each week?',
      sub: "Most contractors miss calls when they're on a job. That's exactly what this system is built for.",
      options: [
        { value: '0', label: '0' },
        { value: '1-2', label: '1–2' },
        { value: '3-5', label: '3–5' },
        { value: '6-10', label: '6–10' },
        { value: '10-20', label: '10–20' },
        { value: '20+', label: '20+' }
      ],
      hint: function (v) {
        if (v && v !== '0') return { text: 'Possible leak found: missed calls.', tone: 'amber' };
        return null;
      }
    },
    {
      key: 'q8', field: 'followupProcess', type: 'single',
      question: "What happens if a customer doesn't answer the first call or text?",
      sub: 'Good jobs can slip away when follow-up stops.',
      options: [
        { value: 'several', label: 'We follow up several times' },
        { value: 'once', label: 'We follow up once' },
        { value: 'depends', label: 'It depends how busy we are' },
        { value: 'forgotten', label: 'They usually get forgotten' },
        { value: 'none', label: "We don't have a real follow-up system" },
        { value: 'other', label: 'Other' }
      ],
      other: { field: 'followupOther', label: 'What usually happens?' },
      hint: function (v) {
        if (v === 'once' || v === 'depends' || v === 'forgotten' || v === 'none') {
          return { text: 'Possible leak found: weak follow-up.', tone: 'amber' };
        }
        return null;
      }
    },
    {
      key: 'q9', field: 'leadTrackingMethod', type: 'single',
      question: 'How do you keep track of new leads right now?',
      sub: 'No wrong answer. We just want to see where things may be slipping through.',
      options: [
        { value: 'memory', label: 'Notes / memory' },
        { value: 'phone-log', label: 'Phone texts and call log' },
        { value: 'spreadsheet', label: 'Spreadsheet' },
        { value: 'crm', label: 'Jobber / Housecall Pro / ServiceTitan' },
        { value: 'yelp-emails', label: 'Yelp / Angi / HomeAdvisor emails' },
        { value: 'none', label: "We don't really track them" }
      ],
      hint: function (v) {
        if (v === 'memory' || v === 'phone-log' || v === 'yelp-emails' || v === 'none') {
          return { text: 'Possible leak found: leads can slip through.', tone: 'amber' };
        }
        return null;
      }
    },
    {
      key: 'q10', field: 'biggestLeaks', type: 'multi',
      question: 'Where do you think jobs are slipping away the most?',
      sub: 'Pick all that apply.',
      options: [
        { value: 'missed-calls', label: 'Missed calls' },
        { value: 'slow-replies', label: 'Slow replies' },
        { value: 'no-followup', label: 'No follow-up' },
        { value: 'website', label: "Website doesn't help people book" },
        { value: 'low-quality', label: 'Leads are low quality' },
        { value: 'other', label: 'Other' }
      ],
      other: { field: 'biggestLeakOther', label: 'Where else do jobs slip away?' },
      helper: { text: "We'll include this in your report.", tone: 'neutral', whenAnswered: true }
    }
  ];

  /* Linear flow of pane keys. Question steps come from STEPS. */
  var FLOW = ['landing'].concat(STEPS.map(function (s) { return s.key; }))
    .concat(['contact', 'results', 'calendar', 'success']);

  /* ──────────────────────────────────────────────────────────────
     2. STATE
  ────────────────────────────────────────────────────────────── */
  var answers = {
    businessType: '', businessTypeOther: '',
    leadSources: [], leadSourceOther: '',
    monthlyLeadVolumeRange: '',
    adSpendRange: '',
    averageJobValueRange: '',
    currentBookedJobRateRange: '', currentBookedJobRateOther: '',
    responseSpeed: '', responseSpeedOther: '',
    missedCallsRange: '',
    followupProcess: '', followupOther: '',
    leadTrackingMethod: '',
    biggestLeaks: [], biggestLeakOther: '',
    fullName: '', businessName: '', phone: '', email: '', websiteUrl: '', serviceArea: '',
    smsConsent: false,
    // calculated values (baseline + improvement model)
    monthlyLeadsMidpoint: 0,
    averageJobValueMidpoint: 0,
    currentBookedJobRate: 0,
    currentBookedJobs: 0,
    currentEstimatedLeadRevenue: 0,
    leakScore: 0,
    improvementLow: 0,
    improvementHigh: 0,
    potentialExtraJobsLow: 0,
    potentialExtraJobsHigh: 0,
    estimatedRevenueLeftLow: 0,
    estimatedRevenueLeftHigh: 0,
    estimatedPaidOpportunityWasteLow: 0,
    estimatedPaidOpportunityWasteHigh: 0
  };

  var leadSaved = false;          // becomes true once the contact gate submits
  var booking = { date: null, time: null };
  var current = 'landing';

  /* ──────────────────────────────────────────────────────────────
     3. CALCULATION LOGIC
  ────────────────────────────────────────────────────────────── */
  // Range midpoints
  var LEAD_VOLUME = { '0-10': 5, '10-25': 17, '25-50': 37, '50-100': 75, '100-200': 150, '200+': 250 };
  var JOB_VALUE = { 'u250': 175, '250-750': 500, '750-1500': 1125, '1500-3000': 2250, '3000-7500': 5000, '7500+': 8500 };
  var BOOKED_RATE = { '0-1': 0.05, '2-3': 0.25, '4-5': 0.45, '6-7': 0.65, '8-10': 0.85 };
  var AD_SPEND = { '0': 0, '<500': 250, '500-1500': 1000, '1500-3000': 2250, '3000-7500': 5000, '7500+': 8500 };

  // Leak score points
  var RESPONSE_PTS = { 'right-away': 0, '15min': 5, 'hour': 12, 'later-day': 22, 'miss': 30, 'other': 12 };
  var MISSED_PTS = { '0': 0, '1-2': 8, '3-5': 16, '6-10': 24, '10-20': 32, '20+': 40 };
  var FOLLOWUP_PTS = { 'several': 0, 'once': 10, 'depends': 18, 'forgotten': 26, 'none': 32, 'other': 15 };
  var TRACKING_PTS = { 'crm': 0, 'spreadsheet': 7, 'phone-log': 12, 'yelp-emails': 14, 'memory': 18, 'none': 25 };
  var LEAK_BONUS = { 'missed-calls': 4, 'slow-replies': 4, 'no-followup': 4, 'website': 3 };

  function roundMoney(n) {
    if (n <= 0) return 0;
    if (n < 10000) return Math.round(n / 100) * 100;
    if (n <= 50000) return Math.round(n / 500) * 500;
    return Math.round(n / 1000) * 1000;
  }

  // Parse the "Other" booked-rate input ("3", "3 out of 10", "30%") into a 0–1 rate.
  function parseBookedRateOther(text) {
    if (!text) return 0.30;
    var m = String(text).match(/(\d+(\.\d+)?)/);
    if (!m) return 0.30;
    var n = parseFloat(m[1]);
    if (isNaN(n)) return 0.30;
    if (n > 10) n = n / 100 * 10;          // treat a percentage like "30" as 3/10
    var rate = n / 10;
    return Math.max(0, Math.min(1, rate));
  }

  function calculateEstimate() {
    var monthlyLeads = LEAD_VOLUME[answers.monthlyLeadVolumeRange] || 0;
    var avgJobValue = JOB_VALUE[answers.averageJobValueRange] || 0;
    var adSpend = AD_SPEND[answers.adSpendRange] || 0;

    var bookedRate = answers.currentBookedJobRateRange === 'other'
      ? parseBookedRateOther(answers.currentBookedJobRateOther)
      : (BOOKED_RATE[answers.currentBookedJobRateRange] || 0.30);

    // Baseline
    var currentBookedJobs = monthlyLeads * bookedRate;
    var currentLeadRevenue = currentBookedJobs * avgJobValue;
    var unconvertedLeads = monthlyLeads - currentBookedJobs;

    // Leak score (0–100)
    var score = (RESPONSE_PTS[answers.responseSpeed] || 0)
      + (MISSED_PTS[answers.missedCallsRange] || 0)
      + (FOLLOWUP_PTS[answers.followupProcess] || 0)
      + (TRACKING_PTS[answers.leadTrackingMethod] || 0);
    answers.biggestLeaks.forEach(function (l) { score += (LEAK_BONUS[l] || 0); });
    var leakScore = Math.min(100, score);

    // Improvement range from leak score
    var impLow, impHigh;
    if (leakScore <= 15) { impLow = 0.02; impHigh = 0.05; }
    else if (leakScore <= 35) { impLow = 0.05; impHigh = 0.10; }
    else if (leakScore <= 60) { impLow = 0.10; impHigh = 0.18; }
    else { impLow = 0.15; impHigh = 0.25; }

    // Potential extra booked jobs, capped by available unconverted leads
    var extraLow = monthlyLeads * impLow;
    var extraHigh = monthlyLeads * impHigh;
    extraLow = Math.min(extraLow, unconvertedLeads * 0.50);
    extraHigh = Math.min(extraHigh, unconvertedLeads * 0.75);
    if (extraLow < 0) extraLow = 0;
    if (extraHigh < 0) extraHigh = 0;

    // Revenue left on the table
    var revLeftLow = extraLow * avgJobValue;
    var revLeftHigh = extraHigh * avgJobValue;

    // Ad-spend context (used in the email report, not the hero number)
    var costPerLead = monthlyLeads > 0 ? adSpend / monthlyLeads : 0;

    answers.monthlyLeadsMidpoint = monthlyLeads;
    answers.averageJobValueMidpoint = avgJobValue;
    answers.currentBookedJobRate = bookedRate;
    answers.currentBookedJobs = currentBookedJobs;
    answers.currentEstimatedLeadRevenue = currentLeadRevenue;
    answers.leakScore = leakScore;
    answers.improvementLow = impLow;
    answers.improvementHigh = impHigh;
    answers.potentialExtraJobsLow = extraLow;
    answers.potentialExtraJobsHigh = extraHigh;
    answers.estimatedRevenueLeftLow = roundMoney(revLeftLow);
    answers.estimatedRevenueLeftHigh = roundMoney(revLeftHigh);
    answers.estimatedPaidOpportunityWasteLow = roundMoney(extraLow * costPerLead);
    answers.estimatedPaidOpportunityWasteHigh = roundMoney(extraHigh * costPerLead);
  }

  function fmtMoney(n) {
    return '$' + Math.round(n).toLocaleString('en-US');
  }

  // Current lead revenue: round to nearest $500 when over $10k.
  function fmtRevenue(n) {
    var v = n > 10000 ? Math.round(n / 500) * 500 : Math.round(n / 100) * 100;
    return fmtMoney(v);
  }

  // Jobs: one decimal under 5, whole numbers at 5+.
  function fmtJobs(n) {
    return n < 5 ? (Math.round(n * 10) / 10).toString() : Math.round(n).toString();
  }

  /* ──────────────────────────────────────────────────────────────
     4. INTEGRATION STUBS  (clean placeholders for the real backend)
        Mirrors the site's window.IroncladAPI pattern. Falls back to
        a local mock so the UI is fully testable without a server.
  ────────────────────────────────────────────────────────────── */
  var Audit = {
    // Save the lead + trigger the report email. Called when the
    // contact gate is submitted, BEFORE the estimate is shown.
    saveLead: function (payload) {
      if (window.IroncladAPI && typeof window.IroncladAPI._request === 'function' && getConfig('apiBaseUrl')) {
        return window.IroncladAPI._request('POST', '/v1/audit-leads', { body: payload });
      }
      return mock('audit-lead');
    },
    // Persist the chosen appointment slot.
    bookReview: function (payload) {
      if (window.IroncladAPI && typeof window.IroncladAPI._request === 'function' && getConfig('apiBaseUrl')) {
        return window.IroncladAPI._request('POST', '/v1/audit-bookings', { body: payload });
      }
      return mock('audit-booking');
    }
  };
  function getConfig(k) { return (window.IRONCLAD_CONFIG || {})[k]; }
  function mock(kind) {
    return new Promise(function (resolve) {
      setTimeout(function () {
        resolve({ id: 'mock_' + kind + '_' + Math.random().toString(36).slice(2, 9), status: 'received', mock: true });
      }, 850);
    });
  }

  /* ──────────────────────────────────────────────────────────────
     5. DOM REFS
  ────────────────────────────────────────────────────────────── */
  var $ = function (id) { return document.getElementById(id); };
  var questionPanesEl = $('questionPanes');
  var supportEl = $('fnlSupport');
  var controlsEl = $('fnlControls');
  var backBtn = $('backBtn');
  var nextBtn = $('nextBtn');
  var progressEl = $('fnlProgress');
  var stepLabel = $('fnlStepLabel');
  var barEl = $('fnlBar');
  var noteEl = $('fnlNote');
  var exitEl = $('fnlExit');

  /* ──────────────────────────────────────────────────────────────
     6. RENDER QUESTION PANES FROM CONFIG
  ────────────────────────────────────────────────────────────── */
  STEPS.forEach(function (step, i) {
    var pane = document.createElement('section');
    pane.className = 'pane qpane';
    pane.setAttribute('data-key', step.key);
    pane.setAttribute('aria-label', step.question);
    pane.hidden = true;

    var card = document.createElement('div');
    card.className = 'question-card';

    var q = document.createElement('h2');
    q.className = 'question-card__q';
    q.textContent = step.question;
    card.appendChild(q);

    if (step.sub) {
      var sub = document.createElement('p');
      sub.className = 'question-card__sub';
      sub.textContent = step.sub;
      card.appendChild(sub);
    }

    var list = document.createElement('div');
    list.className = 'answers';
    list.setAttribute('role', step.type === 'multi' ? 'group' : 'radiogroup');

    step.options.forEach(function (opt) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'answer' + (step.type === 'multi' ? ' answer--multi' : '');
      btn.setAttribute('aria-pressed', 'false');
      btn.setAttribute('data-value', opt.value);

      var marker = document.createElement('span');
      marker.className = 'answer__marker';
      marker.setAttribute('aria-hidden', 'true');

      var label = document.createElement('span');
      label.className = 'answer__label';
      label.textContent = opt.label;

      btn.appendChild(marker);
      btn.appendChild(label);
      btn.addEventListener('click', function () { onAnswer(step, opt.value, btn, list); });
      list.appendChild(btn);
    });
    card.appendChild(list);

    // Inline "Other" input
    if (step.other) {
      var otherWrap = document.createElement('div');
      otherWrap.className = 'answer-other';
      otherWrap.setAttribute('data-other-for', step.key);
      var otherInput = document.createElement('input');
      otherInput.type = 'text';
      otherInput.placeholder = step.other.label;
      otherInput.setAttribute('aria-label', step.other.label);
      otherInput.addEventListener('input', function () {
        answers[step.other.field] = otherInput.value.trim();
        updateNextState(step);
      });
      otherWrap.appendChild(otherInput);
      card.appendChild(otherWrap);
    }

    // Hint pill
    var hint = document.createElement('div');
    hint.className = 'hint';
    hint.setAttribute('data-hint-for', step.key);
    hint.setAttribute('role', 'status');
    hint.innerHTML = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M8 1l7 12H1L8 1z" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/><path d="M8 6v3.5M8 11.2v.1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg><span class="hint__text"></span>';
    card.appendChild(hint);

    pane.appendChild(card);
    questionPanesEl.appendChild(pane);

    // Persistent neutral helper (q2, q10)
    if (step.helper && step.helper.always) {
      setHint(step.key, step.helper);
    }
  });

  /* ──────────────────────────────────────────────────────────────
     7. ANSWER HANDLING
  ────────────────────────────────────────────────────────────── */
  function onAnswer(step, value, btn, list) {
    if (step.type === 'single') {
      // clear siblings
      list.querySelectorAll('.answer').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
      btn.setAttribute('aria-pressed', 'true');
      answers[step.field] = value;
    } else {
      var arr = answers[step.field];
      var idx = arr.indexOf(value);
      if (idx >= 0) { arr.splice(idx, 1); btn.setAttribute('aria-pressed', 'false'); }
      else { arr.push(value); btn.setAttribute('aria-pressed', 'true'); }
    }

    // Toggle the "Other" input
    if (step.other) {
      var selectedOther = step.type === 'single'
        ? value === 'other'
        : answers[step.field].indexOf('other') >= 0;
      var wrap = questionPanesEl.querySelector('[data-other-for="' + step.key + '"]');
      if (wrap) {
        var isOpen = step.type === 'single' ? selectedOther : selectedOther;
        wrap.classList.toggle('is-open', isOpen);
        if (!isOpen) { answers[step.other.field] = ''; wrap.querySelector('input').value = ''; }
        else { setTimeout(function () { wrap.querySelector('input').focus(); }, 60); }
      }
    }

    updateHint(step);
    updateNextState(step);
  }

  function updateHint(step) {
    // dynamic per-answer hint
    if (typeof step.hint === 'function') {
      var val = step.type === 'single' ? answers[step.field] : answers[step.field];
      var res = step.hint(val);
      if (res) { setHint(step.key, res); } else { clearHint(step.key); }
    }
    // helper that appears once answered (q10)
    if (step.helper && step.helper.whenAnswered) {
      if (isStepValid(step)) setHint(step.key, step.helper);
      else clearHint(step.key);
    }
  }

  function setHint(key, cfg) {
    var hint = questionPanesEl.querySelector('[data-hint-for="' + key + '"]');
    if (!hint) return;
    hint.querySelector('.hint__text').textContent = cfg.text;
    hint.classList.toggle('hint--neutral', cfg.tone === 'neutral');
    hint.classList.add('is-visible');
  }
  function clearHint(key) {
    var hint = questionPanesEl.querySelector('[data-hint-for="' + key + '"]');
    if (hint) hint.classList.remove('is-visible');
  }

  function isStepValid(step) {
    if (step.type === 'single') {
      if (!answers[step.field]) return false;
      if (answers[step.field] === 'other' && step.other) {
        return !!answers[step.other.field];
      }
      return true;
    }
    // multi
    if (answers[step.field].length === 0) return false;
    if (answers[step.field].indexOf('other') >= 0 && step.other) {
      return !!answers[step.other.field];
    }
    return true;
  }

  function updateNextState(step) {
    nextBtn.disabled = !isStepValid(step);
  }

  /* ──────────────────────────────────────────────────────────────
     8. NAVIGATION
  ────────────────────────────────────────────────────────────── */
  function stepConfigFor(key) {
    for (var i = 0; i < STEPS.length; i++) { if (STEPS[i].key === key) return STEPS[i]; }
    return null;
  }

  function showPane(key) {
    var prev = document.querySelector('.pane.is-active');
    if (prev) { prev.classList.remove('is-active'); prev.hidden = true; }
    var next = document.querySelector('.pane[data-key="' + key + '"]');
    if (!next) return;
    next.hidden = false;
    // force reflow so the enter animation replays
    void next.offsetWidth;
    next.classList.add('is-active');
    current = key;
    updateChrome(key);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateChrome(key) {
    var idx = FLOW.indexOf(key);
    var step = stepConfigFor(key);
    var isQuestion = !!step;

    // Header note vs exit
    noteEl.hidden = key !== 'landing';
    exitEl.hidden = key === 'landing';

    // Progress + label
    if (key === 'landing') {
      progressEl.hidden = true;
    } else {
      progressEl.hidden = false;
      if (isQuestion) {
        var n = STEPS.indexOf(step) + 1;
        var total = STEPS.length;
        stepLabel.textContent = 'Step ' + n + ' of ' + total;
        progressEl.classList.remove('fnl-progress--hidden-track');
        barEl.style.width = (n / total * 100) + '%';
      } else {
        progressEl.classList.add('fnl-progress--hidden-track');
        barEl.style.width = '100%';
        if (key === 'contact') stepLabel.textContent = 'Your Estimate Is Ready';
        else if (key === 'results') stepLabel.textContent = 'Your Estimate';
        else if (key === 'calendar') stepLabel.textContent = 'Last Step';
        else if (key === 'success') { progressEl.hidden = true; }
      }
    }

    // Support panel — question steps only
    supportEl.hidden = !isQuestion;

    // Controls — question steps only
    controlsEl.hidden = !isQuestion;
    if (isQuestion) {
      backBtn.hidden = (STEPS.indexOf(step) === 0); // hide on first question
      nextBtn.disabled = !isStepValid(step);
      var label = (STEPS.indexOf(step) === STEPS.length - 1) ? 'Continue' : 'Next';
      setBtnLabel(nextBtn, label);
    }
  }

  function setBtnLabel(btn, text) {
    // preserve trailing arrow svg, replace leading text node
    var svg = btn.querySelector('svg');
    btn.textContent = text + ' ';
    if (svg) btn.appendChild(svg);
  }

  function goNext() {
    var step = stepConfigFor(current);
    if (step) {
      if (!isStepValid(step)) return;
      var idx = STEPS.indexOf(step);
      if (idx < STEPS.length - 1) { showPane(STEPS[idx + 1].key); }
      else { showPane('contact'); }   // after q10 → contact gate
    }
  }

  function goBack() {
    var idx = FLOW.indexOf(current);
    if (idx > 0) {
      var prevKey = FLOW[idx - 1];
      showPane(prevKey);
      // restore Next button validity for the step we land on
      var step = stepConfigFor(prevKey);
      if (step) updateNextState(step);
    }
  }

  $('startAuditBtn').addEventListener('click', function () { showPane('q1'); });
  nextBtn.addEventListener('click', goNext);
  backBtn.addEventListener('click', goBack);

  /* ──────────────────────────────────────────────────────────────
     9. CONTACT GATE (pane 11)
  ────────────────────────────────────────────────────────────── */
  var contactForm = $('contactForm');
  var contactSubmit = $('contactSubmit');
  var contactStatus = $('contactStatus');

  contactForm.addEventListener('submit', function (e) {
    e.preventDefault();
    clearContactErrors();

    // honeypot
    if (contactForm.elements['company_url'] && contactForm.elements['company_url'].value.trim()) {
      proceedToResults();
      return;
    }

    var errs = validateContact();
    if (errs.length) { showContactErrors(errs); return; }

    // collect
    answers.fullName = val('fullName');
    answers.businessName = val('businessName');
    answers.phone = val('phone');
    answers.email = val('email').toLowerCase();
    answers.websiteUrl = val('websiteUrl');
    answers.serviceArea = val('serviceArea');
    answers.smsConsent = !!contactForm.elements['smsConsent'].checked;

    calculateEstimate();

    contactSubmit.classList.add('is-loading');
    contactSubmit.disabled = true;

    Audit.saveLead(buildLeadPayload())
      .then(function () { leadSaved = true; proceedToResults(); })
      .catch(function () {
        // Lead capture is the priority — even on a transient error we
        // still show the estimate so the user isn't blocked. The lead
        // payload is preserved in `answers` for a retry server-side.
        leadSaved = true;
        proceedToResults();
      })
      .then(function () {
        contactSubmit.classList.remove('is-loading');
        contactSubmit.disabled = false;
      });
  });

  function val(name) {
    var el = contactForm.elements[name];
    return el ? el.value.trim() : '';
  }

  function validateContact() {
    var errs = [];
    [['fullName', 'Enter your name.'], ['businessName', 'Enter your business name.'],
     ['phone', 'Enter your phone number.'], ['email', 'Enter your email.'],
     ['serviceArea', 'Enter your city or service area.']].forEach(function (pair) {
      if (!val(pair[0])) errs.push({ name: pair[0], message: pair[1] });
    });
    var email = val('email');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.push({ name: 'email', message: 'Enter a valid email.' });
    var phone = val('phone');
    if (phone && phone.replace(/\D/g, '').length < 10) errs.push({ name: 'phone', message: 'Enter a valid phone number.' });
    return errs;
  }

  function showContactErrors(errs) {
    errs.forEach(function (e) {
      var input = contactForm.elements[e.name];
      if (!input) return;
      var field = input.closest('.field');
      if (!field) return;
      field.classList.add('has-error');
      var msg = document.createElement('div');
      msg.className = 'field__error';
      msg.textContent = e.message;
      field.appendChild(msg);
    });
    contactStatus.textContent = 'Please fix the highlighted fields.';
    contactStatus.dataset.type = 'error';
    contactStatus.classList.add('is-visible');
    var first = contactForm.querySelector('.has-error input');
    if (first) first.focus();
  }

  function clearContactErrors() {
    contactStatus.classList.remove('is-visible');
    contactStatus.textContent = '';
    contactForm.querySelectorAll('.field.has-error').forEach(function (f) { f.classList.remove('has-error'); });
    contactForm.querySelectorAll('.field__error').forEach(function (m) { m.remove(); });
  }

  function proceedToResults() {
    renderResults();
    renderSummary();
    showPane('results');
  }

  /* ──────────────────────────────────────────────────────────────
     10. RESULTS + SUMMARY RENDERING
  ────────────────────────────────────────────────────────────── */
  function leftOnTableRange() {
    return fmtMoney(answers.estimatedRevenueLeftLow) + ' – ' + fmtMoney(answers.estimatedRevenueLeftHigh);
  }
  function extraJobsRange() {
    return fmtJobs(answers.potentialExtraJobsLow) + ' – ' + fmtJobs(answers.potentialExtraJobsHigh);
  }

  function renderResults() {
    $('resultsAmount').textContent = leftOnTableRange();
    $('metricRevenue').textContent = fmtRevenue(answers.currentEstimatedLeadRevenue) + ' / month';
    $('metricJobs').textContent = extraJobsRange() + ' / month';
    $('metricImprovement').textContent = '+' + Math.round(answers.improvementLow * 100) + '% – +' + Math.round(answers.improvementHigh * 100) + '%';
  }

  var TRADE_LABEL = { electrical: 'Electrical', hvac: 'HVAC', plumbing: 'Plumbing', roofing: 'Roofing', remodeling: 'Remodeling / GC', other: 'Other' };
  var SOURCE_LABEL = { google: 'Google Search', yelp: 'Yelp / Angi', referrals: 'Referrals', social: 'Facebook / IG', paid: 'Paid ads', other: 'Other' };
  var LEAK_LABEL = { 'missed-calls': 'Missed calls', 'slow-replies': 'Slow replies', 'no-followup': 'No follow-up', 'website': 'Website booking', 'low-quality': 'Lead quality', 'other': 'Other' };

  function renderSummary() {
    $('sumRisk').textContent = leftOnTableRange() + '/mo';
    $('sumRevenue').textContent = fmtRevenue(answers.currentEstimatedLeadRevenue) + '/mo';
    $('sumJobs').textContent = extraJobsRange() + '/mo';
    var leak = answers.biggestLeaks[0];
    $('sumLeak').textContent = leak ? (LEAK_LABEL[leak] || 'See report') : 'See report';
    $('sumTrade').textContent = answers.businessType === 'other'
      ? (answers.businessTypeOther || 'Other')
      : (TRADE_LABEL[answers.businessType] || '—');
    var src = answers.leadSources[0];
    $('sumSource').textContent = src ? (SOURCE_LABEL[src] || 'Other') : '—';
  }

  function goToBooking() {
    // Keep the summary visible by default; it can still collapse.
    $('summaryCard').open = true;
    showPane('calendar');
  }
  $('toBookingBtn').addEventListener('click', goToBooking);
  $('toBookingBtnTop').addEventListener('click', goToBooking);

  /* ──────────────────────────────────────────────────────────────
     11. CALENDAR (pane 13)
  ────────────────────────────────────────────────────────────── */
  var calGrid = $('calGrid');
  var calMonth = $('calMonth');
  var calPrev = $('calPrev');
  var calNext = $('calNext');
  var slotsEl = $('slots');
  var slotsGrid = $('slotsGrid');
  var slotsLabel = $('slotsLabel');
  var confirmBtn = $('confirmBookingBtn');
  var bookingStatus = $('bookingStatus');

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var TIME_SLOTS = ['9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'];
  var viewYear, viewMonth;

  function startOfDay(d) { var x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
  var today = startOfDay(new Date());

  function initCalendar() {
    viewYear = today.getFullYear();
    viewMonth = today.getMonth();
    renderCalendar();
  }

  function renderCalendar() {
    calMonth.textContent = MONTHS[viewMonth] + ' ' + viewYear;
    calGrid.innerHTML = '';

    var first = new Date(viewYear, viewMonth, 1);
    var startDow = first.getDay();
    var daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    // disable prev if viewing current month
    calPrev.disabled = (viewYear === today.getFullYear() && viewMonth === today.getMonth());

    for (var b = 0; b < startDow; b++) {
      var empty = document.createElement('div');
      empty.className = 'cal__day is-empty';
      calGrid.appendChild(empty);
    }

    for (var d = 1; d <= daysInMonth; d++) {
      var date = startOfDay(new Date(viewYear, viewMonth, d));
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cal__day';
      btn.textContent = d;

      var dow = date.getDay();
      var isPast = date < today;
      var isWeekend = (dow === 0 || dow === 6);
      if (isPast || isWeekend) {
        btn.disabled = true;
      } else {
        (function (dt, el) {
          el.addEventListener('click', function () { selectDate(dt, el); });
        })(date, btn);
      }
      if (booking.date && date.getTime() === booking.date.getTime()) btn.classList.add('is-selected');
      calGrid.appendChild(btn);
    }
  }

  function selectDate(date, el) {
    booking.date = date;
    booking.time = null;
    calGrid.querySelectorAll('.cal__day').forEach(function (b) { b.classList.remove('is-selected'); });
    el.classList.add('is-selected');
    renderSlots();
    validateBooking();
  }

  function renderSlots() {
    slotsEl.hidden = false;
    var wd = booking.date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    slotsLabel.textContent = 'Pick a time — ' + wd;
    slotsGrid.innerHTML = '';
    TIME_SLOTS.forEach(function (t) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'slot';
      btn.textContent = t;
      btn.addEventListener('click', function () {
        booking.time = t;
        slotsGrid.querySelectorAll('.slot').forEach(function (s) { s.classList.remove('is-selected'); });
        btn.classList.add('is-selected');
        validateBooking();
      });
      slotsGrid.appendChild(btn);
    });
  }

  function validateBooking() {
    confirmBtn.disabled = !(booking.date && booking.time);
  }

  calPrev.addEventListener('click', function () {
    if (calPrev.disabled) return;
    viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; }
    renderCalendar();
  });
  calNext.addEventListener('click', function () {
    viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    renderCalendar();
  });

  confirmBtn.addEventListener('click', function () {
    if (!(booking.date && booking.time)) return;
    confirmBtn.classList.add('is-loading');
    confirmBtn.disabled = true;
    Audit.bookReview(buildBookingPayload())
      .then(function () { showSuccess(); })
      .catch(function () {
        bookingStatus.textContent = 'Something went wrong. Please try again.';
        bookingStatus.dataset.type = 'error';
        bookingStatus.classList.add('is-visible');
      })
      .then(function () {
        confirmBtn.classList.remove('is-loading');
        confirmBtn.disabled = false;
      });
  });

  function showSuccess() {
    $('succDate').textContent = booking.date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    $('succTime').textContent = booking.time;
    showPane('success');
  }

  /* ──────────────────────────────────────────────────────────────
     12. PAYLOAD BUILDERS  (stable backend contract)
  ────────────────────────────────────────────────────────────── */
  function buildLeadPayload() {
    return {
      contact: {
        fullName: answers.fullName,
        businessName: answers.businessName,
        phone: answers.phone,
        email: answers.email,
        websiteUrl: answers.websiteUrl || null,
        serviceArea: answers.serviceArea
      },
      audit: {
        businessType: answers.businessType,
        businessTypeOther: answers.businessTypeOther || null,
        leadSources: answers.leadSources,
        leadSourceOther: answers.leadSourceOther || null,
        monthlyLeadVolumeRange: answers.monthlyLeadVolumeRange,
        adSpendRange: answers.adSpendRange,
        averageJobValueRange: answers.averageJobValueRange,
        currentBookedJobRateRange: answers.currentBookedJobRateRange,
        currentBookedJobRateOther: answers.currentBookedJobRateOther || null,
        responseSpeed: answers.responseSpeed,
        responseSpeedOther: answers.responseSpeedOther || null,
        missedCallsRange: answers.missedCallsRange,
        followupProcess: answers.followupProcess,
        followupOther: answers.followupOther || null,
        leadTrackingMethod: answers.leadTrackingMethod,
        biggestLeaks: answers.biggestLeaks,
        biggestLeakOther: answers.biggestLeakOther || null
      },
      estimate: {
        revenueLeftLow: answers.estimatedRevenueLeftLow,
        revenueLeftHigh: answers.estimatedRevenueLeftHigh,
        currentLeadRevenue: Math.round(answers.currentEstimatedLeadRevenue),
        currentBookedJobRate: answers.currentBookedJobRate,
        currentBookedJobs: Math.round(answers.currentBookedJobs * 10) / 10,
        potentialExtraJobsLow: Math.round(answers.potentialExtraJobsLow * 10) / 10,
        potentialExtraJobsHigh: Math.round(answers.potentialExtraJobsHigh * 10) / 10,
        improvementLow: answers.improvementLow,
        improvementHigh: answers.improvementHigh,
        leakScore: answers.leakScore,
        paidOpportunityWasteLow: answers.estimatedPaidOpportunityWasteLow,
        paidOpportunityWasteHigh: answers.estimatedPaidOpportunityWasteHigh
      },
      consent: {
        smsConsent: answers.smsConsent,
        timestamp: new Date().toISOString()
      },
      meta: {
        source: 'free-audit',
        page: location.pathname,
        referrer: document.referrer || null,
        submittedAt: new Date().toISOString()
      }
    };
  }

  function buildBookingPayload() {
    var p = buildLeadPayload();
    p.appointment = {
      date: booking.date.toISOString().slice(0, 10),
      time: booking.time
    };
    p.meta.source = 'free-audit-booking';
    return p;
  }

  /* ──────────────────────────────────────────────────────────────
     13. INIT
  ────────────────────────────────────────────────────────────── */
  initCalendar();
  updateChrome('landing');

  // Keyboard: Enter advances on question panes when valid
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    var step = stepConfigFor(current);
    if (step && document.activeElement && document.activeElement.tagName !== 'INPUT' && !nextBtn.disabled) {
      goNext();
    }
  });
})();
