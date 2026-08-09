import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Icon from '../components/Icon';
import { fetchFavoriteStats, toggleFavorite } from '../utils/favorites';
import { fetchCommentCounts } from '../utils/comments';
import { fetchFeedPosts, deleteFeedPost } from '../utils/feedPosts';
import { notifyPostOwner } from '../utils/notifications';
import FeedPostCard from '../components/FeedPostCard';
import './UserProfile.css';

const TYPE_META = {
  lost: { icon: 'search', label: 'ประกาศหาย' },
  found: { icon: 'home', label: 'แจ้งพบ' },
  adopt: { icon: 'clipboardList', label: 'ประกาศหาบ้าน' },
};

function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUserId = localStorage.getItem('userId');
  const [user, setUser] = useState({
    name: '', email: '', phone: '', address: '', line_id: '', facebook: '', avatar_url: '',
    show_phone: true, show_line: true, show_facebook: true, show_address: true,
  });
  const [userPosts, setUserPosts] = useState([]);
  const [feedStats, setFeedStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // เพิ่ม State สำหรับเก็บสถานะตัวกรอง (ค่าเริ่มต้นคือแสดงทั้งหมด)
  const [viewMode, setViewMode] = useState('pets'); // 'pets' | 'lifefeed'
  const [lifeFeedPosts, setLifeFeedPosts] = useState([]);
  const [lifeFeedStats, setLifeFeedStats] = useState({});
  const [lifeFeedLoading, setLifeFeedLoading] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true);
      if (!id) return;

      const { data: profile } = await supabase
        .from('users_profile')
        .select('*')
        .eq('id', id)
        .single();

      if (profile) {
        setUser({
          name: profile.full_name || '',
          email: profile.email || '',
          phone: profile.phone || '',
          address: profile.address || '',
          line_id: profile.line_id || '',
          facebook: profile.facebook || '',
          avatar_url: profile.avatar_url || '',
          show_phone: profile.show_phone ?? true,
          show_line: profile.show_line ?? true,
          show_facebook: profile.show_facebook ?? true,
          show_address: profile.show_address ?? true,
        });
      }

      const { data: lost } = await supabase.from('lost_posts').select('*').eq('user_id', id);
      const { data: found } = await supabase.from('found_posts').select('*').eq('user_id', id);
      const { data: adopt } = await supabase.from('adopt_posts').select('*').eq('user_id', id);

      const allPosts = [
        ...(lost || []).map(p => ({ ...p, type: 'lost' })),
        ...(found || []).map(p => ({ ...p, type: 'found' })),
        ...(adopt || []).map(p => ({ ...p, type: 'adopt' }))
      ];
      setUserPosts(allPosts);

      if (allPosts.length > 0) {
        try {
          const [likeStats, commentCounts] = await Promise.all([
            fetchFavoriteStats(allPosts, currentUserId),
            fetchCommentCounts(allPosts),
          ]);
          const merged = {};
          allPosts.forEach((p) => {
            const key = `${p.type}-${p.id}`;
            merged[key] = { ...(likeStats[key] || { count: 0, likedByMe: false }), commentCount: commentCounts[key] || 0 };
          });
          setFeedStats(merged);
        } catch (err) {
          console.error('โหลดสถิติไลก์/คอมเมนต์ไม่สำเร็จ:', err);
        }
      }

      setLoading(false);
    };

    fetchUserProfile();
  }, [id, currentUserId]);

  useEffect(() => {
    if (viewMode !== 'lifefeed' || !id) return;

    const loadLifeFeed = async () => {
      setLifeFeedLoading(true);
      try {
        const posts = await fetchFeedPosts(id);
        setLifeFeedPosts(posts);

        if (posts.length > 0) {
          const feedRefs = posts.map((p) => ({ id: p.id, type: 'feed' }));
          const [likeStats, commentCounts] = await Promise.all([
            fetchFavoriteStats(feedRefs, currentUserId),
            fetchCommentCounts(feedRefs),
          ]);
          const merged = {};
          posts.forEach((p) => {
            const key = `feed-${p.id}`;
            merged[key] = { ...(likeStats[key] || { count: 0, likedByMe: false }), commentCount: commentCounts[key] || 0 };
          });
          setLifeFeedStats(merged);
        }
      } catch (err) {
        console.error('โหลดฟีดอัปเดตชีวิตไม่สำเร็จ:', err);
      } finally {
        setLifeFeedLoading(false);
      }
    };

    loadLifeFeed();
  }, [viewMode, id, currentUserId]);

  const handleToggleLifeLike = async (postId) => {
    if (!currentUserId) {
      navigate('/login');
      return;
    }

    const key = `feed-${postId}`;
    try {
      const nowLiked = await toggleFavorite('feed', postId, currentUserId);
      setLifeFeedStats((prev) => {
        const current = prev[key] || { count: 0, likedByMe: false, commentCount: 0 };
        return {
          ...prev,
          [key]: {
            ...current,
            likedByMe: nowLiked,
            count: Math.max(0, current.count + (nowLiked ? 1 : -1)),
          },
        };
      });
      if (nowLiked) {
        notifyPostOwner('feed', postId, currentUserId, 'like').catch((err) => console.error('ส่งแจ้งเตือนไม่สำเร็จ:', err));
      }
    } catch (err) {
      console.error('กดถูกใจไม่สำเร็จ:', err);
    }
  };

  const handleDeleteLifePost = async (postId) => {
    if (!currentUserId) return;
    try {
      await deleteFeedPost(postId, currentUserId);
      setLifeFeedPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      console.error('ลบโพสต์ไม่สำเร็จ:', err);
    }
  };

  const handleLifeCommentAdded = (postId) => {
    const key = `feed-${postId}`;
    setLifeFeedStats((prev) => {
      const current = prev[key] || { count: 0, likedByMe: false, commentCount: 0 };
      return { ...prev, [key]: { ...current, commentCount: current.commentCount + 1 } };
    });
  };

  const handleLifeCommentRemoved = (postId) => {
    const key = `feed-${postId}`;
    setLifeFeedStats((prev) => {
      const current = prev[key] || { count: 0, likedByMe: false, commentCount: 0 };
      return { ...prev, [key]: { ...current, commentCount: Math.max(0, current.commentCount - 1) } };
    });
  };

  const handleToggleLike = async (postType, postId) => {
    if (!currentUserId) {
      navigate('/login');
      return;
    }

    const key = `${postType}-${postId}`;
    try {
      const nowLiked = await toggleFavorite(postType, postId, currentUserId);
      setFeedStats((prev) => {
        const current = prev[key] || { count: 0, likedByMe: false, commentCount: 0 };
        return {
          ...prev,
          [key]: {
            ...current,
            likedByMe: nowLiked,
            count: Math.max(0, current.count + (nowLiked ? 1 : -1)),
          },
        };
      });
      if (nowLiked) {
        notifyPostOwner(postType, postId, currentUserId, 'like').catch((err) => console.error('ส่งแจ้งเตือนไม่สำเร็จ:', err));
      }
    } catch (err) {
      console.error('กดถูกใจไม่สำเร็จ:', err);
    }
  };

  // กรองโพสต์ตามประเภทที่เลือก
  const filteredPosts = filter === 'all'
    ? userPosts
    : userPosts.filter(post => post.type === filter);

  const isOwnProfile = !!currentUserId && id === currentUserId;

  if (loading) {
    return (
      <div className="user-profile-page">
        <div className="state-card" style={{ margin: '60px auto', maxWidth: '400px' }}>
          <div className="state-spinner"></div>
          <p>กำลังโหลดโปรไฟล์...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="user-profile-page">
      <div className="user-profile-grid">
        {/* ด้านซ้าย */}
        <div className="user-card-left">
  <div className="user-profile-cover"></div>
  <div className="user-avatar-container">
    <img
      src={user.avatar_url || 'https://placehold.co/120x120'}
      alt="Profile"
    />
  </div>

  <div className="user-info-box">
    <h3>{user.name || 'ยังไม่ระบุชื่อ'}</h3>
    <p className="user-email">{user.email}</p>
    {id && id !== currentUserId && (
      <button
        type="button"
        className="message-user-btn"
        onClick={() => {
          if (!currentUserId) {
            navigate('/login');
            return;
          }
          navigate(`/messages/${id}`);
        }}
      >
        <Icon name="messageCircle" size={16} /> ส่งข้อความ
      </button>
    )}
  </div>

  <div className="user-contact-section">
    <div className="contact-title">ช่องทางการติดต่อ</div>

    {(isOwnProfile || user.show_phone) && (
      <div className="contact-item">
        <span className="contact-icon"><Icon name="phone" size={16} /></span>
        <div className="contact-detail">
          <span className="contact-label">เบอร์โทรศัพท์</span>
          {user.phone ? (
            <a className="contact-value contact-call-link" href={`tel:${user.phone}`}>{user.phone}</a>
          ) : (
            <span className="contact-value">ยังไม่ระบุเบอร์</span>
          )}
        </div>
      </div>
    )}

    {(isOwnProfile || user.show_line) && user.line_id && (
      <div className="contact-item">
        <span className="contact-icon"><Icon name="messageCircle" size={16} /></span>
        <div className="contact-detail">
          <span className="contact-label">LINE ID</span>
          <a
            className="contact-value contact-call-link"
            href={`https://line.me/ti/p/~${encodeURIComponent(user.line_id)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {user.line_id}
          </a>
        </div>
      </div>
    )}

    {(isOwnProfile || user.show_facebook) && user.facebook && (
      <div className="contact-item">
        <span className="contact-icon"><Icon name="link" size={16} /></span>
        <div className="contact-detail">
          <span className="contact-label">Facebook</span>
          <a
            className="contact-value contact-call-link"
            href={user.facebook}
            target="_blank"
            rel="noopener noreferrer"
          >
            {user.facebook}
          </a>
        </div>
      </div>
    )}

    {(isOwnProfile || user.show_address) && (
      <div className="contact-item">
        <span className="contact-icon"><Icon name="mapPin" size={16} /></span>
        <div className="contact-detail">
          <span className="contact-label">ที่อยู่</span>
          <span className="contact-value address-text">{user.address || 'ยังไม่ระบุที่อยู่'}</span>
        </div>
      </div>
    )}

    {!isOwnProfile && !user.show_phone && !user.show_line && !user.show_facebook && !user.show_address && (
      <p className="contact-hidden-note">ผู้ใช้รายนี้เลือกไม่แสดงข้อมูลติดต่อให้คนอื่นเห็น</p>
    )}
  </div>
</div>

        {/* ด้านขวา */}
        <div className="user-posts-list">
          <div className="user-view-tabs">
            <button
              type="button"
              className={`user-view-tab-btn ${viewMode === 'pets' ? 'active' : ''}`}
              onClick={() => setViewMode('pets')}
            >
              <Icon name="package" size={16} /> ประกาศเลี้ยงสัตว์
            </button>
            <button
              type="button"
              className={`user-view-tab-btn ${viewMode === 'lifefeed' ? 'active' : ''}`}
              onClick={() => setViewMode('lifefeed')}
            >
              <Icon name="camera" size={16} /> โพสต์
            </button>
          </div>

          {viewMode === 'pets' && (
            <>
          {/* ปุ่มกรองโพสต์ */}
          <div className="filter-buttons-container">
            <button
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              ทั้งหมด ({userPosts.length})
            </button>
            <button
              className={`filter-btn lost ${filter === 'lost' ? 'active' : ''}`}
              onClick={() => setFilter('lost')}
            >
              <Icon name="search" size={14} /> หาย ({userPosts.filter(p => p.type === 'lost').length})
            </button>
            <button
              className={`filter-btn found ${filter === 'found' ? 'active' : ''}`}
              onClick={() => setFilter('found')}
            >
              <Icon name="home" size={14} /> พบ ({userPosts.filter(p => p.type === 'found').length})
            </button>
            <button
              className={`filter-btn adopt ${filter === 'adopt' ? 'active' : ''}`}
              onClick={() => setFilter('adopt')}
            >
              <Icon name="clipboardList" size={14} /> หาบ้าน ({userPosts.filter(p => p.type === 'adopt').length})
            </button>
          </div>

          {/* รายการโพสต์ที่ผ่านการกรองแล้ว */}
          {filteredPosts.length > 0 ? filteredPosts.map(post => {
            const stats = feedStats[`${post.type}-${post.id}`] || { count: 0, likedByMe: false, commentCount: 0 };
            return (
              <div key={post.id} className={`user-post-item ${post.type}-user-card`}>
                <Link
                  to={`/post/${post.type}/${post.id}`}
                  className="user-post-link"
                >
                  <div className="user-post-img">
                    <img src={post.image_url || 'https://placehold.co/120x120'} alt={post.name} />
                  </div>

                  <div className="user-post-info">
                    <span className={`type-badge ${post.type}`}>
                      <Icon name={TYPE_META[post.type].icon} size={13} /> {TYPE_META[post.type].label}
                    </span>
                    <h4>{post.name}</h4>
                    <p><strong>สายพันธุ์:</strong> {post.breed || 'ไม่ระบุ'}</p>
                    <p><strong>อายุ:</strong> {post.age || 'ไม่ระบุ'}</p>
                  </div>
                </Link>

                <div className="post-social-row">
                  <button
                    type="button"
                    className={`post-like-btn ${stats.likedByMe ? 'active' : ''}`}
                    onClick={() => handleToggleLike(post.type, post.id)}
                  >
                    <Icon name="heart" size={15} /> {stats.count}
                  </button>
                  <Link to={`/post/${post.type}/${post.id}`} className="post-comment-link">
                    <Icon name="messageCircle" size={15} /> {stats.commentCount}
                  </Link>
                </div>
              </div>
            );
          }) : (
            <div className="state-card empty-state">
              <span className="state-icon"><Icon name="pawprint" size={40} /></span>
              <h3>ไม่มีประกาศในหมวดหมู่นี้</h3>
              <p>ลองเลือกหมวดหมู่อื่นดูนะครับ</p>
            </div>
          )}
            </>
          )}

          {viewMode === 'lifefeed' && (
            <div className="user-life-feed-list">
              {lifeFeedLoading ? (
                <div className="state-card">
                  <div className="state-spinner"></div>
                  <p>กำลังโหลดฟีด...</p>
                </div>
              ) : lifeFeedPosts.length === 0 ? (
                <div className="state-card empty-state">
                  <span className="state-icon"><Icon name="camera" size={40} /></span>
                  <h3>ยังไม่มีการอัปเดต</h3>
                  <p>{user.name || 'ผู้ใช้งานนี้'}ยังไม่ได้แชร์เรื่องราวอะไรเลย</p>
                </div>
              ) : (
                lifeFeedPosts.map((post) => (
                  <FeedPostCard
                    key={post.id}
                    post={post}
                    authorProfile={{ full_name: user.name, avatar_url: user.avatar_url }}
                    currentUserId={currentUserId}
                    stats={lifeFeedStats[`feed-${post.id}`] || { count: 0, likedByMe: false, commentCount: 0 }}
                    onToggleLike={handleToggleLifeLike}
                    onDelete={handleDeleteLifePost}
                    onCommentAdded={handleLifeCommentAdded}
                    onCommentRemoved={handleLifeCommentRemoved}
                    isOwner={isOwnProfile}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default UserProfile;