const router      = require('express').Router();
const requireAuth = require('../middleware/requireAuth');
const appConfig   = require('../db/appConfig');
const {
  isAccountConfigured, verifyCredentials, setCredentials,
  createSession, destroySession, verifySession,
  setSessionCookie, clearSessionCookie, COOKIE_NAME,
} = require('../middleware/authUtils');

// GET /api/auth/setup-status — has an account been configured yet?
router.get('/setup-status', async (_req, res, next) => {
  try {
    res.json({ configured: await isAccountConfigured() });
  } catch (err) { next(err); }
});

// POST /api/auth/register — first-run account creation (blocked once configured)
router.post('/register', async (req, res, next) => {
  try {
    if (await isAccountConfigured()) {
      return res.status(403).json({ error: 'Account already set up' });
    }
    const { email, password, name } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email required' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    await setCredentials(email, password);
    if (name && name.trim()) await appConfig.set('profile_name', name.trim());
    const token = createSession();
    setSessionCookie(res, token);
    res.status(201).json({ ok: true });
  } catch (err) { next(err); }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    const valid = await verifyCredentials(email, password);
    if (!valid) return res.status(401).json({ error: 'Incorrect email or password' });

    const token = createSession();
    setSessionCookie(res, token);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  destroySession(req.cookies?.[COOKIE_NAME]);
  clearSessionCookie(res);
  res.json({ ok: true });
});

// GET /api/auth/verify — frontend checks this on load
router.get('/verify', (req, res) => {
  res.json({ authenticated: verifySession(req.cookies?.[COOKIE_NAME]) });
});

// GET /api/auth/profile
router.get('/profile', requireAuth, async (_req, res, next) => {
  try {
    const [name, email] = await Promise.all([
      appConfig.get('profile_name'),
      appConfig.get('profile_email'),
    ]);
    res.json({ name, email });
  } catch (err) { next(err); }
});

// PUT /api/auth/profile — update name and/or email
router.put('/profile', requireAuth, async (req, res, next) => {
  try {
    const updates = [];
    const result  = {};
    const name  = (req.body.name  || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    if (name)  { updates.push(appConfig.set('profile_name',  name));  result.name  = name;  }
    if (email) { updates.push(appConfig.set('profile_email', email)); result.email = email; }
    if (updates.length === 0) return res.status(400).json({ error: 'Nothing to update' });
    await Promise.all(updates);
    res.json(result);
  } catch (err) { next(err); }
});

module.exports = router;
