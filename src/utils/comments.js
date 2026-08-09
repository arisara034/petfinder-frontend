import { supabase } from '../supabaseClient';

export async function fetchComments(postType, postId) {
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('post_type', postType)
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  const comments = data || [];
  const userIds = [...new Set(comments.map(c => c.user_id))];
  if (userIds.length === 0) return comments;

  const { data: profiles } = await supabase
    .from('users_profile')
    .select('id, full_name, avatar_url')
    .in('id', userIds);

  const profileMap = {};
  (profiles || []).forEach(p => { profileMap[p.id] = p; });

  return comments.map(c => ({ ...c, users_profile: profileMap[c.user_id] || null }));
}

export async function addComment(postType, postId, userId, content) {
  const { data, error } = await supabase
    .from('comments')
    .insert({ post_type: postType, post_id: postId, user_id: userId, content })
    .select()
    .single();

  if (error) throw error;

  const { data: profile } = await supabase
    .from('users_profile')
    .select('id, full_name, avatar_url')
    .eq('id', userId)
    .maybeSingle();

  return { ...data, users_profile: profile || null };
}

export async function updateComment(commentId, userId, content) {
  const { data, error } = await supabase
    .from('comments')
    .update({ content })
    .eq('id', commentId)
    .eq('user_id', userId) // แก้ไขได้เฉพาะความคิดเห็นของตัวเอง
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteComment(commentId, userId) {
  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', userId); // ลบได้เฉพาะความคิดเห็นของตัวเอง

  if (error) throw error;
}

// นับจำนวนคอมเมนต์ของแต่ละโพสต์ในชุด posts ({ id, type })
export async function fetchCommentCounts(posts) {
  const counts = {};
  posts.forEach((p) => { counts[`${p.type}-${p.id}`] = 0; });
  if (posts.length === 0) return counts;

  const idsByType = {};
  posts.forEach((p) => {
    if (!idsByType[p.type]) idsByType[p.type] = [];
    idsByType[p.type].push(p.id);
  });

  await Promise.all(
    Object.entries(idsByType).map(async ([postType, ids]) => {
      const { data } = await supabase
        .from('comments')
        .select('post_id')
        .eq('post_type', postType)
        .in('post_id', ids);

      (data || []).forEach((row) => {
        const key = `${postType}-${row.post_id}`;
        counts[key] = (counts[key] || 0) + 1;
      });
    })
  );

  return counts;
}
