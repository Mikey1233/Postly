const supabase = require('./supabase');

module.exports = {
  async getAll() { throw new Error('db.platformConnections.getAll not yet implemented'); },
  async getByPlatform(platform) { throw new Error('db.platformConnections.getByPlatform not yet implemented'); },
  async upsert(platform, data) { throw new Error('db.platformConnections.upsert not yet implemented'); },
  async remove(platform) { throw new Error('db.platformConnections.remove not yet implemented'); },
};
