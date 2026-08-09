import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import './Profile.css';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import PostStatusModal from '../components/PostStatusModal';
import Icon from '../components/Icon';
import { fetchFavoritePosts, fetchFavoriteStats, toggleFavorite } from '../utils/favorites';
import { fetchCommentCounts } from '../utils/comments';
import { fetchFeedPosts, createFeedPost, deleteFeedPost, uploadFeedImage } from '../utils/feedPosts';
import { notifyPostOwner } from '../utils/notifications';
import { reverseGeocodeProvinceDistrict } from '../utils/geocode';
import FeedPostCard from '../components/FeedPostCard';

let DefaultIcon = L.icon({
  iconUrl: markerIcon, shadowUrl: markerShadow, iconSize: [25, 41], iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

function HomeLocationPicker({ position, onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return position ? <Marker position={[position.lat, position.lng]} /> : null;
}

const TYPE_META = {
  lost: { icon: 'search', label: 'ประกาศหาย' },
  found: { icon: 'home', label: 'แจ้งพบ' },
  adopt: { icon: 'clipboardList', label: 'ประกาศหาบ้าน' },
};

function Profile() {
  const [user, setUser] = useState({
    name: '', email: '', phone: '', address: '', line_id: '', facebook: '',
    home_lat: null, home_lng: null, home_province: '', home_district: '',
    show_phone: true, show_line: true, show_facebook: true, show_address: true,
  });
  const [myPosts, setMyPosts] = useState([]);
  const [feedStats, setFeedStats] = useState({});
  const [activeTab, setActiveTab] = useState('posts');
  const [favoritePosts, setFavoritePosts] = useState([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);

  const [lifeFeedPosts, setLifeFeedPosts] = useState([]);
  const [lifeFeedStats, setLifeFeedStats] = useState({});
  const [lifeFeedLoading, setLifeFeedLoading] = useState(false);
  const [lifePostText, setLifePostText] = useState('');
  const [lifePostImageFile, setLifePostImageFile] = useState(null);
  const [lifePostImagePreview, setLifePostImagePreview] = useState(null);
  const [lifePosting, setLifePosting] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: '', phone: '', address: '', line_id: '', facebook: '',
    home_lat: null, home_lng: null, home_province: '', home_district: '',
    show_phone: true, show_line: true, show_facebook: true, show_address: true,
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [statusModal, setStatusModal] = useState(null);

  // 📌 State สำหรับจัดการป็อปอัพยืนยันการลบ
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);

  useEffect(() => {
    fetchProfileData();
  }, []);

  useEffect(() => {
    if (activeTab !== 'favorites') return;

    const loadFavorites = async () => {
      const userId = localStorage.getItem('userId');
      if (!userId) return;

      setFavoritesLoading(true);
      try {
        const posts = await fetchFavoritePosts(userId);
        setFavoritePosts(posts);
      } catch (err) {
        console.error('โหลดรายการโปรดไม่สำเร็จ:', err);
      } finally {
        setFavoritesLoading(false);
      }
    };

    loadFavorites();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'lifefeed') return;

    const loadLifeFeed = async () => {
      const userId = localStorage.getItem('userId');
      if (!userId) return;

      setLifeFeedLoading(true);
      try {
        const posts = await fetchFeedPosts(userId);
        setLifeFeedPosts(posts);

        if (posts.length > 0) {
          const feedRefs = posts.map((p) => ({ id: p.id, type: 'feed' }));
          const [likeStats, commentCounts] = await Promise.all([
            fetchFavoriteStats(feedRefs, userId),
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
  }, [activeTab]);

  // 📌 ฟังก์ชันเปิด Modal ยืนยันการลบ
  const confirmDelete = (postId, postType) => {
    setPostToDelete({ id: postId, type: postType });
    setDeleteModalOpen(true);
  };

  // 📌 ฟังก์ชันลบโพสต์จริงหลังจากกดยืนยันในป็อปอัพ
  const handleDelete = async () => {
    if (!postToDelete) return;

    const { id: postId, type: postType } = postToDelete;
    
    // กำหนดชื่อตารางตาม type
    const tableName = postType === 'lost' ? 'lost_posts' : 
                      postType === 'found' ? 'found_posts' : 'adopt_posts';

    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', postId);

    if (!error) {
      setDeleteModalOpen(false);
      setPostToDelete(null);
      fetchProfileData(); // รีเฟรชข้อมูลหลังจากลบสำเร็จ
    } else {
      setDeleteModalOpen(false);
      setStatusModal({ status: 'error', title: 'ลบโพสต์ไม่สำเร็จ', message: 'เกิดข้อผิดพลาดในการลบโพสต์' });
    }
  };

  const fetchProfileData = async () => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    // ดึงข้อมูลโปรไฟล์
    const { data: profile } = await supabase.from('users_profile').select('*').eq('id', userId).single();
    if (profile) {
      setUser({
        name: profile.full_name || '',
        email: profile.email || '',
        phone: profile.phone || '',
        address: profile.address || '',
        line_id: profile.line_id || '',
        facebook: profile.facebook || '',
        avatar_url : profile.avatar_url ||'',
        home_lat: profile.home_lat ?? null,
        home_lng: profile.home_lng ?? null,
        home_province: profile.home_province || '',
        home_district: profile.home_district || '',
        show_phone: profile.show_phone ?? true,
        show_line: profile.show_line ?? true,
        show_facebook: profile.show_facebook ?? true,
        show_address: profile.show_address ?? true,
      });
    }

    // ดึงโพสต์
    const { data: lost } = await supabase.from('lost_posts').select('*').eq('user_id', userId);
    const { data: found } = await supabase.from('found_posts').select('*').eq('user_id', userId);
    const { data: adopt } = await supabase.from('adopt_posts').select('*').eq('user_id', userId);

    const allPosts = [
      ...(lost || []).map(p => ({ ...p, type: 'lost' })),
      ...(found || []).map(p => ({ ...p, type: 'found' })),
      ...(adopt || []).map(p => ({ ...p, type: 'adopt' }))
    ];
    setMyPosts(allPosts);

    if (allPosts.length > 0) {
      try {
        const [likeStats, commentCounts] = await Promise.all([
          fetchFavoriteStats(allPosts, userId),
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
  };

  const handleToggleLike = async (postType, postId) => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    const key = `${postType}-${postId}`;
    try {
      const nowLiked = await toggleFavorite(postType, postId, userId);
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
        notifyPostOwner(postType, postId, userId, 'like').catch((err) => console.error('ส่งแจ้งเตือนไม่สำเร็จ:', err));
      }
    } catch (err) {
      console.error('กดถูกใจไม่สำเร็จ:', err);
    }
  };

  const handleRemoveFavorite = async (postType, postId) => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    try {
      await toggleFavorite(postType, postId, userId);
      setFavoritePosts((prev) => prev.filter(p => !(p.type === postType && p.id === postId)));
    } catch (err) {
      console.error('เอาออกจากรายการโปรดไม่สำเร็จ:', err);
    }
  };

  const handleLifeImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLifePostImageFile(file);
    setLifePostImagePreview(URL.createObjectURL(file));
  };

  const handleCancelLifeImage = () => {
    setLifePostImageFile(null);
    setLifePostImagePreview(null);
  };

  const handleSubmitLifePost = async (e) => {
    e.preventDefault();
    const text = lifePostText.trim();
    if (!text && !lifePostImageFile) return;

    const userId = localStorage.getItem('userId');
    if (!userId) return;

    setLifePosting(true);
    try {
      let imageUrl = null;
      if (lifePostImageFile) {
        imageUrl = await uploadFeedImage(lifePostImageFile, userId);
      }

      const newPost = await createFeedPost(userId, text, imageUrl ? [imageUrl] : []);
      setLifeFeedPosts((prev) => [newPost, ...prev]);
      setLifeFeedStats((prev) => ({ ...prev, [`feed-${newPost.id}`]: { count: 0, likedByMe: false, commentCount: 0 } }));
      setLifePostText('');
      handleCancelLifeImage();
    } catch (err) {
      console.error('โพสต์อัปเดตชีวิตไม่สำเร็จ:', err);
      setStatusModal({ status: 'error', title: 'โพสต์ไม่สำเร็จ', message: 'ไม่สามารถโพสต์อัปเดตชีวิตได้ กรุณาลองใหม่อีกครั้ง' });
    } finally {
      setLifePosting(false);
    }
  };

  const handleToggleLifeLike = async (postId) => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    const key = `feed-${postId}`;
    try {
      const nowLiked = await toggleFavorite('feed', postId, userId);
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
        notifyPostOwner('feed', postId, userId, 'like').catch((err) => console.error('ส่งแจ้งเตือนไม่สำเร็จ:', err));
      }
    } catch (err) {
      console.error('กดถูกใจไม่สำเร็จ:', err);
    }
  };

  const handleDeleteLifePost = async (postId) => {
    const userId = localStorage.getItem('userId');
    if (!userId) return;

    try {
      await deleteFeedPost(postId, userId);
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

  const handleSave = async () => {
    const userId = localStorage.getItem('userId');
    let newAvatarUrl = user.avatar_url;

    if (avatarFile) {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${userId}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, avatarFile);

      if (uploadError) {
        setStatusModal({ status: 'error', title: 'อัปโหลดรูปไม่สำเร็จ', message: uploadError.message });
        return;
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
      newAvatarUrl = data.publicUrl;
    }

    const { error } = await supabase
      .from('users_profile')
      .update({
        full_name: editData.name,
        phone: editData.phone,
        address: editData.address,
        line_id: editData.line_id,
        facebook: editData.facebook,
        avatar_url: newAvatarUrl,
        home_lat: editData.home_lat,
        home_lng: editData.home_lng,
        home_province: editData.home_province,
        home_district: editData.home_district,
        show_phone: editData.show_phone,
        show_line: editData.show_line,
        show_facebook: editData.show_facebook,
        show_address: editData.show_address,
      })
      .eq('id', userId);

    if (!error) {
      setIsEditing(false);
      setAvatarFile(null);
      fetchProfileData();
      setStatusModal({ status: 'success', title: 'บันทึกสำเร็จ!', message: 'อัปเดตข้อมูลโปรไฟล์ของคุณเรียบร้อยแล้ว' });
    } else {
      setStatusModal({ status: 'error', title: 'บันทึกไม่สำเร็จ', message: 'ไม่สามารถบันทึกข้อมูลโปรไฟล์ได้ กรุณาลองใหม่อีกครั้ง' });
    }
  };

  return (
    <>
      <div className="profile-page">
        <div className="profile-grid">
          <div className="profile-card-left">
            <div className="profile-cover"></div>
            <div className="profile-avatar-mock">
              {isEditing ? (
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => setAvatarFile(e.target.files[0])} 
                />
              ) : (
                <img 
                  src={user.avatar_url || 'https://placehold.co/120x120'} 
                  alt="Profile" 
                  style={{ width: '120px', height: '120px', borderRadius: '50%' }}
                />
              )}
            </div>
            {!isEditing && (
              <div className="profile-info-container">
                <h3>{user.name || 'ยังไม่ระบุชื่อ'}</h3>
                <p className="profile-email"> {user.email}</p>
                <span>ข้อมูลส่วนตัว</span>
                <p className="profile-phone">เบอร์ติดต่อ : {user.phone || 'ยังไม่ระบุเบอร์'}</p>
                <p className="profile-address">ที่อยู่ : {user.address || 'ที่อยู่'}</p>
                <p className="profile-line">LINE ID : {user.line_id || 'ยังไม่ระบุ'}</p>
                <p className="profile-facebook">
                  Facebook : {user.facebook ? (
                    <a href={user.facebook} target="_blank" rel="noopener noreferrer">{user.facebook}</a>
                  ) : 'ยังไม่ระบุ'}
                </p>
                {user.home_district && (
                  <p className="profile-home-area">
                    <Icon name="mapPin" size={14} /> รับแจ้งเตือนพื้นที่ : {[user.home_district, user.home_province].filter(Boolean).join(', ')}
                  </p>
                )}
              </div>
            )}
            <hr className="profile-divider" />
            <div className="profile-stats">
              <div className="profile-stats-title">จำนวนโพสต์</div>
              <div className="profile-stats-grid">
                <div className="profile-stat-item lost-stat">
                  <span className="profile-stat-icon"><Icon name="search" size={22} /></span>
                  <span className="stat-num">{myPosts.filter(p => p.type === 'lost').length}</span>
                  <span className="stat-label">ประกาศหาย</span>
                </div>
                <div className="profile-stat-item found-stat">
                  <span className="profile-stat-icon"><Icon name="home" size={22} /></span>
                  <span className="stat-num">{myPosts.filter(p => p.type === 'found').length}</span>
                  <span className="stat-label">แจ้งพบ</span>
                </div>
                <div className="profile-stat-item adopt-stat">
                  <span className="profile-stat-icon"><Icon name="pawprint" size={22} /></span>
                  <span className="stat-num">{myPosts.filter(p => p.type === 'adopt').length}</span>
                  <span className="stat-label">รับเลี้ยง</span>
                </div>
              </div>
              {!isEditing && (
                <button className="edit-profile-btn" onClick={() => { setIsEditing(true); setEditData(user); }}>แก้ไขโปรไฟล์</button>
              )}
            </div>
          </div>

          <div className="profile-content-right">
            {isEditing ? (
              <div className="profile-edit-panel">
                <h3 className="profile-edit-title">แก้ไขข้อมูลโปรไฟล์</h3>
                <div className="edit-form">
                  <input value={editData.name} onChange={(e) => setEditData({...editData, name: e.target.value})} placeholder="ชื่อ-นามสกุล" />
                  <input value={editData.phone} onChange={(e) => setEditData({...editData, phone: e.target.value})} placeholder="เบอร์โทรศัพท์" />
                  <textarea value={editData.address} onChange={(e) => setEditData({...editData, address: e.target.value})} placeholder="ที่อยู่" />
                  <input value={editData.line_id} onChange={(e) => setEditData({...editData, line_id: e.target.value})} placeholder="LINE ID" />
                  <input value={editData.facebook} onChange={(e) => setEditData({...editData, facebook: e.target.value})} placeholder="ลิงก์ Facebook" />

                  <div className="contact-visibility-group">
                    <label className="form-label"><Icon name="lock" size={16} /> การมองเห็นข้อมูลติดต่อ</label>
                    <p className="home-map-hint">เลือกว่าจะให้คนอื่นเห็นข้อมูลติดต่อช่องทางใดบ้างในหน้าโพสต์และโปรไฟล์ของคุณ</p>

                    <label className="visibility-toggle-row">
                      <span>เบอร์โทรศัพท์</span>
                      <span className={`toggle-switch ${editData.show_phone ? 'on' : ''}`}>
                        <input
                          type="checkbox"
                          checked={editData.show_phone}
                          onChange={(e) => setEditData({ ...editData, show_phone: e.target.checked })}
                        />
                        <span className="toggle-knob"></span>
                      </span>
                    </label>

                    <label className="visibility-toggle-row">
                      <span>LINE ID</span>
                      <span className={`toggle-switch ${editData.show_line ? 'on' : ''}`}>
                        <input
                          type="checkbox"
                          checked={editData.show_line}
                          onChange={(e) => setEditData({ ...editData, show_line: e.target.checked })}
                        />
                        <span className="toggle-knob"></span>
                      </span>
                    </label>

                    <label className="visibility-toggle-row">
                      <span>Facebook</span>
                      <span className={`toggle-switch ${editData.show_facebook ? 'on' : ''}`}>
                        <input
                          type="checkbox"
                          checked={editData.show_facebook}
                          onChange={(e) => setEditData({ ...editData, show_facebook: e.target.checked })}
                        />
                        <span className="toggle-knob"></span>
                      </span>
                    </label>

                    <label className="visibility-toggle-row">
                      <span>ที่อยู่</span>
                      <span className={`toggle-switch ${editData.show_address ? 'on' : ''}`}>
                        <input
                          type="checkbox"
                          checked={editData.show_address}
                          onChange={(e) => setEditData({ ...editData, show_address: e.target.checked })}
                        />
                        <span className="toggle-knob"></span>
                      </span>
                    </label>
                  </div>

                  <div className="home-map-group">
                    <label className="form-label">
                      <Icon name="mapPin" size={16} /> ปักหมุดที่อยู่ (รับการแจ้งเตือนโพสต์ใกล้เคียงระดับอำเภอ)
                    </label>
                    <p className="home-map-hint">คลิกบนแผนที่เพื่อปักหมุดตำแหน่งที่อยู่ของคุณ</p>
                    <div className="home-map-wrapper">
                      <MapContainer
                        center={[editData.home_lat || 13.7563, editData.home_lng || 100.5018]}
                        zoom={editData.home_lat ? 13 : 6}
                        style={{ height: '260px', width: '100%' }}
                      >
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <HomeLocationPicker
                          position={editData.home_lat && editData.home_lng ? { lat: editData.home_lat, lng: editData.home_lng } : null}
                          onPick={async (lat, lng) => {
                            setEditData((prev) => ({ ...prev, home_lat: lat, home_lng: lng }));
                            const result = await reverseGeocodeProvinceDistrict(lat, lng);
                            if (result.province) {
                              setEditData((prev) => ({ ...prev, home_province: result.province, home_district: result.district }));
                            }
                          }}
                        />
                      </MapContainer>
                    </div>
                    {editData.home_district ? (
                      <span className="home-map-area">พื้นที่ที่เลือก: {editData.home_district}, {editData.home_province}</span>
                    ) : (
                      <span className="home-map-area muted">ยังไม่ได้ปักหมุดที่อยู่</span>
                    )}
                  </div>

                  <button className="save-btn" onClick={handleSave}>บันทึก</button>
                  <button className="edit-btn" onClick={() => setIsEditing(false)}>ยกเลิก</button>
                </div>
              </div>
            ) : (
              <div className="profile-tabs">
                <button
                  type="button"
                  className={`profile-tab-btn ${activeTab === 'posts' ? 'active' : ''}`}
                  onClick={() => setActiveTab('posts')}
                >
                  <Icon name="clipboardList" size={16} /> ประกาศของฉัน
                </button>
                <button
                  type="button"
                  className={`profile-tab-btn ${activeTab === 'favorites' ? 'active' : ''}`}
                  onClick={() => setActiveTab('favorites')}
                >
                  <Icon name="heart" size={16} /> รายการโปรด
                </button>
                <button
                  type="button"
                  className={`profile-tab-btn ${activeTab === 'lifefeed' ? 'active' : ''}`}
                  onClick={() => setActiveTab('lifefeed')}
                >
                  <Icon name="camera" size={16} /> โพสต์
                </button>
              </div>
            )}

            {!isEditing && activeTab === 'posts' && (
              <div className="my-posts-list">
                {myPosts.length > 0 ? myPosts.map(post => (
                  <div
                    key={post.id}
                    className={`my-post-item ${post.type}-card`}
                  >
                    <Link
                      to={`/post/${post.type}/${post.id}`}
                      className="post-link-wrapper"
                    >
                      <div className="post-image">
                        <img src={post.image_url || 'https://placehold.co/120x120'} alt={post.name} />
                      </div>

                      <div className="my-post-info">
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
                        className={`post-like-btn ${feedStats[`${post.type}-${post.id}`]?.likedByMe ? 'active' : ''}`}
                        onClick={() => handleToggleLike(post.type, post.id)}
                      >
                        <Icon name="heart" size={15} /> {feedStats[`${post.type}-${post.id}`]?.count || 0}
                      </button>
                      <Link to={`/post/${post.type}/${post.id}`} className="post-comment-link">
                        <Icon name="messageCircle" size={15} /> {feedStats[`${post.type}-${post.id}`]?.commentCount || 0}
                      </Link>
                    </div>

                    <div className="post-action-buttons">
                      <Link
                        to={`/edit-post/${post.type}/${post.id}`}
                        className="edit-post-btn"
                        onClick={(e) => e.stopPropagation()}
                      >
                        แก้ไขโพสต์
                      </Link>

                      <button
                        className="delete-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          confirmDelete(post.id, post.type); // เรียกใช้งานป็อปอัพยืนยัน
                        }}
                      >
                        ลบโพสต์
                      </button>
                    </div>
                  </div>
                )) : (
                  <div className="state-card empty-state">
                    <span className="state-icon"><Icon name="pawprint" size={44} /></span>
                    <h3>ยังไม่มีประกาศ</h3>
                    <p>เริ่มสร้างประกาศแรกของคุณได้เลยที่เมนูด้านบน</p>
                  </div>
                )}
              </div>
            )}

            {!isEditing && activeTab === 'favorites' && (
              <div className="my-posts-list">
                {favoritesLoading ? (
                  <div className="state-card">
                    <div className="state-spinner"></div>
                    <p>กำลังโหลดรายการโปรด...</p>
                  </div>
                ) : favoritePosts.length > 0 ? favoritePosts.map(post => (
                  <div
                    key={`${post.type}-${post.id}`}
                    className={`my-post-item ${post.type}-card`}
                  >
                    <Link
                      to={`/post/${post.type}/${post.id}`}
                      className="post-link-wrapper"
                    >
                      <div className="post-image">
                        <img src={post.image_url || 'https://placehold.co/120x120'} alt={post.name} />
                      </div>

                      <div className="my-post-info">
                        <span className={`type-badge ${post.type}`}>
                          <Icon name={TYPE_META[post.type].icon} size={13} /> {TYPE_META[post.type].label}
                        </span>

                        <h4>{post.name}</h4>
                        <p><strong>สายพันธุ์:</strong> {post.breed || 'ไม่ระบุ'}</p>
                        <p><strong>อายุ:</strong> {post.age || 'ไม่ระบุ'}</p>
                      </div>
                    </Link>

                    <div className="post-action-buttons">
                      <button
                        className="delete-btn"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleRemoveFavorite(post.type, post.id);
                        }}
                      >
                        เอาออกจากรายการโปรด
                      </button>
                    </div>
                  </div>
                )) : (
                  <div className="state-card empty-state">
                    <span className="state-icon"><Icon name="heart" size={44} /></span>
                    <h3>ยังไม่มีรายการโปรด</h3>
                    <p>กดหัวใจที่โพสต์เพื่อบันทึกไว้ดูภายหลัง</p>
                  </div>
                )}
              </div>
            )}

            {!isEditing && activeTab === 'lifefeed' && (
              <div className="life-feed-list">
                <form className="life-post-composer" onSubmit={handleSubmitLifePost}>
                  <textarea
                    placeholder="วันนี้เป็นยังไงบ้าง? แชร์เรื่องราวน้องๆ ของคุณ..."
                    value={lifePostText}
                    onChange={(e) => setLifePostText(e.target.value)}
                    disabled={lifePosting}
                    rows={3}
                  />

                  {lifePostImagePreview && (
                    <div className="life-post-image-preview">
                      <img src={lifePostImagePreview} alt="ตัวอย่างรูปที่จะโพสต์" />
                      <button type="button" className="life-post-image-remove" onClick={handleCancelLifeImage}>
                        <Icon name="x" size={14} />
                      </button>
                    </div>
                  )}

                  <div className="life-post-composer-actions">
                    <label className="life-post-attach-btn">
                      <Icon name="image" size={18} />
                      <input type="file" accept="image/*" onChange={handleLifeImageSelect} style={{ display: 'none' }} />
                    </label>
                    <button type="submit" className="life-post-submit-btn" disabled={lifePosting || (!lifePostText.trim() && !lifePostImageFile)}>
                      {lifePosting ? 'กำลังโพสต์...' : 'โพสต์'}
                    </button>
                  </div>
                </form>

                {lifeFeedLoading ? (
                  <div className="state-card">
                    <div className="state-spinner"></div>
                    <p>กำลังโหลดฟีด...</p>
                  </div>
                ) : lifeFeedPosts.length === 0 ? (
                  <div className="state-card empty-state">
                    <span className="state-icon"><Icon name="camera" size={44} /></span>
                    <h3>ยังไม่มีการอัปเดต</h3>
                    <p>แชร์เรื่องราวน่ารักๆ ของน้องๆ ให้เพื่อนๆ เห็นกันได้เลย</p>
                  </div>
                ) : (
                  lifeFeedPosts.map((post) => (
                    <FeedPostCard
                      key={post.id}
                      post={post}
                      authorProfile={{ full_name: user.name, avatar_url: user.avatar_url }}
                      currentUserId={localStorage.getItem('userId')}
                      stats={lifeFeedStats[`feed-${post.id}`] || { count: 0, likedByMe: false, commentCount: 0 }}
                      onToggleLike={handleToggleLifeLike}
                      onDelete={handleDeleteLifePost}
                      onCommentAdded={handleLifeCommentAdded}
                      onCommentRemoved={handleLifeCommentRemoved}
                      isOwner
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 📌 Custom Delete Modal (ป็อปอัพยืนยันการลบ) */}
      {deleteModalOpen && (
        <div className="modal-overlay">
          <div className="custom-alert-box">
            <div className="alert-icon-wrap"><Icon name="alertTriangle" size={28} /></div>
            <h3>ยืนยันการลบโพสต์</h3>
            <p>คุณต้องการลบประกาศนี้ใช่หรือไม่? การกระทำนี้จะไม่สามารถกู้คืนข้อมูลได้</p>
            <div className="alert-action-btns" style={{ display: 'flex', gap: '10px' }}>
              <button 
                className="alert-btn-close" 
                style={{ background: '#e2e8f0', color: '#4a5568', flex: 1 }}
                onClick={() => setDeleteModalOpen(false)}
              >
                ยกเลิก
              </button>
              <button 
                className="alert-btn-close" 
                style={{ background: '#e53e3e', color: '#ffffff', flex: 1, boxShadow: '0 4px 12px rgba(229, 62, 62, 0.3)' }}
                onClick={handleDelete}
              >
                ลบโพสต์
              </button>
            </div>
          </div>
        </div>
      )}

      <PostStatusModal
        status={statusModal?.status}
        title={statusModal?.title}
        message={statusModal?.message}
        onClose={() => setStatusModal(null)}
      />
    </>
  );
}

export default Profile;