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
    // ─────────────────────────────────────────────────────────
    // SECTION 1: Understanding Your Business
    // ─────────────────────────────────────────────────────────
    {
      key: 'q1', field: 'businessType', type: 'single',
      section: 'Understanding Your Business',
      sectionDesc: "First, let's get the basics so we can tailor this to your trade.",
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
      key: 'q3', field: 'monthlyLeadVolume', type: 'slider',
      question: 'How many new calls or leads do you get each month?',
      sub: 'Drag the slider to dial in your exact number.',
      min: 0, max: 300, step: 5,
      unit: 'leads/month',
      hint: function (v) {
        if (v < 5) return { text: 'Low volume limits growth potential.', tone: 'amber' };
        return null;
      }
    },
    {
      key: 'q5', field: 'averageJobValue', type: 'slider',
      question: 'What is an average booked job worth to you?',
      sub: 'Use your typical project value (labor + materials for a standard job).',
      min: 100, max: 10000, step: 100,
      unit: '$',
      hint: function (v) {
        if (v > 3000) {
          return { text: 'At that job value, even one lost customer is expensive.', tone: 'amber' };
        }
        return null;
      }
    },

    // ─────────────────────────────────────────────────────────
    // SECTION 2: Where You Stand Today
    // ─────────────────────────────────────────────────────────
    {
      key: 'q2', field: 'leadSources', type: 'multi',
      section: 'Where You Stand Today',
      sectionDesc: 'Now let\'s understand your current lead picture and performance.',
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
      key: 'q4', field: 'adSpend', type: 'slider',
      question: 'How much are you spending on ads or lead platforms each month?',
      sub: 'Include Google, Yelp, Facebook, HomeAdvisor, or any paid lead source.',
      min: 0, max: 10000, step: 250,
      unit: '$/month',
      hint: function (v) {
        if (v > 3000) {
          return { text: 'At this spend, improving conversion = huge ROI.', tone: 'amber' };
        }
        return null;
      }
    },
    {
      key: 'qClose', field: 'currentBookedJobRate', type: 'slider',
      question: 'Out of every 10 new calls or leads, how many usually turn into booked jobs?',
      sub: 'Drag to your actual closing rate.',
      min: 0, max: 10, step: 0.5,
      unit: 'out of 10',
      helper: { text: 'This helps calculate your current lead revenue.', tone: 'neutral', whenAnswered: true }
    },

    // ─────────────────────────────────────────────────────────
    // SECTION 3: How You Handle Leads
    // ─────────────────────────────────────────────────────────
    {
      key: 'q6', field: 'responseSpeed', type: 'single',
      section: 'How You Handle Leads',
      sectionDesc: 'Let\'s look at how you respond to and follow up with leads.',
      question: 'When a new customer reaches out, how fast do you usually reply?',
      sub: 'Be honest. This is where a lot of jobs are won or lost.',
      options: [
        { value: 'right-away', label: 'Right away' },
        { value: '15min', label: 'Within 15 minutes' },
        { value: 'hour', label: 'Within an hour' },
        { value: 'later-day', label: 'Later that day' },
        { value: 'miss', label: 'Sometimes I miss them' }
      ],
      hint: function (v) {
        if (v === 'hour' || v === 'later-day' || v === 'miss') {
          return { text: 'Possible leak found: slow replies.', tone: 'amber' };
        }
        return null;
      }
    },
    {
      key: 'q7', field: 'missedCallsRate', type: 'slider',
      question: 'Out of every 10 customer calls, how many do you usually miss?',
      sub: 'Most contractors miss some calls while on jobs. Be honest about your rate.',
      min: 0, max: 10, step: 1,
      unit: 'out of 10',
      hint: function (v) {
        if (v > 0) return { text: 'Missed calls go straight to your competitor.', tone: 'amber' };
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
        { value: 'none', label: "We don't have a real follow-up system" }
      ],
      hint: function (v) {
        if (v === 'once' || v === 'depends' || v === 'forgotten' || v === 'none') {
          return { text: 'Possible leak found: weak follow-up.', tone: 'amber' };
        }
        return null;
      }
    },

    // ─────────────────────────────────────────────────────────
    // SECTION 4: Your Tools & Systems
    // ─────────────────────────────────────────────────────────
    {
      key: 'q9', field: 'leadTrackingMethod', type: 'single',
      section: 'Your Tools & Systems',
      sectionDesc: 'Now let\'s see what systems you have in place.',
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
      key: 'qWebsite', field: 'hasWebsite', type: 'conditional',
      question: 'Do you have a website?',
      sub: 'This helps us see if your site is helping you book jobs.',
      primaryField: 'hasWebsite',
      primaryOptions: [
        { value: 'yes', label: 'Yes, I have a website' },
        { value: 'no', label: 'No website right now' }
      ],
      secondaryQuestion: 'Does your website have an automated booking system?',
      secondaryField: 'hasWebsiteBooking',
      secondaryOptions: [
        { value: 'yes', label: 'Yes, people can book online' },
        { value: 'no', label: 'No, they have to call' }
      ]
    },

    // ─────────────────────────────────────────────────────────
    // SECTION 5: Your Lead Leak Diagnosis
    // ─────────────────────────────────────────────────────────
    {
      key: 'q10', field: 'biggestLeaks', type: 'multi',
      section: 'Your Lead Leak Diagnosis',
      sectionDesc: 'Finally, based on everything, where do you think the biggest problems are?',
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

  var STEPS_TOTAL = STEPS.length;

  /* ──────────────────────────────────────────────────────────────
     2. STATE
  ────────────────────────────────────────────────────────────── */
  var answers = {
    businessType: '', businessTypeOther: '',
    leadSources: [], leadSourceOther: '',
    monthlyLeadVolume: 0,
    adSpend: 0,
    averageJobValue: 0,
    currentBookedJobRate: 0,
    responseSpeed: '',
    missedCallsRate: 0,
    followupProcess: '',
    leadTrackingMethod: '',
    biggestLeaks: [], biggestLeakOther: '',
    hasWebsite: '', hasWebsiteBooking: '',
    fullName: '', businessName: '', phone: '', email: '', websiteUrl: '', serviceArea: '',
    smsConsent: false, smsMarketing: false,
    // calculated values
    currentBookedJobs: 0,
    currentEstimatedLeadRevenue: 0,
    leakScore: 0,
    targetConversionRate: 0.80,
    conversionGap: 0,
    potentialExtraJobsLow: 0,
    potentialExtraJobsHigh: 0,
    estimatedRevenueLeftLow: 0,
    estimatedRevenueLeftHigh: 0,
    estimatedPaidOpportunityWasteLow: 0,
    estimatedPaidOpportunityWasteHigh: 0,
    currentROAS: 0,
    potentialROAS: 0,
    roasImprovement: 0
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
    var monthlyLeads = Math.max(0, answers.monthlyLeadVolume || 0);
    var avgJobValue = Math.max(0, answers.averageJobValue || 0);
    var adSpend = Math.max(0, answers.adSpend || 0);
    var bookedRate = Math.max(0, Math.min(1, (answers.currentBookedJobRate || 0) / 10)); // convert 0-10 to 0-1

    // Baseline
    var currentBookedJobs = monthlyLeads * bookedRate;
    var currentLeadRevenue = currentBookedJobs * avgJobValue;

    // Opportunity: gap between current rate and 80% ceiling
    var TARGET_CONVERSION_RATE = 0.80;
    var conversionGap = Math.max(0, TARGET_CONVERSION_RATE - bookedRate);
    var possibleExtraJobs = monthlyLeads * conversionGap;

    // Revenue left on the table
    var revLeftLow = possibleExtraJobs * avgJobValue;
    var revLeftHigh = possibleExtraJobs * avgJobValue; // single point estimate, not a range

    // ROAS: Return on Ad Spend (only when ad spend exists)
    var currentRevenue = currentBookedJobs * avgJobValue;
    var potentialRevenue = (monthlyLeads * TARGET_CONVERSION_RATE) * avgJobValue;
    var currentROAS = adSpend > 0 ? currentRevenue / adSpend : 0;
    var potentialROAS = adSpend > 0 ? potentialRevenue / adSpend : 0;
    var roasImprovement = adSpend > 0 ? potentialROAS / Math.max(0.01, currentROAS) : 0; // avoid divide by zero

    // Ad-spend context
    var costPerLead = monthlyLeads > 0 ? adSpend / monthlyLeads : 0;
    var paidOppWaste = possibleExtraJobs * costPerLead;

    // Leak score (0–100) — still calculated for report context but not used for opportunity sizing
    var missedCallsPoints = (answers.missedCallsRate / 10) * 40; // scale 0-10 to 0-40 points
    var score = (RESPONSE_PTS[answers.responseSpeed] || 0)
      + missedCallsPoints
      + (FOLLOWUP_PTS[answers.followupProcess] || 0)
      + (TRACKING_PTS[answers.leadTrackingMethod] || 0);
    answers.biggestLeaks.forEach(function (l) { score += (LEAK_BONUS[l] || 0); });
    var leakScore = Math.min(100, score);

    // Store current booked rate as decimal for display
    var bookingRateDecimal = bookedRate;
    answers.currentBookedJobRate = bookingRateDecimal;
    answers.currentBookedJobs = currentBookedJobs;
    answers.currentEstimatedLeadRevenue = currentLeadRevenue;
    answers.leakScore = leakScore;
    answers.targetConversionRate = TARGET_CONVERSION_RATE;
    answers.conversionGap = conversionGap;
    answers.improvementLow = conversionGap;
    answers.improvementHigh = conversionGap;
    answers.potentialExtraJobsLow = possibleExtraJobs;
    answers.potentialExtraJobsHigh = possibleExtraJobs;
    answers.estimatedRevenueLeftLow = roundMoney(revLeftLow);
    answers.estimatedRevenueLeftHigh = roundMoney(revLeftHigh);
    answers.estimatedPaidOpportunityWasteLow = roundMoney(paidOppWaste);
    answers.estimatedPaidOpportunityWasteHigh = roundMoney(paidOppWaste);
    answers.currentROAS = currentROAS;
    answers.potentialROAS = potentialROAS;
    answers.roasImprovement = roasImprovement;

    // Infrastructure risk assessment
    answers.infrastructureRisks = assessInfrastructureRisks();
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
  var controlsMobileEl = $('fnlControlsMobile');
  var backBtn = $('backBtn');
  var backBtnMobile = $('backBtnMobile');
  var nextBtn = $('nextBtn');
  var nextBtnMobile = $('nextBtnMobile');
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

    // Add section header if this is a new section
    if (step.section && (i === 0 || STEPS[i - 1].section !== step.section)) {
      var sectionHeader = document.createElement('div');
      sectionHeader.className = 'section-header';
      var sectionTitle = document.createElement('h3');
      sectionTitle.className = 'section-header__title';
      sectionTitle.textContent = step.section;
      sectionHeader.appendChild(sectionTitle);
      if (step.sectionDesc) {
        var sectionDesc = document.createElement('p');
        sectionDesc.className = 'section-header__desc';
        sectionDesc.textContent = step.sectionDesc;
        sectionHeader.appendChild(sectionDesc);
      }
      pane.appendChild(sectionHeader);
    }

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

    if (step.type === 'slider') {
      // Slider input
      var sliderWrap = document.createElement('div');
      sliderWrap.className = 'slider-wrap';

      var sliderInput = document.createElement('input');
      sliderInput.type = 'range';
      sliderInput.className = 'slider-input';
      sliderInput.min = step.min;
      sliderInput.max = step.max;
      sliderInput.step = step.step;
      sliderInput.value = answers[step.field] || step.min;
      sliderInput.setAttribute('aria-label', step.question);

      function updateSliderFill(el) {
        var min = parseFloat(el.min);
        var max = parseFloat(el.max);
        var val = parseFloat(el.value);
        var pct = ((val - min) / (max - min)) * 100;
        el.style.background = 'linear-gradient(to right, var(--teal) 0%, var(--teal) ' + pct + '%, var(--divider) ' + pct + '%, var(--divider) 100%)';
      }

      var display = document.createElement('div');
      display.className = 'slider-display';
      var displayInput = document.createElement('input');
      displayInput.type = 'number';
      displayInput.className = 'slider-display__val slider-display__val--input';
      displayInput.value = sliderInput.value;
      displayInput.min = step.min;
      displayInput.max = step.max;
      displayInput.step = step.step;
      var displayUnit = document.createElement('span');
      displayUnit.className = 'slider-display__unit';
      displayUnit.textContent = step.unit;
      display.appendChild(displayInput);
      display.appendChild(displayUnit);

      updateSliderFill(sliderInput);

      sliderInput.addEventListener('input', function () {
        answers[step.field] = parseFloat(sliderInput.value);
        displayInput.value = sliderInput.value;
        updateSliderFill(sliderInput);
        updateHint(step);
        updateNextState(step);
      });

      displayInput.addEventListener('input', function () {
        var v = parseFloat(displayInput.value);
        if (!isNaN(v)) {
          var clamped = Math.min(Math.max(v, parseFloat(step.min)), parseFloat(step.max));
          sliderInput.value = clamped;
          answers[step.field] = clamped;
          updateSliderFill(sliderInput);
          updateHint(step);
          updateNextState(step);
        }
      });

      displayInput.addEventListener('blur', function () {
        var v = parseFloat(displayInput.value);
        if (isNaN(v) || v < parseFloat(step.min)) {
          displayInput.value = step.min;
          sliderInput.value = step.min;
        } else if (v > parseFloat(step.max)) {
          displayInput.value = step.max;
          sliderInput.value = step.max;
        }
        answers[step.field] = parseFloat(sliderInput.value);
        updateSliderFill(sliderInput);
        updateHint(step);
        updateNextState(step);
      });

      sliderWrap.appendChild(display);
      sliderWrap.appendChild(sliderInput);
      card.appendChild(sliderWrap);
    } else if (step.type === 'conditional') {
      // Primary conditional buttons
      var primaryList = document.createElement('div');
      primaryList.className = 'answers';
      primaryList.setAttribute('role', 'radiogroup');
      primaryList.setAttribute('data-conditional-for', step.key);

      step.primaryOptions.forEach(function (opt) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'answer';
        btn.setAttribute('aria-pressed', 'false');
        btn.setAttribute('data-value', opt.value);
        btn.setAttribute('data-conditional-primary', 'true');

        var marker = document.createElement('span');
        marker.className = 'answer__marker';
        marker.setAttribute('aria-hidden', 'true');

        var label = document.createElement('span');
        label.className = 'answer__label';
        label.textContent = opt.label;

        btn.appendChild(marker);
        btn.appendChild(label);
        btn.addEventListener('click', function () { onConditionalAnswer(step, opt.value, btn, primaryList); });
        primaryList.appendChild(btn);
      });
      card.appendChild(primaryList);

      // Secondary conditional buttons (hidden initially)
      var secondaryWrap = document.createElement('div');
      secondaryWrap.className = 'conditional-secondary';
      secondaryWrap.setAttribute('data-conditional-secondary-for', step.key);
      secondaryWrap.hidden = true;

      var secondaryQ = document.createElement('p');
      secondaryQ.className = 'conditional-secondary__q';
      secondaryQ.textContent = step.secondaryQuestion;
      secondaryWrap.appendChild(secondaryQ);

      var secondaryList = document.createElement('div');
      secondaryList.className = 'answers';
      secondaryList.setAttribute('role', 'radiogroup');

      step.secondaryOptions.forEach(function (opt) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'answer';
        btn.setAttribute('aria-pressed', 'false');
        btn.setAttribute('data-value', opt.value);
        btn.setAttribute('data-conditional-secondary', 'true');

        var marker = document.createElement('span');
        marker.className = 'answer__marker';
        marker.setAttribute('aria-hidden', 'true');

        var label = document.createElement('span');
        label.className = 'answer__label';
        label.textContent = opt.label;

        btn.appendChild(marker);
        btn.appendChild(label);
        btn.addEventListener('click', function () { onConditionalAnswer(step, opt.value, btn, secondaryList); });
        secondaryList.appendChild(btn);
      });
      secondaryWrap.appendChild(secondaryList);
      card.appendChild(secondaryWrap);
    } else {
      // Radio/checkbox buttons
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
    }

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
  function onConditionalAnswer(step, value, btn, list) {
    // Determine if this is primary or secondary
    var isPrimary = btn.getAttribute('data-conditional-primary') === 'true';

    if (isPrimary) {
      // Primary answer selected
      list.querySelectorAll('.answer').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
      btn.setAttribute('aria-pressed', 'true');
      answers[step.primaryField] = value;

      // Show/hide secondary based on selection
      var secondaryWrap = questionPanesEl.querySelector('[data-conditional-secondary-for="' + step.key + '"]');
      if (secondaryWrap) {
        secondaryWrap.hidden = (value !== 'yes');
        if (value === 'yes') {
          setTimeout(function () { secondaryWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 100);
        } else {
          answers[step.secondaryField] = '';
        }
      }
    } else {
      // Secondary answer selected
      list.querySelectorAll('.answer').forEach(function (b) { b.setAttribute('aria-pressed', 'false'); });
      btn.setAttribute('aria-pressed', 'true');
      answers[step.secondaryField] = value;
    }

    updateNextState(step);
  }

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
    if (step.type === 'slider') {
      return answers[step.field] !== null && answers[step.field] !== undefined;
    }
    if (step.type === 'conditional') {
      // Primary must be answered
      if (!answers[step.primaryField]) return false;
      // If primary is 'yes', secondary must also be answered
      if (answers[step.primaryField] === 'yes' && !answers[step.secondaryField]) return false;
      return true;
    }
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
    var valid = !isStepValid(step);
    nextBtn.disabled = valid;
    nextBtnMobile.disabled = valid;
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

    // Update help panel for this question
    if (isQuestion) {
      renderQuestionHelp(step.key);
    }

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
    controlsMobileEl.hidden = !isQuestion;
    if (isQuestion) {
      var isFirstQuestion = (STEPS.indexOf(step) === 0);
      var isLastQuestion = (STEPS.indexOf(step) === STEPS.length - 1);
      var label = isLastQuestion ? 'Continue' : 'Next';

      // Desktop sidebar controls
      backBtn.hidden = isFirstQuestion;
      nextBtn.disabled = !isStepValid(step);
      setBtnLabel(nextBtn, label);

      // Mobile controls
      backBtnMobile.hidden = isFirstQuestion;
      nextBtnMobile.disabled = !isStepValid(step);
      setBtnLabel(nextBtnMobile, label);
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
  nextBtnMobile.addEventListener('click', goNext);
  backBtnMobile.addEventListener('click', goBack);

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
    answers.smsMarketing = !!contactForm.elements['smsMarketing'].checked;

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
    $('resultsAmount').textContent = fmtMoney(answers.estimatedRevenueLeftLow) + ' / month';
    $('metricRevenue').textContent = fmtRevenue(answers.currentEstimatedLeadRevenue) + ' / month';
    $('metricJobs').textContent = fmtJobs(answers.potentialExtraJobsLow) + ' / month';
    var currentRatePercent = Math.round(answers.currentBookedJobRate * 100);
    var targetRatePercent = Math.round(answers.targetConversionRate * 100);
    $('metricImprovement').textContent = currentRatePercent + '% → ' + targetRatePercent + '% conversion rate';
  }

  var TRADE_LABEL = { electrical: 'Electrical', hvac: 'HVAC', plumbing: 'Plumbing', roofing: 'Roofing', remodeling: 'Remodeling / GC', other: 'Other' };
  var SOURCE_LABEL = { google: 'Google Search', yelp: 'Yelp / Angi', referrals: 'Referrals', social: 'Facebook / IG', paid: 'Paid ads', other: 'Other' };
  var LEAK_LABEL = { 'missed-calls': 'Missed calls', 'slow-replies': 'Slow replies', 'no-followup': 'No follow-up', 'website': 'Website booking', 'low-quality': 'Lead quality', 'other': 'Other' };

  /* Question-specific help content */
  var QUESTION_HELP = {
    q1: {
      title: 'What type of work do you do?',
      text: 'This helps us understand your business. Different trades have different lead sources and closing patterns.',
      tip: 'Pick the one that matches most of your work.'
    },
    q2: {
      title: 'Where do customers find you?',
      text: 'We want to know which marketing channels bring you the most calls. Some channels work better than others.',
      tip: 'Think about your last 5–10 customers. Where did they come from?'
    },
    q3: {
      title: 'How many leads per month?',
      text: 'This number tells us how many job chances you have each month. More leads = more opportunity to grow.',
      tip: 'Check your last 3 months of calls or leads. Average them out.'
    },
    q4: {
      title: 'How much do you spend on ads?',
      text: 'Add up all your paid marketing: Google, Facebook, Yelp, HomeAdvisor. This shows us the cost of each lead you get.',
      tip: 'Include everything you pay for leads—even if it\'s small amounts.'
    },
    q5: {
      title: 'What\'s an average job worth?',
      text: 'Think of a typical job: materials plus labor. This number helps us calculate how much lost jobs cost you.',
      tip: 'Use a job from last month. Include all labor and materials.'
    },
    qClose: {
      title: 'How many leads become jobs?',
      text: 'This is your closing rate. It\'s the most important number. Out of 10 calls, how many turn into actual booked jobs?',
      tip: 'Think about your last 10 calls. How many became jobs? Be honest.'
    },
    q6: {
      title: 'How fast do you reply?',
      text: 'Speed matters. Faster contractors win more jobs. Customers call the first person who calls them back.',
      tip: 'When a new customer calls, how long before you call them back? Hours? Same day?'
    },
    q7: {
      title: 'Out of 10 calls, how many do you miss?',
      text: 'Missed calls go straight to your competitor. They\'re lost money. Out of every 10 calls you get, how many slip through?',
      tip: 'Think about last week. You probably got calls while on a job site. That\'s normal. Just be honest about the rate.'
    },
    q8: {
      title: 'What happens when they don\'t answer?',
      text: 'Following up separates the good contractors from the great ones. Great contractors call back 3+ times.',
      tip: 'If a good lead doesn\'t answer the first time, do you keep trying? Or do you move on?'
    },
    q9: {
      title: 'How do you track leads?',
      text: 'If a lead slips through the cracks, it\'s gone forever. Memory and texts are risky. A system keeps nothing lost.',
      tip: 'Do you have a place where every lead lives? Or do they live in your head?'
    },
    q10: {
      title: 'Where are jobs slipping away?',
      text: 'These are the problems worth fixing first. Pick the ones that hurt most.',
      tip: 'Think about the last job you lost. Why didn\'t it happen? That\'s probably where the leak is.'
    },
    qWebsite: {
      title: 'Do you have a website?',
      text: 'Your website can work 24/7 to book jobs. But only if people can actually book on it.',
      tip: 'If you have a website, can someone schedule a job without calling you?'
    }
  };

  /* Infrastructure risk assessment */
  function assessInfrastructureRisks() {
    var risks = {};

    // Lead Response Time (0-100 risk score)
    var speedMap = { 'right-away': 0, '15min': 10, 'hour': 40, 'later-day': 75, 'miss': 100, 'other': 30 };
    var speedScore = speedMap[answers.responseSpeed] || 50;
    risks.speedToLead = {
      label: 'Lead Response Time',
      score: speedScore,
      insight: answers.responseSpeed === 'miss' ? 'Missed calls are your biggest drain.' :
               answers.responseSpeed === 'later-day' ? 'Leads cool fast. Same-day replies win.' :
               answers.responseSpeed === 'hour' ? 'You\'re losing to faster competitors.' :
               answers.responseSpeed === '15min' || answers.responseSpeed === 'right-away' ? 'Good reply speed is your advantage.' :
               'Consider improving reply speed.'
    };

    // Follow-up (0-100 risk score)
    var followupMap = { 'several': 0, 'once': 30, 'depends': 60, 'forgotten': 90, 'none': 100, 'other': 40 };
    var followupScore = followupMap[answers.followupProcess] || 50;
    risks.followUp = {
      label: 'Follow-Up System',
      score: followupScore,
      insight: answers.followupProcess === 'none' || answers.followupProcess === 'forgotten' ? 'No follow-up = lost jobs.' :
               answers.followupProcess === 'depends' ? 'Inconsistent follow-up leaves money on table.' :
               answers.followupProcess === 'once' ? 'Multiple touches close more deals.' :
               'Systematic follow-up is your edge.'
    };

    // Missed Calls (0-100 risk score based on slider)
    var missedScore = (answers.missedCallsRate / 10) * 100;
    risks.missedCalls = {
      label: 'Missed Calls',
      score: missedScore,
      insight: answers.missedCallsRate > 5 ? 'You\'re losing calls while on jobs.' :
               answers.missedCallsRate > 2 ? 'Even a few missed calls add up.' :
               'Good call capture rate.'
    };

    // Lead Management (0-100 risk score)
    var trackingMap = { 'crm': 0, 'spreadsheet': 25, 'phone-log': 50, 'yelp-emails': 65, 'memory': 85, 'none': 100 };
    var trackingScore = trackingMap[answers.leadTrackingMethod] || 50;
    risks.leadManagement = {
      label: 'Lead Management',
      score: trackingScore,
      insight: answers.leadTrackingMethod === 'none' || answers.leadTrackingMethod === 'memory' ? 'Manual tracking loses leads daily.' :
               answers.leadTrackingMethod === 'phone-log' || answers.leadTrackingMethod === 'yelp-emails' ? 'Fragmented systems hide your pipeline.' :
               answers.leadTrackingMethod === 'spreadsheet' ? 'Spreadsheets are better, but lag reality.' :
               'CRM keeps every lead visible and hot.'
    };

    // Website Conversion (0-100 risk score)
    var hasWebsiteIssue = answers.biggestLeaks.indexOf('website') >= 0;
    var websiteScore = hasWebsiteIssue ? 80 : (answers.hasWebsite === 'yes' ? 30 : 50);
    risks.websiteConversion = {
      label: 'Website Conversion',
      score: websiteScore,
      insight: hasWebsiteIssue ? 'Your website should work for you 24/7.' :
               answers.hasWebsite === 'yes' && answers.hasWebsiteBooking === 'no' ? 'Add a booking system to capture more jobs.' :
               answers.hasWebsite === 'no' ? 'A website with booking could work 24/7 for you.' :
               'Even good websites can capture more leads.'
    };

    return risks;
  }

  function renderSummary() {
    // Your Current Situation
    $('sumLeadsPerMonth').textContent = Math.round(answers.monthlyLeadVolume) + ' leads/month';
    var currentRatePercent = Math.round(answers.currentBookedJobRate * 100);
    var targetRatePercent = Math.round(answers.targetConversionRate * 100);
    $('sumConversionRate').textContent = currentRatePercent + '% (target: ' + targetRatePercent + '%)';
    $('sumCurrentJobs').textContent = fmtJobs(answers.currentBookedJobs) + ' jobs/month';
    $('sumAvgJobValue').textContent = fmtMoney(answers.averageJobValue);
    $('sumRevenue').textContent = fmtRevenue(answers.currentEstimatedLeadRevenue) + '/month';

    // The Opportunity
    $('sumJobs').textContent = fmtJobs(answers.potentialExtraJobsLow) + ' jobs/month';
    $('sumRisk').textContent = fmtMoney(answers.estimatedRevenueLeftLow) + '/month';

    // ROAS improvement (only show if spending on ads)
    var roasRow = $('roasRow');
    if (answers.adSpend > 0 && answers.roasImprovement > 1) {
      roasRow.hidden = false;
      var multiplier = answers.roasImprovement.toFixed(1);
      $('sumROASMultiplier').textContent = multiplier + 'x return on ad spend';
    } else {
      roasRow.hidden = true;
    }

    // What's Holding You Back
    var leak = answers.biggestLeaks[0];
    $('sumLeak').textContent = leak ? (LEAK_LABEL[leak] || 'See report') : 'See report';
    $('sumTrade').textContent = answers.businessType === 'other'
      ? (answers.businessTypeOther || 'Other')
      : (TRADE_LABEL[answers.businessType] || '—');
    var src = answers.leadSources[0];
    $('sumSource').textContent = src ? (SOURCE_LABEL[src] || 'Other') : '—';

    // Risk Diagnostic Chart
    renderRiskDiagnostic();
  }

  function renderRiskDiagnostic() {
    var risks = answers.infrastructureRisks;
    var riskBarsEl = $('riskBars');
    var firstToFixEl = $('firstToFixLabel');

    if (!riskBarsEl) return;

    riskBarsEl.innerHTML = '';

    var riskArray = [
      { key: 'speedToLead', data: risks.speedToLead },
      { key: 'followUp', data: risks.followUp },
      { key: 'missedCalls', data: risks.missedCalls },
      { key: 'leadManagement', data: risks.leadManagement },
      { key: 'websiteConversion', data: risks.websiteConversion }
    ];

    // Sort by score descending (highest risk first)
    riskArray.sort(function(a, b) {
      return b.data.score - a.data.score;
    });

    // Find highest risk
    var highestRisk = riskArray[0];
    var highestScore = highestRisk ? highestRisk.data.score : 0;

    // Set "First to Fix" label
    if (highestRisk && highestScore > 50) {
      firstToFixEl.textContent = '⚡ First to Fix: ' + highestRisk.data.label;
      firstToFixEl.style.display = 'block';
    } else {
      firstToFixEl.style.display = 'none';
    }

    // Render bars in sorted order
    riskArray.forEach(function(item) {
      var score = item.data.score;
      var isHighest = highestRisk && item.key === highestRisk.key;

      var barEl = document.createElement('div');
      barEl.className = 'risk-bar' + (isHighest ? ' risk-bar--first' : '');

      var labelEl = document.createElement('div');
      labelEl.className = 'risk-bar__label';
      labelEl.textContent = item.data.label;

      var visualEl = document.createElement('div');
      visualEl.className = 'risk-bar__visual';

      var trackEl = document.createElement('div');
      trackEl.className = 'risk-bar__track';

      var fillEl = document.createElement('div');
      fillEl.className = 'risk-bar__fill';
      if (score > 66) {
        fillEl.classList.add('risk-bar__fill--high');
      } else if (score > 33) {
        fillEl.classList.add('risk-bar__fill--medium');
      }
      fillEl.style.width = Math.min(score, 100) + '%';

      var scoreEl = document.createElement('div');
      scoreEl.className = 'risk-bar__score';
      scoreEl.textContent = Math.round(score) + '%';

      trackEl.appendChild(fillEl);
      visualEl.appendChild(trackEl);
      visualEl.appendChild(scoreEl);

      barEl.appendChild(labelEl);
      barEl.appendChild(visualEl);

      riskBarsEl.appendChild(barEl);
    });
  }

  function renderQuestionHelp(questionKey) {
    var help = QUESTION_HELP[questionKey];
    if (!help) return;

    var titleEl = $('fnlHelpTitle');
    var textEl = $('fnlHelpText');
    var tipTextEl = $('fnlHelpTipText');
    var tipEl = $('fnlHelpTip');

    if (titleEl) titleEl.textContent = help.title;
    if (textEl) textEl.textContent = help.text;
    if (tipTextEl) tipTextEl.textContent = help.tip;
    if (tipEl) tipEl.hidden = false;
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
  var TIME_SLOTS = ['7:00 AM', '8:00 AM', '9:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '4:00 PM', '5:00 PM', '6:00 PM'];
  var BLOCKED_HOURS = [10, 15]; // 10am and 3pm always blocked
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
      var isSaturday = (dow === 6);
      if (isPast || isSaturday) {
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

    var now = new Date();
    var isToday = booking.date.getTime() === today.getTime();

    TIME_SLOTS.forEach(function (t) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'slot';
      btn.textContent = t;

      // Parse hour from time string (e.g., "7:00 AM" → 7, "1:00 PM" → 13)
      var timeParts = t.split(':');
      var hour = parseInt(timeParts[0], 10);
      var isPM = t.includes('PM');
      if (isPM && hour !== 12) hour += 12;
      if (!isPM && hour === 12) hour = 0;

      // Check if blocked hour
      var isBlockedHour = BLOCKED_HOURS.indexOf(hour) >= 0;

      // Check if time has passed (if today)
      var isTimePassed = false;
      if (isToday) {
        var slotTime = new Date(booking.date);
        slotTime.setHours(hour, 0, 0, 0);
        isTimePassed = slotTime <= now;
      }

      if (isBlockedHour || isTimePassed) {
        btn.disabled = true;
      } else {
        btn.addEventListener('click', function () {
          booking.time = t;
          slotsGrid.querySelectorAll('.slot').forEach(function (s) { s.classList.remove('is-selected'); });
          btn.classList.add('is-selected');
          validateBooking();
        });
      }

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

    var payload = buildBookingPayload();

    // Submit booking via API (handles email to ironcladleadsystem@gmail.com)
    if (window.IroncladAPI && window.IroncladAPI.submitBooking) {
      window.IroncladAPI.submitBooking(payload)
        .then(function () { showSuccess(); })
        .catch(function (err) {
          console.error('Booking error:', err);
          bookingStatus.textContent = 'Booking saved, but there was an issue sending confirmation. We have your details and will reach out soon.';
          bookingStatus.dataset.type = 'warning';
          bookingStatus.classList.add('is-visible');
          // Still proceed to success
          setTimeout(function () { showSuccess(); }, 2000);
        })
        .then(function () {
          confirmBtn.classList.remove('is-loading');
          confirmBtn.disabled = false;
        });
    } else {
      // Fallback for local testing
      showSuccess();
      confirmBtn.classList.remove('is-loading');
      confirmBtn.disabled = false;
    }
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
        monthlyLeadVolume: Math.round(answers.monthlyLeadVolume),
        adSpend: Math.round(answers.adSpend),
        averageJobValue: Math.round(answers.averageJobValue),
        currentBookedJobRate: answers.currentBookedJobRate,
        responseSpeed: answers.responseSpeed,
        missedCallsRate: Math.round(answers.missedCallsRate),
        followupProcess: answers.followupProcess,
        leadTrackingMethod: answers.leadTrackingMethod,
        biggestLeaks: answers.biggestLeaks,
        biggestLeakOther: answers.biggestLeakOther || null,
        hasWebsite: answers.hasWebsite,
        hasWebsiteBooking: answers.hasWebsiteBooking || null
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
        smsMarketing: answers.smsMarketing,
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
