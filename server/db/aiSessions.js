const supabase = require('./supabase');

module.exports = {
  async create(data) { throw new Error('db.aiSessions.create not yet implemented'); },
  async getForPost(postId) { throw new Error('db.aiSessions.getForPost not yet implemented'); },
  async appendMessage(id, message) { throw new Error('db.aiSessions.appendMessage not yet implemented'); },
};
