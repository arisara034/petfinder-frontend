import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { API_BASE } from '../../config';
import './Admin.css';

function AdminLayout() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('checking'); // checking | ok | denied

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');

    if (!token || !userId) {
      setStatus('denied');
      navigate('/login');
      return;
    }

    fetch(`${API_BASE}/api/auth/profile/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.role === 'admin') {
          setStatus('ok');
        } else {
          setStatus('denied');
          navigate('/');
        }
      })
      .catch(() => {
        setStatus('denied');
        navigate('/');
      });
  }, [navigate]);

  if (status !== 'ok') {
    return (
      <div className="admin-loading">
        {status === 'checking' ? 'กำลังตรวจสอบสิทธิ์...' : 'ไม่มีสิทธิ์เข้าถึง'}
      </div>
    );
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-title">แผงควบคุมแอดมิน</div>
        <nav className="admin-nav">
          <NavLink to="/admin" end className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>ภาพรวม</NavLink>
          <NavLink to="/admin/users" className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>ผู้ใช้</NavLink>
          <NavLink to="/admin/posts" className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>โพสต์</NavLink>
          <NavLink to="/admin/comments" className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>คอมเมนต์</NavLink>
          <NavLink to="/admin/reports" className={({ isActive }) => `admin-nav-link ${isActive ? 'active' : ''}`}>รายงาน</NavLink>
        </nav>
        <button className="admin-back-btn" onClick={() => navigate('/')}>← กลับหน้าเว็บหลัก</button>
      </aside>
      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
}

export default AdminLayout;
