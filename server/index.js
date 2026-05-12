require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/ai',        require('./routes/ai'));
app.use('/api/posts',     require('./routes/posts'));
app.use('/api/platforms', require('./routes/platforms'));
app.use('/api/voice',     require('./routes/voice'));
app.use('/api/media',     require('./routes/media'));
app.use('/api/carousel',  require('./routes/carousel'));
app.use('/api/schedule',  require('./routes/schedule'));

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
