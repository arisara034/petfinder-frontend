import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './PostDetail.css';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import Icon from '../components/Icon';
import { fetchComments, addComment, updateComment, deleteComment } from '../utils/comments';
import { isFavorited, toggleFavorite } from '../utils/favorites';
import { notifyPostOwner } from '../utils/notifications';
import { submitReport } from '../utils/admin';

let DefaultIcon = L.icon({
    iconUrl: markerIcon, shadowUrl: markerShadow, iconSize: [25, 41], iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

function PostDetail() {
  const { type, id } = useParams(); 
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [imageList, setImageList] = useState([]);
  const [activeImage, setActiveImage] = useState('');

  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [savingComment, setSavingComment] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);

  const [favorited, setFavorited] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [reporting, setReporting] = useState(false);

  const navigate = useNavigate();
  const currentUserId = localStorage.getItem('userId');

  useEffect(() => {
    const fetchPostDetail = async () => {
      setLoading(true);

      const tableName = type === 'lost' ? 'lost_posts' : 
                        type === 'found' ? 'found_posts' : 'adopt_posts';
      
      // 1. ดึงข้อมูลโพสต์
      const { data: postData, error: postError } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', id)
        .single();
        
      if (postError) {
        console.error("ไม่พบโพสต์:", postError);
        setLoading(false);
        return;
      }

      // 2. ดึงข้อมูล Profile ของเจ้าของโพสต์ (👉 เพิ่ม avatar_url หรือชื่อฟิลด์รูปโปรไฟล์ของคุณ เช่น avatar, profile_image)
      if (postData.user_id) {
        let { data: profileData, error: profileError } = await supabase
          .from('users_profile')
          .select('full_name, phone, avatar_url, line_id, facebook, show_phone, show_line, show_facebook')
          .eq('id', postData.user_id)
          .single();

        // เผื่อคอลัมน์ show_* ยังไม่ถูกสร้างในฐานข้อมูล (migration ยังไม่รัน) ให้ดึงข้อมูลพื้นฐานแทน
        if (profileError) {
          const fallback = await supabase
            .from('users_profile')
            .select('full_name, phone, avatar_url, line_id, facebook')
            .eq('id', postData.user_id)
            .single();
          profileData = fallback.data;
        }

        postData.users_profile = profileData;
      }

      setPost(postData);

      let photos = [];
      if (postData.images && Array.isArray(postData.images) && postData.images.length > 0) {
        photos = postData.images;
      } else if (postData.image_url) {
        photos = [postData.image_url];
      } else {
        photos = ['https://placehold.co/600x400'];
      }

      setImageList(photos);
      setActiveImage(photos[0]);

      setLoading(false);
    };

    fetchPostDetail();
  }, [type, id]);

  useEffect(() => {
    const loadComments = async () => {
      setCommentsLoading(true);
      try {
        const data = await fetchComments(type, id);
        setComments(data);
      } catch (err) {
        console.error('โหลดความคิดเห็นไม่สำเร็จ:', err);
      } finally {
        setCommentsLoading(false);
      }
    };

    loadComments();
  }, [type, id]);

  useEffect(() => {
    const checkFavorite = async () => {
      if (!currentUserId) {
        setFavorited(false);
        return;
      }
      try {
        const fav = await isFavorited(type, id, currentUserId);
        setFavorited(fav);
      } catch (err) {
        console.error('ตรวจสอบรายการโปรดไม่สำเร็จ:', err);
      }
    };

    checkFavorite();
  }, [type, id, currentUserId]);

  const handleToggleFavorite = async () => {
    if (!currentUserId) {
      navigate('/login');
      return;
    }

    setFavoriteLoading(true);
    try {
      const newState = await toggleFavorite(type, id, currentUserId);
      setFavorited(newState);
      if (newState) {
        notifyPostOwner(type, id, currentUserId, 'like').catch((err) => console.error('ส่งแจ้งเตือนไม่สำเร็จ:', err));
      }
    } catch (err) {
      console.error('กดถูกใจไม่สำเร็จ:', err);
    } finally {
      setFavoriteLoading(false);
    }
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text) return;

    if (!currentUserId) {
      navigate('/login');
      return;
    }

    setPostingComment(true);
    try {
      const newComment = await addComment(type, id, currentUserId, text);
      setComments((prev) => [...prev, newComment]);
      setCommentText('');
      notifyPostOwner(type, id, currentUserId, 'comment').catch((err) => console.error('ส่งแจ้งเตือนไม่สำเร็จ:', err));
    } catch (err) {
      console.error('แสดงความคิดเห็นไม่สำเร็จ:', err);
    } finally {
      setPostingComment(false);
    }
  };

  const handleStartEditComment = (c) => {
    setEditingCommentId(c.id);
    setEditCommentText(c.content);
  };

  const handleCancelEditComment = () => {
    setEditingCommentId(null);
    setEditCommentText('');
  };

  const handleSaveEditComment = async (commentId) => {
    const text = editCommentText.trim();
    if (!text) return;

    setSavingComment(true);
    try {
      const updated = await updateComment(commentId, currentUserId, text);
      setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, content: updated.content } : c)));
      setEditingCommentId(null);
    } catch (err) {
      console.error('แก้ไขความคิดเห็นไม่สำเร็จ:', err);
    } finally {
      setSavingComment(false);
    }
  };

  const handleConfirmDeleteComment = async () => {
    if (!commentToDelete) return;

    try {
      await deleteComment(commentToDelete, currentUserId);
      setComments((prev) => prev.filter((c) => c.id !== commentToDelete));
    } catch (err) {
      console.error('ลบความคิดเห็นไม่สำเร็จ:', err);
    } finally {
      setCommentToDelete(null);
    }
  };

  const handleReportPost = async () => {
    if (!currentUserId) {
      navigate('/login');
      return;
    }
    const reason = window.prompt('เหตุผลที่รายงานโพสต์นี้ (เช่น ข้อมูลเท็จ, สแปม, ไม่เหมาะสม):');
    if (!reason || !reason.trim()) return;

    setReporting(true);
    try {
      await submitReport(type, id, reason.trim());
      alert('ส่งรายงานเรียบร้อยแล้ว ทีมงานจะตรวจสอบโดยเร็วที่สุด 🙏');
    } catch (err) {
      alert(err.message || 'ไม่สามารถส่งรายงานได้');
    } finally {
      setReporting(false);
    }
  };

  if (loading) return <div className="detail-loading">กำลังโหลดข้อมูล...</div>;
  if (!post) return <div className="detail-error">ไม่พบประกาศนี้ในระบบ</div>;

  return (
    <div className="post-detail-page">    
      <div className="detail-card">
        
        <div className="detail-image-gallery">
          <div className="detail-main-image">
            <img src={activeImage} alt={post.name || "pet"} />
          </div>

          {imageList.length > 1 && (
            <div className="detail-thumbnails">
              {imageList.map((imgUrl, index) => (
                <div 
                  key={index} 
                  className={`thumbnail-item ${activeImage === imgUrl ? 'active' : ''}`}
                  onClick={() => setActiveImage(imgUrl)}
                >
                  <img src={imgUrl} alt={`Thumbnail ${index + 1}`} />
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="detail-content">
          <span className={`type-badge ${type}`}>{type}</span>
          <div className="detail-title-row">
            <h1>{post.name || "ไม่ระบุ"}</h1>
            <button
              type="button"
              className={`favorite-btn ${favorited ? 'active' : ''}`}
              onClick={handleToggleFavorite}
              disabled={favoriteLoading}
              aria-label={favorited ? 'เอาออกจากรายการโปรด' : 'เพิ่มในรายการโปรด'}
            >
              <Icon name="heart" size={20} />
            </button>
          </div>
          
          {/* 👤 ส่วนข้อมูลผู้โพสต์ พร้อมรูปโปรไฟล์ */}
          <div 
            className="user-info-section" 
            onClick={() => {
              if (post.user_id) {
                navigate(`/user/${post.user_id}`);
              }
            }}
          >
            <div className="user-profile-left">
              <img 
                src={post.users_profile?.avatar_url || 'https://placehold.co/150'} 
                alt="Profile Avatar" 
                className="user-avatar-img"
              />
              <div>
                <p className="poster-label">ผู้โพสต์</p>
                <p className="poster-name">{post.users_profile?.full_name || 'สมาชิก PetFinder'}</p>
              </div>
            </div>
            <div className="user-info-actions">
              {post.user_id && post.user_id !== localStorage.getItem('userId') && (
                <button
                  type="button"
                  className="message-poster-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!localStorage.getItem('userId')) {
                      navigate('/login');
                      return;
                    }
                    navigate(`/messages/${post.user_id}`);
                  }}
                >
                  <Icon name="messageCircle" size={16} /> ส่งข้อความ
                </button>
              )}
              {post.user_id !== currentUserId && (
                <button
                  type="button"
                  className="message-poster-btn"
                  style={{ background: 'transparent', color: '#d63031', border: '1px solid #ffd6d5' }}
                  disabled={reporting}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReportPost();
                  }}
                >
                  <Icon name="alertTriangle" size={16} /> รายงานโพสต์
                </button>
              )}
            </div>
          </div>

          <p><strong>สายพันธุ์:</strong> {post.breed || 'ไม่ระบุ'}</p>
          <p><strong>อายุ:</strong> {post.age || 'ไม่ระบุ'}</p>
          <p><strong>สถานที่:</strong> {post.location_note || post.locationNote || 'ไม่ระบุพิกัด'}</p>
          {(post.district || post.province) && (
            <p><strong>จังหวัด/อำเภอ:</strong> {[post.district, post.province].filter(Boolean).join(', ')}</p>
          )}
          
          {post.latitude && post.longitude && (
            <div className="map-section" style={{ margin: '20px 0' }}>
              <MapContainer 
                center={[post.latitude, post.longitude]} 
                zoom={15} 
                style={{ height: '300px', width: '100%', borderRadius: '10px' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={[post.latitude, post.longitude]} />
              </MapContainer>
            </div>
          )}

          <p><strong>รายละเอียดเพิ่มเติม:</strong></p>
          <p className="note-text">{post.note || 'ไม่มีรายละเอียดเพิ่มเติม'}</p>
          
          <div className="contact-section">
            <h3>ข้อมูลติดต่อ</h3>
            <p className="contact-box">
              <Icon name="phone" size={16} />{' '}
              {(post.users_profile?.show_phone !== false && post.users_profile?.phone) || post.contact || 'ไม่มีเบอร์โทรศัพท์ระบุ'}
            </p>
            {post.users_profile?.show_line !== false && post.users_profile?.line_id && (
              <p className="contact-box">
                <Icon name="messageCircle" size={16} /> LINE:{' '}
                <a href={`https://line.me/ti/p/~${encodeURIComponent(post.users_profile.line_id)}`} target="_blank" rel="noopener noreferrer">
                  {post.users_profile.line_id}
                </a>
              </p>
            )}
            {post.users_profile?.show_facebook !== false && post.users_profile?.facebook && (
              <p className="contact-box">
                <Icon name="link" size={16} /> Facebook:{' '}
                <a href={post.users_profile.facebook} target="_blank" rel="noopener noreferrer">
                  {post.users_profile.facebook}
                </a>
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="comments-card">
        <h3><Icon name="messageCircle" size={20} /> ความคิดเห็น ({comments.length})</h3>

        {currentUserId ? (
          <form className="comment-form" onSubmit={handleSubmitComment}>
            <input
              type="text"
              placeholder="แสดงความคิดเห็น..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              disabled={postingComment}
            />
            <button type="submit" disabled={postingComment || !commentText.trim()}>
              <Icon name="send" size={16} />
            </button>
          </form>
        ) : (
          <p className="comment-login-hint">
            <a href="/login" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>เข้าสู่ระบบ</a> เพื่อแสดงความคิดเห็น
          </p>
        )}

        {commentsLoading ? (
          <div className="state-card" style={{ boxShadow: 'none', border: 'none' }}>
            <div className="state-spinner"></div>
            <p>กำลังโหลดความคิดเห็น...</p>
          </div>
        ) : comments.length === 0 ? (
          <div className="state-card empty-state" style={{ boxShadow: 'none', border: 'none' }}>
            <span className="state-icon"><Icon name="messageCircle" size={36} /></span>
            <p>ยังไม่มีความคิดเห็น เป็นคนแรกที่แสดงความคิดเห็นเลย</p>
          </div>
        ) : (
          <div className="comment-list">
            {comments.map((c) => {
              const isOwner = currentUserId && c.user_id === currentUserId;
              const isEditingThis = editingCommentId === c.id;

              return (
                <div key={c.id} className="comment-item">
                  <img
                    src={c.users_profile?.avatar_url || 'https://placehold.co/40x40'}
                    alt={c.users_profile?.full_name || 'ผู้ใช้'}
                    className="comment-avatar"
                    onClick={() => navigate(`/user/${c.user_id}`)}
                  />
                  <div className="comment-body">
                    <span className="comment-author" onClick={() => navigate(`/user/${c.user_id}`)}>
                      {c.users_profile?.full_name || 'ผู้ใช้ PetFinder'}
                    </span>

                    {isEditingThis ? (
                      <div className="comment-edit-row">
                        <input
                          type="text"
                          value={editCommentText}
                          onChange={(e) => setEditCommentText(e.target.value)}
                          disabled={savingComment}
                          autoFocus
                        />
                        <button
                          type="button"
                          className="comment-edit-save"
                          onClick={() => handleSaveEditComment(c.id)}
                          disabled={savingComment || !editCommentText.trim()}
                        >
                          บันทึก
                        </button>
                        <button
                          type="button"
                          className="comment-edit-cancel"
                          onClick={handleCancelEditComment}
                          disabled={savingComment}
                        >
                          ยกเลิก
                        </button>
                      </div>
                    ) : (
                      <p className="comment-content">{c.content}</p>
                    )}

                    {isOwner && !isEditingThis && (
                      <div className="comment-owner-actions">
                        <button type="button" onClick={() => handleStartEditComment(c)}>แก้ไข</button>
                        <button type="button" onClick={() => setCommentToDelete(c.id)}>ลบ</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {commentToDelete && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="custom-alert-box">
            <div className="alert-icon-wrap"><Icon name="alertTriangle" size={28} /></div>
            <h3>ลบความคิดเห็นนี้?</h3>
            <p>การกระทำนี้ไม่สามารถย้อนกลับได้</p>
            <div className="alert-action-btns" style={{ display: 'flex', gap: '10px' }}>
              <button
                className="alert-btn-close"
                style={{ background: '#e2e8f0', color: '#4a5568', flex: 1 }}
                onClick={() => setCommentToDelete(null)}
              >
                ยกเลิก
              </button>
              <button
                className="alert-btn-close"
                style={{ background: '#e53e3e', color: '#ffffff', flex: 1 }}
                onClick={handleConfirmDeleteComment}
              >
                ลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PostDetail;