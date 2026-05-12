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

  async getHistory(limit = 50, offset = 0) {
    const { data, error } = await supabase
      .from('posts').select('*, post_analytics(*)')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return data;
  },

  async remove(id) {
    const { error } = await supabase.from('posts').delete().eq('id', id);
    if (error) throw error;
  },
};
