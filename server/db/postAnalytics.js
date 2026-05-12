const supabase = require('./supabase');

module.exports = {
  async getForPost(postId) {
    const { data, error } = await supabase
      .from('post_analytics').select('*').eq('post_id', postId);
    if (error) throw error;
    return data;
  },

  async upsert(postId, platform, data) {
    const { data: analytics, error } = await supabase
      .from('post_analytics')
      .upsert(
        { post_id: postId, platform, ...data, fetched_at: new Date().toISOString() },
        { onConflict: 'post_id,platform' },
      )
      .select().single();
    if (error) throw error;
    return analytics;
  },
};
