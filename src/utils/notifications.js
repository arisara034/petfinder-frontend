import { supabase } from '../supabaseClient';

const POST_TABLE = { lost: 'lost_posts', found: 'found_posts', adopt: 'adopt_posts', feed: 'feed_posts' };

async function getPostOwner(postType, postId) {
  const table = POST_TABLE[postType];
  if (!table) return null;

  const { data } = await supabase.from(table).select('user_id').eq('id', postId).maybeSingle();
  return data?.user_id || null;
}

export async function notifyPostOwner(postType, postId, actorId, type) {
  const ownerId = await getPostOwner(postType, postId);
  if (!ownerId || ownerId === actorId) return;

  const { error } = await supabase.from('notifications').insert({
    recipient_id: ownerId,
    actor_id: actorId,
    type,
    post_type: postType,
    post_id: postId,
  });

  if (error) throw error;
}

export async function fetchNotifications(userId) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('recipient_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) throw error;

  const notifications = data || [];
  const actorIds = [...new Set(notifications.map((n) => n.actor_id))];
  if (actorIds.length === 0) return notifications;

  const { data: profiles } = await supabase
    .from('users_profile')
    .select('id, full_name, avatar_url')
    .in('id', actorIds);

  const profileMap = {};
  (profiles || []).forEach((p) => { profileMap[p.id] = p; });

  return notifications.map((n) => ({ ...n, actor_profile: profileMap[n.actor_id] || null }));
}

export async function fetchUnreadNotificationCount(userId) {
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('recipient_id', userId)
    .is('read_at', null);

  return count || 0;
}

export async function markNotificationRead(id) {
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id);
}

export async function markAllNotificationsRead(userId) {
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', userId)
    .is('read_at', null);
}

// อัปเดตแบบ realtime ผ่าน Supabase Realtime — ถ้าโปรเจกต์ยังไม่เปิดใช้ฟีเจอร์นี้
// กระดิ่งจะยัง sync ได้ผ่านการ polling ที่ทำงานคู่กันอยู่แล้ว
export function subscribeToNotifications(userId, onInsert) {
  const channel = supabase
    .channel(`notifications-${userId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `recipient_id=eq.${userId}`,
    }, (payload) => onInsert(payload.new))
    .subscribe();

  return () => supabase.removeChannel(channel);
}
