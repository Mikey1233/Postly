const supabase = require('./supabase');

// Stubs — full implementations added in Stage 2
module.exports = {
  async create(data) { throw new Error('db.posts.create not yet implemented'); },
  async getById(id) { throw new Error('db.posts.getById not yet implemented'); },
  async update(id, data) { throw new Error('db.posts.update not yet implemented'); },
  async remove(id) { throw new Error('db.posts.remove not yet implemented'); },
  async getScheduled() { throw new Error('db.posts.getScheduled not yet implemented'); },
  async getHistory() { throw new Error('db.posts.getHistory not yet implemented'); },
};
