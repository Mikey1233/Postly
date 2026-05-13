const supabase = require('./supabase');

module.exports = {
  async get(key) {
    const { data } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', key)
      .maybeSingle();
    return data?.value ?? null;
  },

  async set(key, value) {
    const { error } = await supabase
      .from('app_config')
      .upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) throw error;
  },
};
