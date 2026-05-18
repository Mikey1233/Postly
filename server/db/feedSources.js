const supabase = require('./supabase');

const VALID_CATEGORIES = ['ai', 'tech', 'software'];

module.exports = {
  async getAll() {
    const { data, error } = await supabase
      .from('feed_sources').select('*').order('name');
    if (error) throw error;
    return data;
  },

  async getEnabled() {
    const { data, error } = await supabase
      .from('feed_sources').select('*').eq('enabled', true);
    if (error) throw error;
    return data;
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('feed_sources').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  async create({ name, url, category }) {
    if (!VALID_CATEGORIES.includes(category)) {
      throw new Error(`category must be one of: ${VALID_CATEGORIES.join(', ')}`);
    }
    const { data, error } = await supabase
      .from('feed_sources')
      .insert({ name, url, category })
      .select().single();
    if (error) throw error;
    return data;
  },

  async update(id, patch) {
    const allowed = ['name', 'url', 'category', 'enabled'];
    const clean = {};
    for (const k of allowed) if (patch[k] !== undefined) clean[k] = patch[k];
    if (clean.category && !VALID_CATEGORIES.includes(clean.category)) {
      throw new Error(`category must be one of: ${VALID_CATEGORIES.join(', ')}`);
    }
    const { data, error } = await supabase
      .from('feed_sources').update(clean).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async markPolled(id, { error } = {}) {
    const patch = { last_polled_at: new Date().toISOString(), last_error: error || null };
    const { error: dbError } = await supabase
      .from('feed_sources').update(patch).eq('id', id);
    if (dbError) throw dbError;
  },

  async remove(id) {
    const { error } = await supabase.from('feed_sources').delete().eq('id', id);
    if (error) throw error;
  },
};
