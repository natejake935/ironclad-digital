/**
 * Ironclad Digital — booking form controller.
 *
 * Responsibilities:
 *   - validate the form
 *   - collect a normalized payload
 *   - call IroncladAPI.submitBooking
 *   - render success / error / loading states
 *
 * Backend integration:
 *   The payload shape sent to the API is intentionally explicit and
 *   stable. Server-side it should drive: SMS notification, email
 *   notification, and CRM contact creation. Add fields to the
 *   `buildPayload` schema below as those integrations require them.
 */
(function () {
  const form = document.getElementById('bookForm');
  if (!form) return;

  const submitBtn = document.getElementById('bookSubmit');
  const statusEl = document.getElementById('bookFormStatus');
  const successEl = document.getElementById('bookSuccess');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    // Honeypot — if filled, silently succeed without sending.
    const honeypot = form.elements['company_website'];
    if (honeypot && honeypot.value.trim() !== '') {
      showSuccess();
      return;
    }

    const errors = validate(form);
    if (errors.length) {
      showErrors(errors);
      return;
    }

    const payload = buildPayload(form);
    setLoading(true);

    try {
      const result = await window.IroncladAPI.submitBooking(payload);
      if (window.IRONCLAD_CONFIG?.debug) console.log('[booking] success', result);
      showSuccess();
      form.reset();
    } catch (err) {
      const message =
        (err && err.message) ||
        'Something went wrong submitting your request. Please try again.';
      showStatus(message, 'error');
    } finally {
      setLoading(false);
    }
  });

  // ---------- Validation ----------
  function validate(formEl) {
    const errors = [];
    const required = ['firstName', 'lastName', 'businessName', 'email', 'phone', 'serviceType'];
    required.forEach((name) => {
      const field = formEl.elements[name];
      if (!field || !field.value.trim()) {
        errors.push({ name, message: 'Required.' });
      }
    });

    const email = formEl.elements['email'].value.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push({ name: 'email', message: 'Enter a valid email.' });
    }

    const phone = formEl.elements['phone'].value.trim();
    if (phone && phone.replace(/\D/g, '').length < 10) {
      errors.push({ name: 'phone', message: 'Enter a valid phone number.' });
    }

    if (!formEl.elements['consent'].checked) {
      errors.push({ name: 'consent', message: 'Please confirm consent to continue.' });
    }

    return errors;
  }

  // ---------- Payload shape (the API contract) ----------
  function buildPayload(formEl) {
    const data = new FormData(formEl);
    const contactMethod = formEl.querySelector('input[name="contactMethod"]:checked')?.value || 'phone';

    return {
      contact: {
        firstName: (data.get('firstName') || '').toString().trim(),
        lastName: (data.get('lastName') || '').toString().trim(),
        email: (data.get('email') || '').toString().trim().toLowerCase(),
        phone: (data.get('phone') || '').toString().trim(),
      },
      business: {
        name: (data.get('businessName') || '').toString().trim(),
        serviceType: data.get('serviceType') || null,
        serviceArea: (data.get('serviceArea') || '').toString().trim() || null,
        monthlyLeads: data.get('monthlyLeads') || null,
      },
      inquiry: {
        challenge: (data.get('challenge') || '').toString().trim() || null,
        preferredContactMethod: contactMethod,
      },
      consent: {
        granted: !!data.get('consent'),
        timestamp: new Date().toISOString(),
      },
      meta: {
        source: 'website',
        page: location.pathname,
        referrer: document.referrer || null,
        userAgent: navigator.userAgent,
        submittedAt: new Date().toISOString(),
      },
    };
  }

  // ---------- UI state ----------
  function setLoading(isLoading) {
    submitBtn.disabled = isLoading;
    submitBtn.classList.toggle('is-loading', isLoading);
  }

  function showStatus(message, type = 'info') {
    statusEl.textContent = message;
    statusEl.dataset.type = type;
    statusEl.classList.add('is-visible');
  }

  function clearErrors() {
    statusEl.textContent = '';
    statusEl.classList.remove('is-visible');
    form.querySelectorAll('.field.has-error').forEach((el) => el.classList.remove('has-error'));
    form.querySelectorAll('.field__error').forEach((el) => el.remove());
  }

  function showErrors(errors) {
    errors.forEach(({ name, message }) => {
      const input = form.elements[name];
      if (!input) return;
      const field = input.closest('.field') || input.closest('.checkbox') || input.parentElement;
      if (!field) return;
      field.classList.add('has-error');
      const err = document.createElement('div');
      err.className = 'field__error';
      err.textContent = message;
      field.appendChild(err);
    });
    showStatus('Please fix the highlighted fields above.', 'error');
    // Focus first invalid input
    const first = form.querySelector('.has-error input, .has-error select, .has-error textarea');
    first?.focus();
  }

  function showSuccess() {
    form.hidden = true;
    successEl.hidden = false;
    successEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
})();
