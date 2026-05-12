const supabase = require('./supabase');

module.exports = {
  async getAll() {
    const { data, error } = await supabase
      .from('content_pillars').select('*').order('name');
    if (error) throw error;
    return data;
  },

  async create(data) {
    const { data: pillar, error } = await supabase
      .from('content_pillars').insert(data).select().single();
    if (error) throw error;
    return pillar;
  },

  async update(id, data) {
    const { data: pillar, error } = await supabase
      .from('content_pillars').update(data).eq('id', id).select().single();
    if (error) throw error;
    return pillar;
  },

  async remove(id) {
    const { error } = await supabase.from('content_pillars').delete().eq('id', id);
    if (error) throw error;
  },

  async incrementPostCount(id) {
    const { data, error } = await supabase.rpc('increment_pillar_post_count', { pillar_id: id });
    if (error) {
      // Fallback if RPC not available: fetch-then-update
      const { data: current, error: fetchErr } = await supabase
        .from('content_pillars').select('post_count').eq('id', id).single();
      if (fetchErr) throw fetchErr;
      return this.update(id, { post_count: (current.post_count || 0) + 1 });
    }
    return data;
  },
};
