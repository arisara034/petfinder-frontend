import { supabase } from '../supabaseClient';

export async function fetchFeedPosts(userId) {
  const { data, error } = await supabase
    .from('feed_posts')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createFeedPost(userId, content, imageUrls = []) {
  const { data, error } = await supabase
    .from('feed_posts')
    .insert({
      user_id: userId,
      content: content || '',
      image_url: imageUrls[0] || null,
      images: imageUrls,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteFeedPost(postId, userId) {
  const { error } = await supabase
    .from('feed_posts')
    .delete()
    .eq('id', postId)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function uploadFeedImage(file, userId) {
  const fileExt = file.name.split('.').pop();
  const fileName = `${userId}_${Date.now()}.${fileExt}`;
  const filePath = `feed/${fileName}`;

  const { error } = await supabase.storage.from('feed-images').upload(filePath, file);
  if (error) throw error;

  const { data } = supabase.storage.from('feed-images').getPublicUrl(filePath);
  return data.publicUrl;
}
