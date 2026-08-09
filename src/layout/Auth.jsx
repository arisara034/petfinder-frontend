import { useState } from 'react';
// 🌟 1. นำเข้า useNavigate จาก react-router-dom
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import './Auth.css';

function Auth() {
  const [isSignUp, setIsSignUp] = useState(false);
  
  // 🌟 2. ประกาศตัวแปรเรียกใช้งาน navigate
  const navigate = useNavigate(); 

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isSignUp) {
      navigate('/'); 
    } else {
      navigate('/'); 
    }
  };

  return (
    <div className="auth-page">
      {/* ... โค้ด HTML/JSX ส่วนที่เหลือเหมือนเดิมทุกประการ ... */}
      <div className="auth-card">
        <div className="auth-header">
          <span className="auth-logo-icon"><Icon name="pawprint" size={28} /></span>
          <h2>{isSignUp ? 'สมัครสมาชิก PetFinder AI' : 'ยินดีต้อนรับกลับมา'}</h2>
          <p>{isSignUp ? 'สร้างบัญชีเพื่อเริ่มต้นช่วยเหลือน้องๆ' : 'เข้าสู่ระบบเพื่อจัดการประกาศและดูการแจ้งเตือน'}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {isSignUp && (
            <div className="form-group">
              <label className="form-label">ชื่อ-นามสกุล</label>
              <input type="text" className="form-input" placeholder="เช่น Pattarapol Parnsuk" required />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">อีเมล</label>
            <input type="email" className="form-input" placeholder="example@email.com" required />
          </div>

          <div className="form-group">
            <label className="form-label">รหัสผ่าน</label>
            <input type="password" className="form-input" placeholder="••••••••" minLength="6" required />
          </div>

          <button type="submit" className="auth-submit-btn">
            {isSignUp ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {isSignUp ? 'มีบัญชีอยู่แล้วใช่ไหม?' : 'ยังไม่มีบัญชีใช่ไหม?'} 
            <button className="auth-toggle-btn" onClick={() => setIsSignUp(!isSignUp)}>
              {isSignUp ? 'เข้าสู่ระบบที่นี่' : 'สมัครสมาชิกที่นี่'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Auth;