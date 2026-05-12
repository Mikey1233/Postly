const supabase = require('./supabase');

module.exports = {
  async create(data) {
    const { data: asset, error } = await supabase
      .from('media_assets').insert(data).select().single();
    if (error) throw error;
    return asset;
  },

  async getForPost(postId) {
    const { data, error } = await supabase
      .from('media_assets').select('*')
      .eq('post_id', postId)
      .order('sort_order');
    if (error) throw error;
    return data;
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('media_assets').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  async updateAltText(id, altText) {
    const { data, error } = await supabase
      .from('media_assets').update({ alt_text: altText }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async updatePlatformMediaIds(id, platformMediaIds) {
    const { data, error } = await supabase
      .from('media_assets').update({ platform_media_ids: platformMediaIds })
      .eq('id', id).select().single();
    if (error) throw error;
    return data;
  },

  async remove(id) {
    const { error } = await supabase.from('media_assets').delete().eq('id', id);
    if (error) throw error;
  },

  async getLibrary(limit = 50, offset = 0) {
    const { data, error } = await supabase
      .from('media_assets').select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    return data;
  },
};
