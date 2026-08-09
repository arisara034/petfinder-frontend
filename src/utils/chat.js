import { supabase } from '../supabaseClient';

function sortPair(a, b) {
  return a < b ? [a, b] : [b, a];
}

export async function getOrCreateConversation(currentUserId, otherUserId) {
  const [userA, userB] = sortPair(currentUserId, otherUserId);

  const { data: existing } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_a', userA)
    .eq('user_b', userB)
    .maybeSingle();

  if (existing) return existing;

  const { data: created, error } = await supabase
    .from('conversations')
    .insert({ user_a: userA, user_b: userB })
    .select()
    .single();

  if (error) throw error;
  return created;
}

export async function fetchConversations(userId) {
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .or(`user_a.eq.${userId},user_b.eq.${userId}`)
    .order('last_message_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function fetchMessages(conversationId) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function sendMessage(conversationId, senderId, content, imageUrl = null) {
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, sender_id: senderId, content: content || '', image_url: imageUrl })
    .select()
    .single();

  if (error) throw error;

  const previewText = imageUrl ? (content ? content : 'ส่งรูปภาพ') : content;
  await supabase
    .from('conversations')
    .update({ last_message: previewText, last_message_at: new Date().toISOString() })
    .eq('id', conversationId);

  return data;
}

export async function uploadChatImage(file, conversationId) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${conversationId}_${Date.now()}.${fileExt}`;
  const filePath = `chat/${fileName}`;

  const { error } = await supabase.storage.from('chat-images').upload(filePath, file);
  if (error) throw error;

  const { data } = supabase.storage.from('chat-images').getPublicUrl(filePath);
  return data.publicUrl;
}

export async function deleteMessage(messageId, senderId, conversationId) {
  const { error } = await supabase
    .from('messages')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', messageId)
    .eq('sender_id', senderId); // ลบได้เฉพาะข้อความของตัวเอง

  if (error) throw error;

  // ถ้าเป็นข้อความล่าสุดของห้อง ให้อัปเดต preview รายการสนทนาด้วย
  const { data: latest } = await supabase
    .from('messages')
    .select('id')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest && latest.id === messageId) {
    await supabase
      .from('conversations')
      .update({ last_message: 'ข้อความถูกยกเลิก' })
      .eq('id', conversationId);
  }
}

export async function markMessagesRead(conversationId, currentUserId) {
  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .neq('sender_id', currentUserId)
    .is('read_at', null);
}

export async function fetchUnreadCount(userId) {
  const conversations = await fetchConversations(userId);
  if (conversations.length === 0) return 0;

  const ids = conversations.map(c => c.id);
  const { count } = await supabase
    .from('messages')
    .select('*', { count: 'exact', head: true })
    .in('conversation_id', ids)
    .neq('sender_id', userId)
    .is('read_at', null);

  return count || 0;
}

// อัปเดตแบบ realtime ผ่าน Supabase Realtime — ถ้าโปรเจกต์ยังไม่เปิดใช้ฟีเจอร์นี้
// หน้าแชทจะยัง sync ได้ผ่านการ polling ที่ทำงานคู่กันอยู่แล้ว
export function subscribeToMessages(conversationId, onInsert, onUpdate) {
  const channel = supabase
    .channel(`messages-${conversationId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`,
    }, (payload) => onInsert(payload.new))
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`,
    }, (payload) => onUpdate && onUpdate(payload.new))
    .subscribe();

  return () => supabase.removeChannel(channel);
}
