// 1. เปลี่ยนจาก Link เป็น NavLink
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react'; // เพิ่ม useEffect
import Dropdown from './Dropdown';
import { fetchUnreadCount } from '../utils/chat';
import { API_BASE } from '../config';
import Icon from './Icon';
import NotificationBell from './NotificationBell';
import './Nav.css';

function Nav() {
  const [isOpen, setIsOpen] = useState(false);
  const [profile, setProfile] = useState(null); // 1. เพิ่ม state เก็บข้อมูลโปรไฟล์
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  // 👤 เช็กสถานะ Token
  const isLoggedIn = !!localStorage.getItem('token');
  const userId = localStorage.getItem('userId');

  // 2. เพิ่ม useEffect เพื่อดึงข้อมูลโปรไฟล์เมื่อล็อกอินแล้ว
  useEffect(() => {
    if (isLoggedIn && userId) {
      fetch(`${API_BASE}/api/auth/profile/${userId}`)
        .then((res) => res.json())
        .then((data) => {
          setProfile(data); // เก็บข้อมูลที่ได้มาลง state
        })
        .catch((err) => console.error("Error fetching profile:", err));
    }
  }, [isLoggedIn, userId]);

  useEffect(() => {
  const handleProfileUpdate = () => {
    // ดึงข้อมูลใหม่เมื่อมีการส่งสัญญาณ
    if (userId) {
      fetch(`${API_BASE}/api/auth/profile/${userId}`)
        .then((res) => res.json())
        .then((data) => setProfile(data));
    }
  };

  // ฟัง Event ที่เราจะสร้างขึ้นจากหน้า Profile
  window.addEventListener('profileUpdated', handleProfileUpdate);

  return () => {
    window.removeEventListener('profileUpdated', handleProfileUpdate);
  };
}, [userId]);

  // 💬 ดึงจำนวนข้อความที่ยังไม่ได้อ่าน (poll ทุก 15 วินาที)
  useEffect(() => {
    if (!isLoggedIn || !userId) return;

    const loadUnread = () => {
      fetchUnreadCount(userId)
        .then(setUnreadCount)
        .catch((err) => console.error('Error fetching unread count:', err));
    };

    loadUnread();
    const interval = setInterval(loadUnread, 15000);
    return () => clearInterval(interval);
  }, [isLoggedIn, userId]);

  return (
    <nav id="Nav-container">
      <div className="nav-brand">
        <Link to="/" className="nav-logo-link">
          <span className="logo-icon"><Icon name="pawprint" size={22} /></span>
          <span className="logo-text">PetFinder <span className="highlight"></span></span>
        </Link>
      </div>

      <div className="nav-center">
        <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>หน้าหลัก</NavLink>
        <NavLink to="/Find" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>ตามหาสัตว์เลี้ยงหาย</NavLink>
        <NavLink to="/Found" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>แจ้งพบเจอสัตว์</NavLink>
        <NavLink to="/Adopt" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>รับเลี้ยงสัตว์</NavLink>
      </div>

      <div className="nav-end">
        {isLoggedIn ? (
          <>
            <NotificationBell userId={userId} />
            <button className="chat-nav-btn" onClick={() => navigate('/messages')} aria-label="ข้อความ">
              <Icon name="messageCircle" size={22} />
              {unreadCount > 0 && <span className="chat-nav-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>
            <button className="profile-btn" onClick={() => setIsOpen(!isOpen)} aria-label="Toggle Menu">
              {/* ถ้ามีรูปใช้รูป ถ้าไม่มีใช้รูป placeholder */}
              <img src={`${profile?.avatar_url || "https://placehold.co/40x40"}?t=${Date.now()}`} alt="User" className="profile-img" />
            </button>
            <Dropdown 
              isOpen={isOpen} 
              onClose={() => setIsOpen(false)} 
              users_profile={profile} // 3. ส่งข้อมูล profile เข้าไปให้ Dropdown
            />
          </>
        ) : (
          <button 
            className="login-nav-btn" 
            onClick={() => navigate('/login')}
            style={{
              backgroundColor: '#ff7675',
              color: '#ffffff',
              border: 'none',
              padding: '8px 20px',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              boxShadow: '0 4px 10px rgba(255, 118, 117, 0.2)',
              transition: 'all 0.2s ease'
            }}
          >
            เข้าสู่ระบบ 
          </button>
        )}
      </div>
    </nav>
  );
}

export default Nav;