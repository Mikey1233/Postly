const supabase = require('./supabase');

module.exports = {
  async create(data) {
    const { data: carousel, error } = await supabase
      .from('carousels').insert(data).select().single();
    if (error) throw error;
    return carousel;
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('carousels').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  async update(id, data) {
    const { data: carousel, error } = await supabase
      .from('carousels').update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id).select().single();
    if (error) throw error;
    return carousel;
  },

  async remove(id) {
    const { error } = await supabase.from('carousels').delete().eq('id', id);
    if (error) throw error;
  },
};
