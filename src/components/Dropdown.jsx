// src/components/Dropdown.jsx
import React from 'react';
import "./Dropdown.css";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

const Dropdown = ({ isOpen, onClose, users_profile }) => { // รับ onClose เข้ามา
  console.log("ข้อมูล Profile ที่ได้รับ:", users_profile);
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleLogout = async () => {
  await supabase.auth.signOut();
  localStorage.removeItem('token');
  localStorage.removeItem('userId'); // ลบให้ครบตามที่เซ็ตไว้
  localStorage.removeItem('userEmail');
  
  onClose(); // ปิดเมนูก่อน
  navigate('/login'); // เปลี่ยนหน้า
  window.location.reload();
};

  

  return (
    <div className="-dropdown-menu">
      <div className="-user-header">
        <img src={users_profile?.avatar_url || "https://placehold.co/80x80"} alt="Profile" className="-propic" />
        {/* แสดงชื่อจากข้อมูลที่ส่งมา */}
        <span>{users_profile?.full_name || "Guest User"}</span> 
      </div>
      
      <Link to="/profile" className="-dropdown-item" onClick={onClose}>
        My profile
      </Link>

      {users_profile?.role === 'admin' && (
        <Link to="/admin" className="-dropdown-item" onClick={onClose}>
          แผงควบคุมแอดมิน
        </Link>
      )}


      <div className="-dropdown-item -logout" onClick={handleLogout} style={{ cursor: 'pointer' }}>
        Logout
      </div>
    </div>
  );
};

export default Dropdown;