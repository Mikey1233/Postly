require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const requireAuth  = require('./middleware/requireAuth');

const app = express();

app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(cookieParser());

// Auth route is public — no requireAuth guard
app.use('/api/auth', require('./routes/auth'));

// All other API routes require a valid session cookie
app.use('/api/ai',        requireAuth, require('./routes/ai'));
app.use('/api/posts',     requireAuth, require('./routes/posts'));
app.use('/api/platforms', requireAuth, require('./routes/platforms'));
app.use('/api/voice',     requireAuth, require('./routes/voice'));
app.use('/api/media',     requireAuth, require('./routes/media'));
app.use('/api/schedule',  requireAuth, require('./routes/schedule'));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  if (process.env.DISABLE_SCHEDULER !== 'true') {
    require('./services/scheduler/cron').startScheduler();
  }
});
