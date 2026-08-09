import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import { API_BASE } from '../config';
import './Auth.css';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // State สำหรับจัดการ Modal ลืมรหัสผ่าน
  const [isForgotOpen, setIsForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSending, setIsSending] = useState(false);

  // State สำหรับจัดการ Custom Alert (แทนที่ alert แบบเดิม)
  const [alert, setAlert] = useState({ isOpen: false, title: '', message: '', type: '' });

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch(`${API_BASE}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email.trim(),
          password: password 
        })
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('userId', data.user_id);
        localStorage.setItem('userEmail', data.email);

        // เรียกใช้ Custom Alert
        setAlert({ isOpen: true, title: 'ยินดีตอนรับ', message: 'เข้าสู่ระบบแล้ว', type: 'success' });
      } else {
        setAlert({ isOpen: true, title: 'ผิดพลาด', message: data.detail || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง', type: 'error' });
      }
    } catch (error) {
      setAlert({ isOpen: true, title: 'ข้อผิดพลาด', message: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้', type: 'error' });
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setIsSending(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() })
      });
      
      if (response.ok) {
        setAlert({ isOpen: true, title: 'สำเร็จ!', message: 'ส่งลิงก์รีเซ็ตรหัสผ่านไปให้แล้วครับ', type: 'success' });
        setIsForgotOpen(false);
        setForgotEmail('');
      } else {
        setAlert({ isOpen: true, title: 'ไม่พบข้อมูล', message: data.detail || 'ไม่พบอีเมลนี้ในระบบ', type: 'error' });
      }
    } catch (error) {
      setAlert({ isOpen: true, title: 'ข้อผิดพลาด', message: 'เกิดข้อผิดพลาดในการเชื่อมต่อ', type: 'error' });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-container">
        <h2>เข้าสู่ระบบ</h2>
        <p className="auth-subtitle">ยินดีต้อนรับกลับมาสู่ PetFinder AI <Icon name="pawprint" size={16} /></p>
        
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label>อีเมล</label>
            <input type="email" required placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="form-group">
            <label>รหัสผ่าน</label>
            <input type="password" required placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
          </div>

          <div className="forgot-password-link-wrap">
            <button type="button" className="forgot-link-btn" onClick={() => setIsForgotOpen(true)}>ลืมรหัสผ่าน?</button>
          </div>
          
          <button type="submit" className="auth-btn">เข้าสู่ระบบ</button>
        </form>
        
        <p className="switch-auth-text">
          ยังไม่มีบัญชีสมาชิก? 
          <button className="switch-auth-btn" onClick={() => navigate('/register')}>สมัครสมาชิกที่นี่</button>
        </p>
      </div>

      {/* Custom Alert Modal */}
      {alert.isOpen && (
        <div className="modal-overlay">
          <div className={`custom-alert-box ${alert.type}`}>
            <h3>{alert.title}</h3>
            <p>{alert.message}</p>
            <button 
              className="alert-btn-close" 
              onClick={() => {
                setAlert({ ...alert, isOpen: false });
                if (alert.type === 'success') navigate('/');
              }}
            >
              ตกลง
            </button>
          </div>
        </div>
      )}

      {/* Modal ลืมรหัสผ่าน */}
      {isForgotOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="custom-alert-box forgot-modal-box">
            <h3>กู้คืนรหัสผ่าน</h3>
            <p>กรุณากรอกอีเมลที่ใช้สมัครสมาชิก</p>
            <form onSubmit={handleForgotPasswordSubmit}>
              <input type="email" required placeholder="name@example.com" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} />
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button type="button" onClick={() => setIsForgotOpen(false)}>ยกเลิก</button>
                <button type="submit" disabled={isSending}>{isSending ? 'กำลังส่ง...' : 'ส่งลิงก์รีเซ็ต'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;