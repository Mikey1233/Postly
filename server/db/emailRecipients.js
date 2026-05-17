const supabase = require('./supabase');

module.exports = {
  async getAll() {
    const { data, error } = await supabase
      .from('email_recipients').select('*').order('name');
    if (error) throw error;
    return data;
  },

  async getByIds(ids) {
    if (!ids?.length) return [];
    const { data, error } = await supabase
      .from('email_recipients').select('*').in('id', ids);
    if (error) throw error;
    return data;
  },

  async create({ name, email, group_tag, notes }) {
    const { data, error } = await supabase
      .from('email_recipients')
      .insert({ name, email, group_tag: group_tag || null, notes: notes || null })
      .select().single();
    if (error) throw error;
    return data;
  },

  async update(id, patch) {
    const allowed = ['name', 'email', 'group_tag', 'notes'];
    const clean = {};
    for (const k of allowed) if (patch[k] !== undefined) clean[k] = patch[k];
    clean.updated_at = new Date().toISOString();
    const { data, error } = await supabase
      .from('email_recipients').update(clean).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async remove(id) {
    const { error } = await supabase.from('email_recipients').delete().eq('id', id);
    if (error) throw error;
  },
};
