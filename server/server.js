// Load .env using explicit path so it works regardless of Passenger's CWD.
try { require('dotenv').config({ path: require('path').join(__dirname, '.env'), override: true }); } catch (_) {}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { handleBooking } = require('./handlers/booking');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust the first proxy (LiteSpeed/Passenger on cPanel) so express-rate-limit
// can correctly identify client IPs from the X-Forwarded-For header.
app.set('trust proxy', 1);

// Security headers — HSTS, CSP, X-Frame-Options, X-Content-Type-Options, etc.
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// CORS — restrict to the frontend origin(s) configured in .env.
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, cb) {
    // Allow server-to-server / curl requests (no Origin header).
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`Origin not allowed: ${origin}`));
  },
  methods: ['POST', 'OPTIONS'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json({ limit: '16kb' }));

// Rate limiting — booking endpoint: max 5 submissions per IP per 15 min.
const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { code: 'rate_limited', message: 'Too many requests. Please try again later.' },
});

// Health check — separate, lightly limited.
const healthLimiter = rateLimit({ windowMs: 60 * 1000, max: 10 });

// Validate the public API key if one is configured.
app.use('/v1', (req, res, next) => {
  const key = process.env.API_PUBLIC_KEY;
  if (!key) return next();
  if (req.headers['x-api-key'] === key) return next();
  res.status(401).json({ code: 'unauthorized', message: 'Unauthorized.' });
});

// ---------- Routes ----------
app.post('/v1/bookings', bookingLimiter, handleBooking);

app.get('/health', healthLimiter, (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    integrations: {
      email: !!process.env.RESEND_API_KEY,
      sms:   !!process.env.TWILIO_ACCOUNT_SID,
      crm:   !!process.env.HUBSPOT_ACCESS_TOKEN,
    },
  });
});

app.listen(PORT, () => {
  console.log(`Ironclad API running on http://localhost:${PORT}`);
  console.log(`  Email (Resend): ${process.env.RESEND_API_KEY ? '✓ configured' : '✗ not configured'}`);
  console.log(`  SMS (Twilio):   ${process.env.TWILIO_ACCOUNT_SID ? '✓ configured' : '✗ not configured'}`);
  console.log(`  CRM (HubSpot):  ${process.env.HUBSPOT_ACCESS_TOKEN ? '✓ configured' : '✗ not configured'}`);
});
