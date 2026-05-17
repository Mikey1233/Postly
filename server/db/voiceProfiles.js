const supabase = require('./supabase');

module.exports = {
  async list() {
    const { data, error } = await supabase
      .from('voice_profiles').select('*')
      .order('platform').order('created_at');
    if (error) throw error;
    return data;
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('voice_profiles').select('*').eq('id', id).single();
    if (error) throw error;
    return data;
  },

  // The voice used when no explicit voiceId is provided. Prefer the
  // platform's default; fall back to the oldest voice for that platform.
  async getByPlatform(platform) {
    const { data, error } = await supabase
      .from('voice_profiles').select('*')
      .eq('platform', platform)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(data) {
    const { data: profile, error } = await supabase
      .from('voice_profiles').insert(data).select().single();
    if (error) throw error;
    return profile;
  },

  async update(id, data) {
    const { data: profile, error } = await supabase
      .from('voice_profiles')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id).select().single();
    if (error) throw error;
    return profile;
  },

  async remove(id) {
    // posts.voice_profile_id has no ON DELETE behaviour — null those refs
    // before deleting so we don't get a FK violation.
    await supabase.from('posts').update({ voice_profile_id: null }).eq('voice_profile_id', id);
    const { error } = await supabase.from('voice_profiles').delete().eq('id', id);
    if (error) throw error;
  },

  async setDefault(id, platform) {
    await supabase.from('voice_profiles').update({ is_default: false }).eq('platform', platform);
    const { data, error } = await supabase
      .from('voice_profiles').update({ is_default: true })
      .eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
};
