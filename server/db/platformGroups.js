const supabase = require('./supabase');

module.exports = {
  async getByPlatform(platform) {
    const { data, error } = await supabase
      .from('platform_groups').select('*')
      .eq('platform', platform)
      .order('name');
    if (error) throw error;
    return data;
  },

  // groups: array of { group_id, name, description, member_count, metadata }
  async upsert(platform, groups) {
    const rows = groups.map((g) => ({
      platform,
      ...g,
      last_synced: new Date().toISOString(),
    }));
    const { data, error } = await supabase
      .from('platform_groups')
      .upsert(rows, { onConflict: 'platform,group_id' })
      .select();
    if (error) throw error;
    return data;
  },
};
