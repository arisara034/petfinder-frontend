import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon';
import { fetchComments, addComment, updateComment, deleteComment } from '../utils/comments';
import { notifyPostOwner } from '../utils/notifications';
import './FeedPostCard.css';

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function FeedPostCard({ post, authorProfile, currentUserId, stats, onToggleLike, onDelete, onCommentAdded, onCommentRemoved, isOwner }) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentsLoaded, setCommentsLoaded] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [savingComment, setSavingComment] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);
  const navigate = useNavigate();

  const handleToggleComments = async () => {
    const next = !showComments;
    setShowComments(next);
    if (next && !commentsLoaded) {
      try {
        const data = await fetchComments('feed', post.id);
        setComments(data);
        setCommentsLoaded(true);
      } catch (err) {
        console.error('โหลดความคิดเห็นไม่สำเร็จ:', err);
      }
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

    setPosting(true);
    try {
      const newComment = await addComment('feed', post.id, currentUserId, text);
      setComments((prev) => [...prev, newComment]);
      setCommentText('');
      onCommentAdded?.(post.id);
      notifyPostOwner('feed', post.id, currentUserId, 'comment').catch((err) => console.error('ส่งแจ้งเตือนไม่สำเร็จ:', err));
    } catch (err) {
      console.error('แสดงความคิดเห็นไม่สำเร็จ:', err);
    } finally {
      setPosting(false);
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
      onCommentRemoved?.(post.id);
    } catch (err) {
      console.error('ลบความคิดเห็นไม่สำเร็จ:', err);
    } finally {
      setCommentToDelete(null);
    }
  };

  return (
    <div className="feed-post-card">
      <div className="feed-post-header">
        <img
          src={authorProfile?.avatar_url || 'https://placehold.co/40x40'}
          alt=""
          className="feed-post-avatar"
          onClick={() => navigate(`/user/${post.user_id}`)}
        />
        <div className="feed-post-header-info">
          <span className="feed-post-author" onClick={() => navigate(`/user/${post.user_id}`)}>
            {authorProfile?.full_name || 'ผู้ใช้ PetFinder'}
          </span>
          <span className="feed-post-time">{formatDate(post.created_at)}</span>
        </div>
        {isOwner && (
          <button type="button" className="feed-post-delete-btn" onClick={() => onDelete(post.id)} aria-label="ลบโพสต์">
            <Icon name="x" size={16} />
          </button>
        )}
      </div>

      {post.content && <p className="feed-post-content">{post.content}</p>}

      {post.image_url && (
        <div className="feed-post-image">
          <img src={post.image_url} alt="รูปในฟีด" />
        </div>
      )}

      <div className="feed-post-actions">
        <button
          type="button"
          className={`feed-like-btn ${stats.likedByMe ? 'active' : ''}`}
          onClick={() => onToggleLike(post.id)}
        >
          <Icon name="heart" size={16} /> {stats.count} ถูกใจ
        </button>
        <button type="button" className="feed-comment-btn" onClick={handleToggleComments}>
          <Icon name="messageCircle" size={16} /> {stats.commentCount} ความคิดเห็น
        </button>
      </div>

      {showComments && (
        <div className="feed-comments-section">
          {comments.length === 0 ? (
            <p className="feed-comments-empty">ยังไม่มีความคิดเห็น เป็นคนแรกที่แสดงความคิดเห็นเลย</p>
          ) : (
            comments.map((c) => {
              const isCommentOwner = currentUserId && c.user_id === currentUserId;
              const isEditingThis = editingCommentId === c.id;

              return (
                <div key={c.id} className="feed-comment-item">
                  <img
                    src={c.users_profile?.avatar_url || 'https://placehold.co/32x32'}
                    alt=""
                    className="feed-comment-avatar"
                    onClick={() => navigate(`/user/${c.user_id}`)}
                  />
                  <div className="feed-comment-body">
                    <span className="feed-comment-author" onClick={() => navigate(`/user/${c.user_id}`)}>
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
                      <p>{c.content}</p>
                    )}

                    {isCommentOwner && !isEditingThis && (
                      <div className="comment-owner-actions">
                        <button type="button" onClick={() => handleStartEditComment(c)}>แก้ไข</button>
                        <button type="button" onClick={() => setCommentToDelete(c.id)}>ลบ</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {currentUserId ? (
            <form className="feed-comment-form" onSubmit={handleSubmitComment}>
              <input
                type="text"
                placeholder="แสดงความคิดเห็น..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                disabled={posting}
              />
              <button type="submit" disabled={posting || !commentText.trim()}>
                <Icon name="send" size={14} />
              </button>
            </form>
          ) : (
            <p className="feed-comment-login-hint">
              <a href="/login" onClick={(e) => { e.preventDefault(); navigate('/login'); }}>เข้าสู่ระบบ</a> เพื่อแสดงความคิดเห็น
            </p>
          )}
        </div>
      )}

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

export default FeedPostCard;
