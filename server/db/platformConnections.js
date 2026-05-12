const supabase = require('./supabase');

module.exports = {
  async getAll() {
    const { data, error } = await supabase
      .from('platform_connections').select('*').order('platform');
    if (error) throw error;
    return data;
  },

  async getByPlatform(platform) {
    const { data, error } = await supabase
      .from('platform_connections').select('*').eq('platform', platform).maybeSingle();
    if (error) throw error;
    return data;
  },

  async upsert(platform, data) {
    const { data: conn, error } = await supabase
      .from('platform_connections')
      .upsert({ platform, ...data }, { onConflict: 'platform' })
      .select().single();
    if (error) throw error;
    return conn;
  },

  async remove(platform) {
    const { error } = await supabase
      .from('platform_connections').delete().eq('platform', platform);
    if (error) throw error;
  },
};
