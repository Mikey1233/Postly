const supabase = require('./supabase');

module.exports = {
  async create(data) {
    const { data: session, error } = await supabase
      .from('ai_sessions').insert(data).select().single();
    if (error) throw error;
    return session;
  },

  async getForPost(postId) {
    const { data, error } = await supabase
      .from('ai_sessions').select('*')
      .eq('post_id', postId)
      .order('created_at');
    if (error) throw error;
    return data;
  },

  async appendMessage(id, message) {
    const { data: session, error: fetchError } = await supabase
      .from('ai_sessions').select('messages').eq('id', id).single();
    if (fetchError) throw fetchError;

    const updated = [...(session.messages || []), message];
    const { data, error } = await supabase
      .from('ai_sessions').update({ messages: updated }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  },
};
