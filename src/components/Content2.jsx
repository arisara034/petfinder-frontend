import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from '../supabaseClient';
import './Cont2.css';
import { Link } from 'react-router-dom';
import ProvinceDistrictSelect from './ProvinceDistrictSelect';
import { reverseGeocodeProvinceDistrict } from '../utils/geocode';
import PostStatusModal from './PostStatusModal';
import Icon from './Icon';

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: markerIcon, shadowUrl: markerShadow, iconSize: [25, 41], iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

function Content2() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [statusModal, setStatusModal] = useState(null);
  
  // 📸 เปลี่ยนเป็นรองรับหลายรูปภาพ (เก็บเป็น Array)
  const [imageFiles, setImageFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);

  const [location, setLocation] = useState({ lat: 13.8500, lng: 100.5250 });
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 🔍 เพิ่ม State ตัวกรอง
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ทั้งหมด');
  const [filterProvince, setFilterProvince] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');

  const [formData, setFormData] = useState({
    name: '', type: 'สุนัข', gender: 'ผู้', breed: '', reward: '0', lostDate: '', locationNote: '', province: '', district: '', note: ''
  });

  const handleLocationFieldsChange = (province, district) => {
    setFormData(prev => ({ ...prev, province, district }));
  };

  const handleFilterLocationChange = (province, district) => {
    setFilterProvince(province);
    setFilterDistrict(district);
  };

  const handleOpenModal = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsAlertOpen(true); 
      return;
    }
    setIsModalOpen(true);
  };

  const fetchLostPosts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://127.0.0.1:8000/api/lost');
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      }
    } catch (error) {
      console.error('ไม่สามารถดึงข้อมูลสัตว์เลี้ยงหายได้:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLostPosts();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 📸 ฟังก์ชันจัดการการเลือกหลายรูปภาพ
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setImageFiles(prev => [...prev, ...files]);
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setPreviewUrls(prev => [...prev, ...newPreviews]);
    }
  };

  // ❌ ฟังก์ชันลบรูปที่เลือกออกทีละรูป
  const handleRemoveImage = (index) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  function MapEvents() {
    useMapEvents({
      async click(e) {
        const { lat, lng } = e.latlng;
        setLocation({ lat, lng });
        const result = await reverseGeocodeProvinceDistrict(lat, lng);
        if (result.province) {
          handleLocationFieldsChange(result.province, result.district);
        }
      },
    });
    return <Marker position={[location.lat, location.lng]} />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    if (!token || !userId) {
      setIsAlertOpen(true);
      return;
    }

    let uploadedImageUrls = [];
    try {
      // วนลูปอัปโหลดทีละรูปขึ้น Supabase Storage
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_lost_${i}.${fileExt}`;
        const filePath = `lost/${fileName}`;

        const { error } = await supabase.storage
          .from('lost-images') 
          .upload(filePath, file);

        if (!error) {
          const { data: publicUrlData } = supabase.storage.from('lost-images').getPublicUrl(filePath);
          uploadedImageUrls.push(publicUrlData.publicUrl);
        }
      }

      const payload = {
        name: formData.name,
        type: formData.type === 'dog' || formData.type === 'สุนัข' ? 'สุนัข' : 'แมว',
        gender: formData.gender,
        breed: formData.breed,
        reward: parseFloat(formData.reward) || 0,
        lost_date: formData.lostDate,
        location_note: formData.locationNote,
        province: formData.province,
        district: formData.district,
        latitude: location.lat,
        longitude: location.lng,
        note: formData.note,
        status: "กำลังตามหา",
        image_url: uploadedImageUrls[0] || null, // รูปแรกสุดทำเป็นรูปหลักหน้าการ์ด
        images: uploadedImageUrls, // ส่งอาเรย์รูปทั้งหมดเผื่อ backend รองรับ
        user_id: userId 
      };

      const response = await fetch('http://127.0.0.1:8000/api/lost', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setStatusModal({
          status: 'success',
          title: 'ลงประกาศสำเร็จ!',
          message: `ลงประกาศตามหา ${formData.name} สำเร็จ! ระบบ AI เริ่มดำเนินการสแกนใบหน้าจับคู่หาเบาะแส...`
        });
        setIsModalOpen(false);
        setPreviewUrls([]);
        setImageFiles([]);
        setFormData({ name: '', type: 'สุนัข', gender: 'ผู้', breed: '', reward: '0', lostDate: '', locationNote: '', province: '', district: '', note: '' });
        fetchLostPosts();
      } else {
        setStatusModal({
          status: 'error',
          title: 'บันทึกไม่สำเร็จ',
          message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาเช็กความถูกต้องฟิลด์อินพุต'
        });
      }
    } catch (error) {
      console.error(error);
      setStatusModal({
        status: 'error',
        title: 'เชื่อมต่อไม่สำเร็จ',
        message: 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์'
      });
    }
  };

  const filteredPosts = posts.filter(post => {
    const matchesSearch =
      (post.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (post.breed?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (post.location_note?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (post.note?.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = typeFilter === 'ทั้งหมด' || post.type === typeFilter;
    const matchesProvince = !filterProvince || post.province === filterProvince;
    const matchesDistrict = !filterDistrict || post.district === filterDistrict;

    return matchesSearch && matchesType && matchesProvince && matchesDistrict;
  });

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (sortOrder === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
    if (sortOrder === 'reward') return (Number(b.reward) || 0) - (Number(a.reward) || 0);
    return new Date(b.created_at) - new Date(a.created_at); // newest (ค่าเริ่มต้น)
  });

  return (
    <div id="find-page">
      <div className="find-banner">
        <div className="banner-content">
          <span className="banner-icon"><Icon name="search" size={40} /></span>
          <div className="banner-text">
            <h1>คุณทำสัตว์เลี้ยงหายหรือเปล่า?</h1>
            <p>สร้างประกาศตามหาเพื่อให้ระบบ AI ช่วยตรวจจับใบหน้าและจับคู่กับเบาะแสในระบบ</p>
          </div>
        </div>
        <button className="banner-btn" onClick={handleOpenModal}>
          สร้างประกาศตามหาหาย <Icon name="pawprint" size={18} />
        </button>
      </div>

      <div className="posts-section">
        <div className="section-header-flex">
          <h2 className="section-title"><Icon name="pawprint" size={22} /> ประกาศสัตว์เลี้ยงหายล่าสุดในระบบ</h2>
          
          <div className="filter-wrapper">
            <input 
              type="text" 
              className="filter-search-input" 
              placeholder=" ค้นชื่อ, พันธุ์, พิกัดหาย..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              className="filter-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="ทั้งหมด">ประเภททั้งหมด</option>
              <option value="แมว">เฉพาะแมว</option>
              <option value="สุนัข">เฉพาะสุนัข</option>
            </select>
            <ProvinceDistrictSelect
              province={filterProvince}
              district={filterDistrict}
              onChange={handleFilterLocationChange}
              allowAll
              compact
            />
            <select
              className="filter-select"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
            >
              <option value="newest">ใหม่ล่าสุด</option>
              <option value="oldest">เก่าที่สุด</option>
              <option value="reward">เงินรางวัลสูงสุด</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="state-card">
            <div className="state-spinner"></div>
            <p>กำลังโหลดข้อมูลประกาศหาย...</p>
          </div>
        ) : sortedPosts.length === 0 ? (
          <div className="state-card empty-state">
            <span className="state-icon"><Icon name="search" size={44} /></span>
            <h3>ไม่พบสัตว์เลี้ยงตามเงื่อนไขตัวกรองของคุณ</h3>
            <p>ลองเปลี่ยนคำค้นหรือปรับตัวกรองพื้นที่ดูนะครับ</p>
          </div>
        ) : (
          <div className="posts-grid">
            {sortedPosts.map(post => (
              <Link 
                to={`/post/lost/${post.id}`} 
                key={post.id} 
                className="post-card"
                style={{ textDecoration: 'none', color: 'inherit' }} 
              >
                <div className="post-img-placeholder">
                  {post.image_url ? (
                    <img src={post.image_url} alt={post.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span className="post-avatar-icon"><Icon name="image" size={36} /></span>
                  )}
                  <span className="status-badge">{post.status || 'กำลังตามหา'}</span>
                </div>
                <div className="post-info">
                  <h3>{post.name} ({post.type})</h3>
                  <p><strong>สายพันธุ์:</strong> {post.breed || 'พันธุ์ทาง'}</p>
                  <p><strong>วันที่หาย:</strong> {post.lost_date || post.date}</p>
                  <p><Icon name="mapPin" size={14} /> <strong>พิกัดหาย:</strong> {post.location_note}</p>
                  {(post.district || post.province) && (
                    <p><Icon name="map" size={14} /> <strong>พื้นที่:</strong> {[post.district, post.province].filter(Boolean).join(', ')}</p>
                  )}
                  {post.reward && post.reward !== '0' && post.reward !== 0 && (
                    <p className="reward-text"><Icon name="dollarSign" size={14} /> สินน้ำใจ: {post.reward} บาท</p>
                  )}
                  <p style={{ marginTop: '6px', fontSize: '13px', color: '#4a5568' }}>{post.note}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ฟอร์มกรอกประกาศ */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h2>กรอกรายละเอียดประกาศหาย</h2>
              <button className="close-modal-btn" onClick={() => setIsModalOpen(false)}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="pet-form">
              <div className="form-group image-upload-group">
                <label className="form-label">รูปถ่ายสัตว์เลี้ยง (เลือกได้หลายรูป)</label>
                
                {/* แสดงตัวอย่างรูปทั้งหมดที่เลือก */}
                <div className="multi-preview-container" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  {previewUrls.map((url, index) => (
                    <div key={index} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e0' }}>
                      <img src={url} alt={`Preview ${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      <button 
                        type="button" 
                        onClick={() => handleRemoveImage(index)}
                        style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '12px' }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  
                  <label htmlFor="find-file-input" className="upload-placeholder" style={{ width: '80px', height: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #cbd5e0', borderRadius: '8px', cursor: 'pointer', background: '#f7fafc' }}>
                    <Icon name="plus" size={20} style={{ color: '#718096' }} />
                    <span style={{ fontSize: '10px', color: '#718096' }}>เพิ่มรูป</span>
                  </label>
                </div>

                <input id="find-file-input" type="file" accept="image/*" multiple onChange={handleImageChange} style={{ display: 'none' }} />
              </div>

              <div className="form-row row-three">
                <div className="form-group">
                  <label className="form-label">ชื่อสัตว์เลี้ยง</label>
                  <input type="text" name="name" className="form-input" placeholder="เช่น น้องถุงเงิน" value={formData.name} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">ประเภท</label>
                  <select name="type" className="form-input" value={formData.type} onChange={handleInputChange} required>
                    <option value="สุนัข">สุนัข</option>
                    <option value="แมว">แมว</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">เพศ</label>
                  <select name="gender" className="form-input" value={formData.gender} onChange={handleInputChange} required>
                    <option value="ผู้">ผู้</option>
                    <option value="เมีย">เมีย</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">สายพันธุ์</label>
                  <input type="text" name="breed" className="form-input" placeholder="เช่น ไซบีเรียน" value={formData.breed} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">เงินรางวัลนำจับ (บาท)</label>
                  <input type="number" name="reward" className="form-input" placeholder="ไม่มีใส่ 0" min="0" value={formData.reward} onChange={handleInputChange} required />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">วันที่หาย</label>
                  <input type="date" name="lostDate" className="form-input" value={formData.lostDate} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">รายละเอียดสถานที่หายเบื้องต้น</label>
                  <input type="text" name="locationNote" className="form-input" placeholder="เช่น บริเวณหมู่บ้าน ABC ซอย 3" value={formData.locationNote} onChange={handleInputChange} required />
                </div>
              </div>

              <ProvinceDistrictSelect
                province={formData.province}
                district={formData.district}
                onChange={handleLocationFieldsChange}
                required
              />

              <div className="form-group">
                <label className="form-label">ระบุจุดเกิดเหตุบนแผนที่ <Icon name="mapPin" size={16} /></label>
                <div className="map-wrapper">
                  <MapContainer center={[location.lat, location.lng]} zoom={13} style={{ height: '220px', width: '100%' }}>
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapEvents />
                  </MapContainer>
                </div>
                <span className="coords-display">พิกัดปัจจุบัน: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}</span>
              </div>

              <div className="form-group">
                <label className="form-label">ตำหนิเด่น / เบอร์ติดต่อกลับ</label>
                <textarea name="note" className="form-input form-textarea" placeholder="เช่น มีปลอกคอสีน้ำเงิน, โทร 08X-XXX-XXXX" rows="3" value={formData.note} onChange={handleInputChange} required></textarea>
              </div>

              <button type="submit" className="submit-btn"><Icon name="search" size={18} /> ลงประกาศและเริ่มการค้นหา</button>
            </form>
          </div>
        </div>
      )}

      {/* POPUP เตือนล็อกอิน */}
      {isAlertOpen && (
        <div className="modal-overlay" style={{ zIndex: 1000 }}>
          <div className="custom-alert-box">
            <div className="alert-icon-wrap"><Icon name="lock" size={28} /></div>
            <h3>เข้าสู่ระบบก่อนดำเนินการ</h3>
            <p>คุณจำเป็นต้องเข้าสู่ระบบสมาชิกก่อน จึงจะสามารถสร้างประกาศจัดการบนระบบ PetFinder AI ได้ครับ</p>
            <div className="alert-action-btns">
              <button className="alert-btn-close" onClick={() => setIsAlertOpen(false)}>รับทราบ</button>
            </div>
          </div>
        </div>
      )}

      <PostStatusModal
        status={statusModal?.status}
        title={statusModal?.title}
        message={statusModal?.message}
        onClose={() => setStatusModal(null)}
      />
    </div>
  );
}

export default Content2;