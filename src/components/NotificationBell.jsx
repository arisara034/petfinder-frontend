import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon';
import {
  fetchNotifications,
  fetchUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  subscribeToNotifications,
} from '../utils/notifications';
import './NotificationBell.css';

const TYPE_TEXT = {
  like: 'กดถูกใจโพสต์ของคุณ',
  comment: 'แสดงความคิดเห็นในโพสต์ของคุณ',
};

const TYPE_ICON = {
  like: 'heart',
  comment: 'messageCircle',
  nearby: 'mapPin',
};

const NEARBY_POST_LABEL = {
  lost: 'ประกาศตามหาสัตว์เลี้ยง',
  found: 'ประกาศแจ้งพบสัตว์เลี้ยง',
  adopt: 'ประกาศหาบ้านให้สัตว์เลี้ยง',
};

function renderNotificationText(n) {
  const actorName = n.actor_profile?.full_name || 'ผู้ใช้ PetFinder';

  if (n.type === 'nearby') {
    const label = NEARBY_POST_LABEL[n.post_type] || 'ประกาศใหม่';
    return <>มี{label}ใหม่ใกล้บ้านคุณ จาก <strong>{actorName}</strong></>;
  }

  return <><strong>{actorName}</strong> {TYPE_TEXT[n.type] || 'มีการแจ้งเตือนใหม่'}</>;
}

function formatTimeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'เมื่อสักครู่';
  if (mins < 60) return `${mins} นาทีที่แล้ว`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
  const days = Math.floor(hours / 24);
  return `${days} วันที่แล้ว`;
}

function NotificationBell({ userId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!userId) return;

    const loadUnread = () => {
      fetchUnreadNotificationCount(userId)
        .then(setUnreadCount)
        .catch((err) => console.error('โหลดจำนวนแจ้งเตือนไม่สำเร็จ:', err));
    };

    loadUnread();
    const interval = setInterval(loadUnread, 15000);
    const unsubscribe = subscribeToNotifications(userId, loadUnread);

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [userId]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggle = async () => {
    const next = !isOpen;
    setIsOpen(next);
    if (!next) return;

    setLoading(true);
    try {
      const data = await fetchNotifications(userId);
      setNotifications(data);
    } catch (err) {
      console.error('โหลดการแจ้งเตือนไม่สำเร็จ:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (n) => {
    setIsOpen(false);
    if (!n.read_at) {
      try {
        await markNotificationRead(n.id);
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (err) {
        console.error('อัปเดตสถานะการแจ้งเตือนไม่สำเร็จ:', err);
      }
    }
    if (n.post_type === 'feed') {
      // โพสต์ประเภทฟีดอัปเดตชีวิตไม่มีหน้ารายละเอียดแยก ให้กลับไปที่โปรไฟล์ของตัวเอง (แท็บอัปเดตชีวิต)
      navigate('/profile');
    } else {
      navigate(`/post/${n.post_type}/${n.post_id}`);
    }
  };

  const handleMarkAllRead = async (e) => {
    e.stopPropagation();
    try {
      await markAllNotificationsRead(userId);
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
      setUnreadCount(0);
    } catch (err) {
      console.error('อัปเดตสถานะการแจ้งเตือนไม่สำเร็จ:', err);
    }
  };

  return (
    <div className="notif-wrapper" ref={wrapperRef}>
      <button type="button" className="notif-nav-btn" onClick={handleToggle} aria-label="การแจ้งเตือน">
        <Icon name="bell" size={22} />
        {unreadCount > 0 && <span className="notif-nav-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {isOpen && (
        <div className="notif-panel">
          <div className="notif-panel-header">
            <h4>การแจ้งเตือน</h4>
            {unreadCount > 0 && (
              <button type="button" className="notif-mark-all" onClick={handleMarkAllRead}>
                อ่านทั้งหมด
              </button>
            )}
          </div>

          <div className="notif-list">
            {loading ? (
              <div className="notif-empty"><p>กำลังโหลด...</p></div>
            ) : notifications.length === 0 ? (
              <div className="notif-empty">
                <Icon name="bell" size={30} />
                <p>ยังไม่มีการแจ้งเตือน</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  type="button"
                  key={n.id}
                  className={`notif-item ${!n.read_at ? 'unread' : ''}`}
                  onClick={() => handleSelect(n)}
                >
                  <img
                    src={n.actor_profile?.avatar_url || 'https://placehold.co/36x36'}
                    alt=""
                    className="notif-avatar"
                  />
                  <div className="notif-body">
                    <span className="notif-text">{renderNotificationText(n)}</span>
                    <span className="notif-time">{formatTimeAgo(n.created_at)}</span>
                  </div>
                  <Icon name={TYPE_ICON[n.type] || 'bell'} size={15} className="notif-type-icon" />
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
