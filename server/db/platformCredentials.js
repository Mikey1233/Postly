const supabase = require('./supabase');
const { encrypt, decrypt } = require('../middleware/tokenCrypto');

module.exports = {
  async getByPlatform(platform) {
    const { data, error } = await supabase
      .from('platform_credentials').select('*').eq('platform', platform).maybeSingle();
    if (error) throw error;
    return data;
  },

  async isSet(platform) {
    return !!(await this.getByPlatform(platform));
  },

  async save(platform, clientId, clientSecret) {
    const { data, error } = await supabase
      .from('platform_credentials')
      .upsert(
        { platform, client_id: encrypt(clientId), client_secret: encrypt(clientSecret), updated_at: new Date().toISOString() },
        { onConflict: 'platform' },
      )
      .select().single();
    if (error) throw error;
    return data;
  },

  async remove(platform) {
    const { error } = await supabase.from('platform_credentials').delete().eq('platform', platform);
    if (error) throw error;
  },

  // Returns { clientId, clientSecret } ready for use in API calls
  async getDecrypted(platform) {
    const row = await this.getByPlatform(platform);
    if (!row) throw Object.assign(new Error(`No app credentials saved for ${platform} — add them on the Platforms page`), { status: 400 });
    return { clientId: decrypt(row.client_id), clientSecret: decrypt(row.client_secret) };
  },
};
