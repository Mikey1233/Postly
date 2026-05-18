const supabase = require('./supabase');

module.exports = {
  async getAll() {
    const { data, error } = await supabase
      .from('ai_models').select('*').order('name');
    if (error) throw error;
    return data;
  },

  async create({ openrouter_id, name, best_for, context_k }) {
    const { data, error } = await supabase
      .from('ai_models')
      .insert({
        openrouter_id,
        name,
        best_for: best_for || null,
        context_k: context_k || null,
      })
      .select().single();
    if (error) throw error;
    return data;
  },

  async update(id, patch) {
    const allowed = ['openrouter_id', 'name', 'best_for', 'context_k'];
    const clean = {};
    for (const k of allowed) if (patch[k] !== undefined) clean[k] = patch[k];
    const { data, error } = await supabase
      .from('ai_models').update(clean).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async remove(id) {
    const { error } = await supabase.from('ai_models').delete().eq('id', id);
    if (error) throw error;
  },
};
