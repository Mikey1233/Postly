// Polls every enabled feed_source, parses RSS/Atom, dedupes by URL,
// inserts new items via db.feedItems.bulkUpsert. Called by the cron tick
// in server/services/scheduler/cron.js every 20 min.

const Parser = require('rss-parser');
const db     = require('../../db');

const parser = new Parser({
  timeout: 15_000,
  headers: { 'User-Agent': 'Postly/1.0 (+rss-poller)' },
});

// Strip HTML and clamp summaries so feed cards stay readable.
function cleanSummary(raw) {
  if (!raw) return null;
  const stripped = String(raw).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  if (!stripped) return null;
  return stripped.length > 600 ? stripped.slice(0, 597) + '…' : stripped;
}

function pickImage(item) {
  if (item.enclosure?.url && /^image\//i.test(item.enclosure?.type || '')) return item.enclosure.url;
  if (item['media:content']?.$.url) return item['media:content'].$.url;
  if (item['media:thumbnail']?.$.url) return item['media:thumbnail'].$.url;
  const m = (item['content:encoded'] || item.content || '').match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

async function pollSource(source) {
  const feed = await parser.parseURL(source.url);
  const items = (feed.items || []).map((it) => ({
    title:       (it.title || '').trim() || '(untitled)',
    url:         it.link || it.guid,
    summary:     cleanSummary(it.contentSnippet || it.summary || it.content),
    author:      it.creator || it.author || feed.title || null,
    imageUrl:    pickImage(it),
    publishedAt: it.isoDate || (it.pubDate ? new Date(it.pubDate).toISOString() : null),
  })).filter((it) => it.url);
  const inserted = await db.feedItems.bulkUpsert(source.id, items);
  return inserted;
}

async function pollAllSources() {
  const sources = await db.feedSources.getEnabled();
  const results = await Promise.allSettled(sources.map(async (source) => {
    try {
      const inserted = await pollSource(source);
      await db.feedSources.markPolled(source.id);
      return { source: source.name, inserted };
    } catch (err) {
      await db.feedSources.markPolled(source.id, { error: err.message }).catch(() => {});
      throw err;
    }
  }));
  const summary = results.map((r, i) => {
    const name = sources[i].name;
    return r.status === 'fulfilled'
      ? `  ✓ ${name}: ${r.value.inserted} new`
      : `  ✗ ${name}: ${r.reason?.message || 'failed'}`;
  });
  console.log(`[feeds] polled ${sources.length} source(s)\n${summary.join('\n')}`);
  return results;
}

module.exports = { pollSource, pollAllSources };
