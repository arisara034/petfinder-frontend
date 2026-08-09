import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import {
  getOrCreateConversation,
  fetchConversations,
  fetchMessages,
  sendMessage,
  markMessagesRead,
  subscribeToMessages,
  uploadChatImage,
  deleteMessage,
} from '../utils/chat';
import Icon from '../components/Icon';
import './Messages.css';

function Messages() {
  const { otherUserId } = useParams();
  const navigate = useNavigate();
  const currentUserId = localStorage.getItem('userId');

  const [conversations, setConversations] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const getOtherUserId = useCallback(
    (convo) => (convo.user_a === currentUserId ? convo.user_b : convo.user_a),
    [currentUserId]
  );

  const loadConversations = useCallback(async () => {
    if (!currentUserId) return;
    const convos = await fetchConversations(currentUserId);
    setConversations(convos);

    const otherIds = [...new Set(convos.map(getOtherUserId))];
    if (otherIds.length > 0) {
      const { data } = await supabase
        .from('users_profile')
        .select('id, full_name, avatar_url')
        .in('id', otherIds);

      const map = {};
      (data || []).forEach((p) => { map[p.id] = p; });
      setProfiles(map);
    }
  }, [currentUserId, getOtherUserId]);

  useEffect(() => {
    if (!currentUserId) {
      navigate('/login');
      return;
    }
    loadConversations().finally(() => setLoading(false));
  }, [currentUserId, loadConversations, navigate]);

  // 🔄 Polling รายการสนทนา ทุก 5 วินาที (สำรองเผื่อ realtime ไม่ทำงาน)
  useEffect(() => {
    const interval = setInterval(loadConversations, 5000);
    return () => clearInterval(interval);
  }, [loadConversations]);

  // เปิดแชทกับผู้ใช้ที่ระบุใน URL (มาจากปุ่ม "ส่งข้อความ" ที่หน้าโพสต์/โปรไฟล์)
  useEffect(() => {
    const openFromParam = async () => {
      if (!otherUserId || !currentUserId || otherUserId === currentUserId) return;
      const convo = await getOrCreateConversation(currentUserId, otherUserId);
      setActiveConversation(convo);
    };
    openFromParam();
  }, [otherUserId, currentUserId]);

  useEffect(() => {
    if (!activeConversation) return;

    let isMounted = true;
    const load = async () => {
      const msgs = await fetchMessages(activeConversation.id);
      if (isMounted) setMessages(msgs);
      await markMessagesRead(activeConversation.id, currentUserId);
    };
    load();

    const unsubscribe = subscribeToMessages(
      activeConversation.id,
      (newMsg) => {
        setMessages((prev) => (prev.some(m => m.id === newMsg.id) ? prev : [...prev, newMsg]));
        if (newMsg.sender_id !== currentUserId) {
          markMessagesRead(activeConversation.id, currentUserId);
        }
      },
      (updatedMsg) => {
        setMessages((prev) => prev.map(m => (m.id === updatedMsg.id ? updatedMsg : m)));
      }
    );

    // 🔄 Polling ข้อความในห้องที่เปิดอยู่ ทุก 4 วินาที (สำรองเผื่อ realtime ไม่ทำงาน)
    const interval = setInterval(load, 4000);

    return () => {
      isMounted = false;
      unsubscribe();
      clearInterval(interval);
    };
  }, [activeConversation, currentUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectConversation = (convo) => {
    setActiveConversation(convo);
    navigate(`/messages/${getOtherUserId(convo)}`, { replace: true });
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleCancelImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async (e) => {
    e.preventDefault();
    const text = messageText.trim();
    if ((!text && !imageFile) || !activeConversation) return;

    setSending(true);
    try {
      let imageUrl = null;
      if (imageFile) {
        imageUrl = await uploadChatImage(imageFile, activeConversation.id);
      }

      setMessageText('');
      handleCancelImage();

      const sent = await sendMessage(activeConversation.id, currentUserId, text, imageUrl);
      setMessages((prev) => (prev.some(m => m.id === sent.id) ? prev : [...prev, sent]));
      loadConversations();
    } catch (err) {
      console.error('ส่งข้อความไม่สำเร็จ:', err);
    } finally {
      setSending(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!messageToDelete || !activeConversation) return;

    try {
      await deleteMessage(messageToDelete.id, currentUserId, activeConversation.id);
      setMessages((prev) => prev.map(m => (
        m.id === messageToDelete.id ? { ...m, deleted_at: new Date().toISOString() } : m
      )));
      loadConversations();
    } catch (err) {
      console.error('ยกเลิกข้อความไม่สำเร็จ:', err);
    } finally {
      setMessageToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="messages-page">
        <div className="state-card" style={{ margin: '60px auto', maxWidth: '400px' }}>
          <div className="state-spinner"></div>
          <p>กำลังโหลดข้อความ...</p>
        </div>
      </div>
    );
  }

  const activeOtherId = activeConversation ? getOtherUserId(activeConversation) : null;
  const activeProfile = activeOtherId ? profiles[activeOtherId] : null;

  // 👁️ หาข้อความล่าสุดของเราที่อีกฝ่ายอ่านแล้ว เพื่อโชว์ป้าย "อ่านแล้ว" ใต้ข้อความนั้นข้อความเดียว (แบบ LINE/Messenger)
  const lastReadMineId = [...messages]
    .reverse()
    .find((m) => m.sender_id === currentUserId && !m.deleted_at && m.read_at)?.id;

  return (
    <div className="messages-page">
      <div className="messages-grid">
        <div className="conversations-sidebar">
          <h2><Icon name="messageCircle" size={22} /> ข้อความ</h2>

          {conversations.length === 0 ? (
            <div className="state-card empty-state">
              <span className="state-icon"><Icon name="messageCircle" size={44} /></span>
              <h3>ยังไม่มีการสนทนา</h3>
              <p>ทักทายเจ้าของโพสต์เพื่อเริ่มพูดคุยได้เลย</p>
            </div>
          ) : (
            <div className="conversation-list">
              {conversations.map((convo) => {
                const otherId = getOtherUserId(convo);
                const otherProfile = profiles[otherId];
                const isActive = activeConversation?.id === convo.id;

                return (
                  <button
                    key={convo.id}
                    className={`conversation-item ${isActive ? 'active' : ''}`}
                    onClick={() => handleSelectConversation(convo)}
                  >
                    <img
                      src={otherProfile?.avatar_url || 'https://placehold.co/48x48'}
                      alt={otherProfile?.full_name || 'ผู้ใช้'}
                      className="conversation-avatar"
                    />
                    <div className="conversation-info">
                      <span className="conversation-name">{otherProfile?.full_name || 'ผู้ใช้ PetFinder'}</span>
                      <span className="conversation-preview">{convo.last_message || 'เริ่มการสนทนา'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="chat-panel">
          {!activeConversation ? (
            <div className="state-card empty-state chat-placeholder">
              <span className="state-icon"><Icon name="pawprint" size={44} /></span>
              <h3>เลือกการสนทนา</h3>
              <p>เลือกรายชื่อทางซ้ายเพื่อเริ่มพูดคุย</p>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="chat-header"
                onClick={() => activeOtherId && navigate(`/user/${activeOtherId}`)}
              >
                <img
                  src={activeProfile?.avatar_url || 'https://placehold.co/40x40'}
                  alt=""
                  className="chat-header-avatar"
                />
                <span>{activeProfile?.full_name || 'ผู้ใช้ PetFinder'}</span>
                <Icon name="arrowRight" size={16} className="chat-header-arrow" />
              </button>

              <div className="chat-messages">
                {messages.map((msg) => {
                  const isMine = msg.sender_id === currentUserId;
                  const isDeleted = !!msg.deleted_at;

                  return (
                    <div key={msg.id} className="chat-message-group">
                      <div className={`chat-bubble-row ${isMine ? 'mine' : 'theirs'}`}>
                        {isMine && !isDeleted && (
                          <button
                            type="button"
                            className="message-delete-btn"
                            onClick={() => setMessageToDelete(msg)}
                            aria-label="ยกเลิกข้อความ"
                          >
                            <Icon name="x" size={13} />
                          </button>
                        )}

                        {isDeleted ? (
                          <div className="chat-bubble deleted">
                            <Icon name="ban" size={14} />
                            ข้อความนี้ถูกยกเลิกแล้ว
                          </div>
                        ) : (
                          <div className={`chat-bubble ${msg.image_url ? 'has-image' : ''}`}>
                            {msg.image_url && (
                              <a href={msg.image_url} target="_blank" rel="noopener noreferrer">
                                <img src={msg.image_url} alt="รูปภาพที่ส่ง" className="chat-bubble-image" />
                              </a>
                            )}
                            {msg.content && <span>{msg.content}</span>}
                          </div>
                        )}
                      </div>

                      {msg.id === lastReadMineId && (
                        <div className="read-receipt">อ่านแล้ว</div>
                      )}
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {imagePreview && (
                <div className="chat-image-preview">
                  <img src={imagePreview} alt="ตัวอย่างรูปที่จะส่ง" />
                  <button type="button" className="chat-image-preview-remove" onClick={handleCancelImage}>
                    <Icon name="x" size={14} />
                  </button>
                </div>
              )}

              <form className="chat-input-row" onSubmit={handleSend}>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageSelect}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  className="chat-attach-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sending}
                >
                  <Icon name="image" size={18} />
                </button>
                <input
                  type="text"
                  placeholder="พิมพ์ข้อความ..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  disabled={sending}
                />
                <button type="submit" disabled={sending || (!messageText.trim() && !imageFile)}>
                  <Icon name="send" size={16} />
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {messageToDelete && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="custom-alert-box">
            <div className="alert-icon-wrap"><Icon name="alertTriangle" size={28} /></div>
            <h3>ยกเลิกข้อความนี้?</h3>
            <p>ข้อความจะแสดงเป็น "ข้อความนี้ถูกยกเลิกแล้ว" ให้อีกฝ่ายเห็น การกระทำนี้ไม่สามารถย้อนกลับได้</p>
            <div className="alert-action-btns" style={{ display: 'flex', gap: '10px' }}>
              <button
                className="alert-btn-close"
                style={{ background: '#e2e8f0', color: '#4a5568', flex: 1 }}
                onClick={() => setMessageToDelete(null)}
              >
                ยกเลิก
              </button>
              <button
                className="alert-btn-close"
                style={{ background: '#e53e3e', color: '#ffffff', flex: 1 }}
                onClick={handleConfirmDelete}
              >
                ยืนยัน
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Messages;
