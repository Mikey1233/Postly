const supabase = require('./supabase');

module.exports = {
  async record(postId, platform, status, responseOrError) {
    const row = {
      post_id: postId,
      platform,
      status,
      response: status === 'success' ? responseOrError : null,
      error:    status === 'failed'  ? String(responseOrError) : null,
    };
    const { data, error } = await supabase
      .from('publish_logs').insert(row).select().single();
    if (error) throw error;
    return data;
  },

  async getForPost(postId) {
    const { data, error } = await supabase
      .from('publish_logs').select('*')
      .eq('post_id', postId)
      .order('attempted_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  async removeForPost(postId) {
    const { error } = await supabase.from('publish_logs').delete().eq('post_id', postId);
    if (error) throw error;
  },
};
