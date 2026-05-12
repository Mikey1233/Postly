const supabase = require('./supabase');

module.exports = {
  async getAll() {
    const { data, error } = await supabase
      .from('carousel_templates').select('*')
      .order('is_builtin', { ascending: false })
      .order('created_at');
    if (error) throw error;
    return data;
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('carousel_templates').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  async create(data) {
    const { data: template, error } = await supabase
      .from('carousel_templates').insert(data).select().single();
    if (error) throw error;
    return template;
  },

  async remove(id) {
    const { error } = await supabase.from('carousel_templates').delete().eq('id', id);
    if (error) throw error;
  },
};
