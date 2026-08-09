import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import { API_BASE } from '../config';
import './Auth.css'; // ดึงสไตล์ใหม่มาใช้

function Register() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: ''
  });
  // 🔒 เพิ่ม State สำหรับเก็บค่ายืนยันรหัสผ่านแยกต่างหาก (ไม่ส่งไป Backend)
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 🔍 ตรวจสอบว่ารหัสผ่านทั้งสองช่องตรงกันหรือไม่
    if (formData.password !== confirmPassword) {
      alert('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้งครับ');
      return; // หยุดการทำงาน ไม่ส่งข้อมูลไปหลังบ้าน
    }

    try {
      const response = await fetch(`${API_BASE}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();

      if (response.ok) {
        alert(data.message);
        navigate('/login');
      } else {
        alert(data.detail || 'เกิดข้อผิดพลาดในการสมัครสมาชิก');
      }
    } catch (error) {
      console.error('Error:', error);
      alert("เกิดข้อผิดพลาด: " + JSON.stringify(error));
    }
  };

  return (
    <div className="auth-page-wrapper"> {/* 🟢 เพิ่ม div ตัวนี้มาหุ้มเพื่อจัดกึ่งกลางหน้าจอ */}
      <div className="auth-container">
        <h2>สมัครสมาชิก</h2>
        <p className="auth-subtitle">สร้างบัญชีเพื่อเริ่มต้นช่วยเหลือน้องๆ สัตว์เลี้ยง <Icon name="pawprint" size={16} /></p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>ชื่อ-นามสกุล</label>
            <input 
              type="text" 
              required 
              placeholder="เช่น Pattarapol "
              onChange={e => setFormData({...formData, full_name: e.target.value})} 
            />
          </div>
          
          <div className="form-group">
            <label>อีเมล</label>
            <input 
              type="email" 
              required 
              placeholder="example@email.com"
              onChange={e => setFormData({...formData, email: e.target.value})} 
            />
          </div>
          
          <div className="form-group">
            <label>รหัสผ่าน</label>
            <input 
              type="password" 
              required 
              placeholder="••••••••"
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})} 
            />
          </div>

          {/* 🔑 เพิ่มช่องอินพุต ยืนยันรหัสผ่าน */}
          <div className="form-group">
            <label>ยืนยันรหัสผ่านอีกครั้ง</label>
            <input 
              type="password" 
              required 
              placeholder="••••••••"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)} 
            />
          </div>

          <div className="form-group">
            <label>เบอร์โทรศัพท์</label>
            <input 
              type="text" 
              placeholder="08X-XXXXXXX"
              onChange={e => setFormData({...formData, phone: e.target.value})} 
            />
          </div>
          
          <button type="submit" className="auth-btn">
            สมัครสมาชิก
          </button>
        </form>
        
        <p className="switch-auth-text">
          มีบัญชีอยู่แล้วใช่ไหม? 
          <button className="switch-auth-btn" onClick={() => navigate('/login')}>
            เข้าสู่ระบบที่นี่
          </button>
        </p>
      </div>
    </div>
  );
}

export default Register;