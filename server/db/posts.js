const supabase = require('./supabase');

module.exports = {
  async create(data) {
    const { data: post, error } = await supabase.from('posts').insert(data).select().single();
    if (error) throw error;
    return post;
  },

  async update(id, data) {
    const { data: post, error } = await supabase
      .from('posts').update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id).select().single();
    if (error) throw error;
    return post;
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('posts').select('*, media_assets(*)')
      .eq('id', id).single();
    if (error) throw error;
    return data;
  },

  async getDue() {
    // Pick up posts whose scheduled time is now-ish or earlier. The lower bound
    // is intentionally absent so an outage-induced catch-up still publishes
    // overdue posts on the next tick.
    const soon = new Date(Date.now() + 60_000);
    const { data, error } = await supabase
      .from('posts').select('*, media_assets(*)')
      .eq('status', 'scheduled')
      .lte('scheduled_at', soon.toISOString());
    if (error) throw error;
    return data;
  },

  async markPublished(id, platformPostIds) {
    return this.update(id, {
      status: 'published',
      published_at: new Date().toISOString(),
      platform_post_ids: platformPostIds,
    });
  },

  async markFailed(id, errorMessage) {
    return this.update(id, { status: 'failed', metadata: { error: errorMessage } });
  },

  async getScheduled() {
    const { data, error } = await supabase
      .from('posts').select('*, media_assets(*)')
      .eq('status', 'scheduled')
      .order('scheduled_at');
    if (error) throw error;
    return data;
  },

  async getHistory(limit = 50, offset = 0, filters = {}) {
    let query = supabase
      .from('posts').select('*, post_analytics(*)')
      .order('published_at', { ascending: false });

    query = filters.status ? query.eq('status', filters.status) : query.eq('status', 'published');
    if (filters.search)   query = query.ilike('content', `%${filters.search}%`);
    if (filters.platform) query = query.contains('platform', [filters.platform]);
    if (filters.postType) query = query.eq('post_type', filters.postType);
    if (filters.pillarId) query = query.eq('voice_profile_id', filters.pillarId); // pillars map to voice_profile_id for now
    if (filters.from)     query = query.gte('published_at', filters.from);
    if (filters.to)       query = query.lte('published_at', filters.to);

    const { data, error } = await query.range(offset, offset + limit - 1);
    if (error) throw error;
    return data;
  },

  // Posts updated in the last N minutes — used by the dashboard polling for
  // published/failed transitions. Default 30 minutes covers the polling gap
  // plus a buffer for missed ticks.
  async getRecent({ status, sinceMinutes = 30 } = {}) {
    const since = new Date(Date.now() - sinceMinutes * 60_000).toISOString();
    let query = supabase
      .from('posts').select('id, content, platform, status, published_at, updated_at')
      .gte('updated_at', since)
      .order('updated_at', { ascending: false });
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getStats() {
    const [published, scheduled] = await Promise.all([
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'published'),
      supabase.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'scheduled'),
    ]);
    return {
      totalPosts:     published.count  ?? 0,
      scheduledPosts: scheduled.count  ?? 0,
    };
  },

  async remove(id) {
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (error) throw error;
  },
};
