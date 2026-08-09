import { supabase } from '../supabaseClient';

const TABLE_BY_TYPE = { lost: 'lost_posts', found: 'found_posts', adopt: 'adopt_posts' };

export async function isFavorited(postType, postId, userId) {
  if (!userId) return false;
  const { data } = await supabase
    .from('favorites')
    .select('id')
    .eq('post_type', postType)
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle();

  return !!data;
}

export async function toggleFavorite(postType, postId, userId) {
  const { data: existing } = await supabase
    .from('favorites')
    .select('id')
    .eq('post_type', postType)
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from('favorites').delete().eq('id', existing.id);
    if (error) throw error;
    return false;
  }

  const { error } = await supabase
    .from('favorites')
    .insert({ post_type: postType, post_id: postId, user_id: userId });

  if (error) throw error;
  return true;
}

export async function fetchFavoritePosts(userId) {
  const { data: favorites, error } = await supabase
    .from('favorites')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  if (!favorites || favorites.length === 0) return [];

  const idsByType = { lost: [], found: [], adopt: [] };
  favorites.forEach((f) => {
    if (idsByType[f.post_type]) idsByType[f.post_type].push(f.post_id);
  });

  const results = await Promise.all(
    Object.entries(idsByType)
      .filter(([, ids]) => ids.length > 0)
      .map(([postType, ids]) =>
        supabase
          .from(TABLE_BY_TYPE[postType])
          .select('*')
          .in('id', ids)
          .then(({ data }) => (data || []).map((p) => ({ ...p, type: postType })))
      )
  );

  const posts = results.flat();
  const order = favorites.map((f) => `${f.post_type}-${f.post_id}`);
  posts.sort((a, b) => order.indexOf(`${a.type}-${a.id}`) - order.indexOf(`${b.type}-${b.id}`));

  return posts;
}

// นับจำนวนไลก์ของแต่ละโพสต์ในชุด posts ({ id, type }) พร้อมเช็คว่า userId กดไลก์ไว้แล้วหรือยัง
export async function fetchFavoriteStats(posts, userId) {
  const stats = {};
  posts.forEach((p) => { stats[`${p.type}-${p.id}`] = { count: 0, likedByMe: false }; });
  if (posts.length === 0) return stats;

  const idsByType = {};
  posts.forEach((p) => {
    if (!idsByType[p.type]) idsByType[p.type] = [];
    idsByType[p.type].push(p.id);
  });

  await Promise.all(
    Object.entries(idsByType).map(async ([postType, ids]) => {
      const { data } = await supabase
        .from('favorites')
        .select('post_id, user_id')
        .eq('post_type', postType)
        .in('post_id', ids);

      (data || []).forEach((row) => {
        const key = `${postType}-${row.post_id}`;
        if (!stats[key]) stats[key] = { count: 0, likedByMe: false };
        stats[key].count += 1;
        if (userId && row.user_id === userId) stats[key].likedByMe = true;
      });
    })
  );

  return stats;
}
