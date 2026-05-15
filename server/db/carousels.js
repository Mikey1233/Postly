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

  async getAll(limit = 50, offset = 0) {
    const { data, error } = await supabase
      .from('carousels')
      .select('id, title, slide_count, slides, pdf_storage_path, ai_generated, created_at, updated_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return data;
  },
};
