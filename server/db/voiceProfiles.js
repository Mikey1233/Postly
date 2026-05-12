const supabase = require('./supabase');

module.exports = {
  async getByPlatform(platform) {
    const { data, error } = await supabase
      .from('voice_profiles').select('*').eq('platform', platform).maybeSingle();
    if (error) throw error;
    return data;
  },

  async upsert(platform, data) {
    const existing = await this.getByPlatform(platform);
    if (existing) {
      const { data: profile, error } = await supabase
        .from('voice_profiles')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', existing.id).select().single();
      if (error) throw error;
      return profile;
    }
    const { data: profile, error } = await supabase
      .from('voice_profiles').insert({ platform, ...data }).select().single();
    if (error) throw error;
    return profile;
  },
};
