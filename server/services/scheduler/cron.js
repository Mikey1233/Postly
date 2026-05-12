const cron = require('node-cron');
const db   = require('../../db');
const { publishPost } = require('../publisher');

let running = false;
let lastTickAt = null;
let lastTickCount = 0;
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

function startScheduler() {
  cron.schedule('* * * * *', tick);
  console.log('[scheduler] started — checking every minute');
}

function getStatus() {
  return { lastTickAt, lastTickCount, inFlight: [...inFlight] };
}

module.exports = { startScheduler, tick, getStatus };
