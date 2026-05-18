const cron = require('node-cron');
const db   = require('../../db');
const { publishPost } = require('../publisher');
const { pollAllSources } = require('../feeds/poller');

let running = false;
let lastTickAt = null;
let lastTickCount = 0;
let feedsRunning = false;
let lastFeedTickAt = null;
const inFlight = new Set();

async function tick() {
  if (running) return; // prevent overlap if a tick runs long
  running = true;
  try {
    const duePosts = await db.posts.getDue();
    lastTickAt = new Date().toISOString();
    lastTickCount = duePosts.length;
    if (duePosts.length > 0) {
      console.log(`[scheduler] ${duePosts.length} post(s) due`);
    }
    for (const post of duePosts) {
      if (inFlight.has(post.id)) continue;
      inFlight.add(post.id);
      try {
        // Mark publishing immediately so subsequent ticks don't double-fire
        await db.posts.update(post.id, { status: 'publishing' });
        await publishPost(post);
      } catch (err) {
        console.error(`[scheduler] post ${post.id} failed:`, err.message);
        await db.posts.update(post.id, { status: 'failed', metadata: { error: err.message } }).catch(() => {});
      } finally {
        inFlight.delete(post.id);
      }
    }
  } catch (err) {
    console.error('[scheduler] tick error:', err.message);
  } finally {
    running = false;
  }
}

async function feedsTick() {
  if (feedsRunning) return;
  feedsRunning = true;
  try {
    await pollAllSources();
    lastFeedTickAt = new Date().toISOString();
  } catch (err) {
    console.error('[scheduler] feeds tick error:', err.message);
  } finally {
    feedsRunning = false;
  }
}

function startScheduler() {
  cron.schedule('* * * * *', tick);
  cron.schedule('*/20 * * * *', feedsTick);
  console.log('[scheduler] started — posts every minute, feeds every 20 min');
  // Kick off an initial feed poll a few seconds after boot so the dashboard
  // isn't empty on a cold start. Fire-and-forget; errors are logged.
  setTimeout(() => { feedsTick().catch(() => {}); }, 5_000);
}

function getStatus() {
  return { lastTickAt, lastTickCount, lastFeedTickAt, inFlight: [...inFlight] };
}

module.exports = { startScheduler, tick, feedsTick, getStatus };
