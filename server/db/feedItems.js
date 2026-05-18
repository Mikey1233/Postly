const supabase = require('./supabase');

module.exports = {
  // List items with optional filters. Joins source name + category.
  async list({ category, sourceId, limit = 50, before } = {}) {
    let q = supabase
      .from('feed_items')
      .select('id, title, url, summary, author, image_url, published_at, fetched_at, source_id, feed_sources!inner(name, category, enabled)')
      .eq('feed_sources.enabled', true)
      .order('published_at', { ascending: false, nullsFirst: false })
      .limit(limit);
    if (category)  q = q.eq('feed_sources.category', category);
    if (sourceId)  q = q.eq('source_id', sourceId);
    if (before)    q = q.lt('published_at', before);
    const { data, error } = await q;
    if (error) throw error;
    return data.map((row) => ({
      id:           row.id,
      title:        row.title,
      url:          row.url,
      summary:      row.summary,
      author:       row.author,
      imageUrl:     row.image_url,
      publishedAt:  row.published_at,
      fetchedAt:    row.fetched_at,
      sourceId:     row.source_id,
      sourceName:   row.feed_sources?.name,
      category:     row.feed_sources?.category,
    }));
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('feed_items')
      .select('id, title, url, summary, author, image_url, published_at, source_id, feed_sources(name, category)')
      .eq('id', id).single();
    if (error) throw error;
    return {
      id:          data.id,
      title:       data.title,
      url:         data.url,
      summary:     data.summary,
      author:      data.author,
      imageUrl:    data.image_url,
      publishedAt: data.published_at,
      sourceId:    data.source_id,
      sourceName:  data.feed_sources?.name,
      category:    data.feed_sources?.category,
    };
  },

  // Bulk insert. Dedupes by URL via the unique index — duplicates are skipped.
  async bulkUpsert(sourceId, items) {
    if (!items?.length) return 0;
    const rows = items.map((it) => ({
      source_id:    sourceId,
      title:        it.title,
      url:          it.url,
      summary:      it.summary || null,
      author:       it.author || null,
      image_url:    it.imageUrl || null,
      published_at: it.publishedAt || null,
    }));
    const { data, error } = await supabase
      .from('feed_items')
      .upsert(rows, { onConflict: 'url', ignoreDuplicates: true })
      .select('id');
    if (error) throw error;
    return data?.length || 0;
  },

  // Trim old items so the table stays bounded. Keeps the last `keep` per source.
  // Called occasionally by the poller — not on every poll.
  async pruneOlderThan(days = 30) {
    const cutoff = new Date(Date.now() - days * 86_400_000).toISOString();
    const { error } = await supabase
      .from('feed_items').delete().lt('published_at', cutoff);
    if (error) throw error;
  },
};
