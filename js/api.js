/**
 * Ironclad Digital — API client.
 *
 * Thin wrapper around fetch() that:
 *   - resolves URLs from config
 *   - adds auth + JSON headers
 *   - enforces a timeout
 *   - normalizes errors into a consistent shape
 *   - falls back to a local mock when no backend is configured
 *
 * Call sites use the named helpers (e.g. IroncladAPI.submitBooking)
 * and never touch fetch directly.
 */
(function (global) {
  const config = global.IRONCLAD_CONFIG || {};

  class ApiError extends Error {
    constructor(message, { status = 0, code = 'unknown', details = null } = {}) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.code = code;
      this.details = details;
    }
  }

  function buildUrl(path, params = {}) {
    let url = path;
    // Replace :param style tokens.
    Object.entries(params).forEach(([k, v]) => {
      url = url.replace(`:${k}`, encodeURIComponent(v));
    });
    return (config.apiBaseUrl || '') + url;
  }

  async function request(method, path, { body, params, signal } = {}) {
    const url = buildUrl(path, params);
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      config.requestTimeoutMs || 12000
    );

    const externalAbort = () => controller.abort();
    if (signal) signal.addEventListener('abort', externalAbort);

    const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
    if (config.publicApiKey) headers['X-Api-Key'] = config.publicApiKey;

    if (config.debug) console.log('[API]', method, url, body);

    try {
      const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
        credentials: 'omit',
      });

      const text = await res.text();
      const data = text ? safeJson(text) : null;

      if (!res.ok) {
        throw new ApiError(
          (data && data.message) || `Request failed (${res.status})`,
          { status: res.status, code: (data && data.code) || 'http_error', details: data }
        );
      }

      if (config.debug) console.log('[API] ←', res.status, data);
      return data;
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new ApiError('Request timed out. Please try again.', { code: 'timeout' });
      }
      if (err instanceof ApiError) throw err;
      throw new ApiError('Network error. Please check your connection.', { code: 'network', details: err });
    } finally {
      clearTimeout(timeout);
      if (signal) signal.removeEventListener('abort', externalAbort);
    }
  }

  function safeJson(text) {
    try { return JSON.parse(text); } catch { return null; }
  }

  // ---------- Public surface ----------

  /**
   * Submit a booking / strategy call request.
   *
   * Server is expected to:
   *   1. Persist the lead.
   *   2. Send an automated SMS (via config.serverIntegrations.sms).
   *   3. Send an automated email (via config.serverIntegrations.email).
   *   4. Create/update the CRM contact and pipeline stage.
   *
   * @param {Object} payload — see schema in booking.js (buildPayload).
   * @returns {Promise<{ id: string, status: string }>}
   */
  async function submitBooking(payload) {
    // No backend configured yet → resolve via mock so the UI is testable.
    if (!config.apiBaseUrl) {
      return mockSubmitBooking(payload);
    }
    return request('POST', config.endpoints.booking, { body: payload });
  }

  function mockSubmitBooking(payload) {
    if (config.debug) console.log('[API:mock] submitBooking', payload);
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: 'mock_' + Math.random().toString(36).slice(2, 10),
          status: 'received',
          mock: true,
        });
      }, 900);
    });
  }

  global.IroncladAPI = {
    submitBooking,
    ApiError,
    _request: request, // exposed for future endpoints
  };
})(window);
