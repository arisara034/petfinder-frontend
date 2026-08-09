import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from '../supabaseClient';
import './Cont3.css';
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

function Content3() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [statusModal, setStatusModal] = useState(null);
  
  const [imageFiles, setImageFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [location, setLocation] = useState({ lat: 13.8500, lng: 100.5250 });
  const [foundPosts, setFoundPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 🔍 เพิ่ม State คัดกรอง
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ทั้งหมด');
  const [filterProvince, setFilterProvince] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');

  const [formData, setFormData] = useState({
    type: 'สุนัข', breed: '', locationNote: '', province: '', district: '', note: ''
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

  const fetchFoundPosts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://127.0.0.1:8000/api/found');
      if (response.ok) {
        const data = await response.json();
        setFoundPosts(data);
      }
    } catch (error) {
      console.error('ไม่สามารถดึงข้อมูลสัตว์หลงทางได้:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFoundPosts();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setImageFiles(prev => [...prev, ...files]);
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setPreviewUrls(prev => [...prev, ...newPreviews]);
    }
  };

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
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_found_${i}.${fileExt}`;
        const filePath = `found/${fileName}`;

        const { error } = await supabase.storage
          .from('found-images')
          .upload(filePath, file);

        if (!error) {
          const { data: publicUrlData } = supabase.storage.from('found-images').getPublicUrl(filePath);
          uploadedImageUrls.push(publicUrlData.publicUrl);
        }
      }

      const payload = {
        type: formData.type,
        breed: formData.breed ? formData.breed : "ไม่ระบุสายพันธุ์",
        location_note: formData.locationNote,
        province: formData.province,
        district: formData.district,
        latitude: location.lat,
        longitude: location.lng,
        note: formData.note,
        status: "รอเจ้าของติดต่อกลับ",
        image_url: uploadedImageUrls[0] || null,
        images: uploadedImageUrls,
        user_id: userId
      };

      const response = await fetch('http://127.0.0.1:8000/api/found', {
        method: 'POST',
        headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}` // ต้องส่ง Token ตรงนี้
  },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        setStatusModal({
          status: 'success',
          title: 'ส่งเบาะแสสำเร็จ!',
          message: 'ส่งข้อมูลแจ้งพบสัตว์เลี้ยงสำเร็จ! ระบบกำลังตรวจสอบและเปรียบเทียบใบหน้าสัตว์เลี้ยงด้วย YOLO AI...'
        });
        setIsModalOpen(false);
        setPreviewUrls([]);
        setImageFiles([]);
        setFormData({ type: 'สุนัข', breed: '', locationNote: '', province: '', district: '', note: '' });
        fetchFoundPosts();
      } else {
        setStatusModal({
          status: 'error',
          title: 'บันทึกไม่สำเร็จ',
          message: 'เกิดข้อผิดพลาดจากระบบหลังบ้าน (422) กรุณาตรวจสอบฟิลด์ส่งค่าข้อมูล'
        });
      }
    } catch (error) {
      console.error(error);
      setStatusModal({
        status: 'error',
        title: 'เชื่อมต่อไม่สำเร็จ',
        message: 'ไม่สามารถส่งข้อมูลไปเซิร์ฟเวอร์ได้'
      });
    }
  };

  // ⚙️ คัดกรองโพสต์แจ้งพบเจอ
  const filteredFoundPosts = foundPosts.filter(post => {
    const matchesSearch = 
      (post.breed?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (post.location_note?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (post.note?.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesType = typeFilter === 'ทั้งหมด' || post.type === typeFilter;
    const matchesProvince = !filterProvince || post.province === filterProvince;
    const matchesDistrict = !filterDistrict || post.district === filterDistrict;

    return matchesSearch && matchesType && matchesProvince && matchesDistrict;
  });

  const sortedFoundPosts = [...filteredFoundPosts].sort((a, b) => {
    if (sortOrder === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
    return new Date(b.created_at) - new Date(a.created_at); // newest (ค่าเริ่มต้น)
  });

  return (
    <div id="found-page">
      <div className="found-banner">
        <div className="banner-content">
          <span className="banner-icon"><Icon name="home" size={40} /></span>
          <div className="banner-text">
            <h1>คุณพบสัตว์เลี้ยงหลงทางมาใช่ไหม?</h1>
            <p>ถ่ายรูปและระบุพิกัดที่พบ เพื่อส่งข้อมูลให้ระบบสแกนหาและแจ้งเตือนไปยังเจ้าของที่กำลังตามหา</p>
          </div>
        </div>
        <button className="banner-btn" onClick={handleOpenModal}>
          แจ้งพบสัตว์เลี้ยงหลงทาง <Icon name="pawprint" size={18} />
        </button>
      </div>

      {/* ส่วนแสดงโพสต์แจ้งพบ */}
      <div className="posts-section">
        <div className="section-header-flex">
          <h2 className="section-title"><Icon name="mapPin" size={22} /> ประกาศแจ้งพบสัตว์เลี้ยงหลงทางล่าสุด</h2>
          
          {/* กล่องตัวกรองควบคุมข้อมูล */}
          <div className="filter-wrapper">
            <input 
              type="text" 
              className="filter-search-input" 
              placeholder=" ค้นสายพันธุ์, สถานที่พบ..." 
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
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="state-card">
            <div className="state-spinner"></div>
            <p>กำลังโหลดเบาะแสสัตว์หลงทาง...</p>
          </div>
        ) : sortedFoundPosts.length === 0 ? (
          <div className="state-card empty-state">
            <span className="state-icon"><Icon name="home" size={44} /></span>
            <h3>ไม่พบรายงานสัตว์หลงทางที่ตรงกับตัวกรอง</h3>
            <p>ลองเปลี่ยนคำค้นหรือปรับตัวกรองพื้นที่ดูนะครับ</p>
          </div>
        ) : (
          <div className="posts-grid">
            {sortedFoundPosts.map(post => (
              


              <Link 
                to={`/post/found/${post.id}`} 
                key={post.id} 
                className="post-card"
                style={{ textDecoration: 'none', color: 'inherit' }} 
                >

                <div className="post-img-placeholder">
                  {post.image_url ? (
                    <img src={post.image_url} alt={post.type} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span className="post-avatar-icon"><Icon name="image" size={36} /></span>
                  )}
                  <span className="status-badge">{post.status || 'รอเจ้าของติดต่อกลับ'}</span>
                </div>
                <div className="post-info">
                  <h3>พบเจอ ({post.type})</h3>
                  <p><strong>สายพันธุ์:</strong> {post.breed || 'ไม่ระบุ'}</p>
                  <p><strong>สถานที่พบ:</strong> {post.location_note}</p>
                  {(post.district || post.province) && (
                    <p><Icon name="map" size={14} /> <strong>พื้นที่:</strong> {[post.district, post.province].filter(Boolean).join(', ')}</p>
                  )}
                  <p style={{ fontSize: '13px', marginTop: '6px', color: '#4a5568' }}>{post.note}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ฟอร์มแจ้งพบ */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2>กรอกข้อมูลและเบาะแสสัตว์เลี้ยงที่พบเจอ</h2>
              <button className="close-modal-btn" onClick={() => setIsModalOpen(false)}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="pet-form">
              <div className="form-group image-upload-group">
                <label className="form-label">รูปภาพสัตว์เลี้ยงที่พบเจอ (เลือกได้หลายรูป, สำคัญมากสำหรับ AI)</label>

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

                  <label htmlFor="found-file-input" className="upload-placeholder" style={{ width: '80px', height: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #cbd5e0', borderRadius: '8px', cursor: 'pointer', background: '#f7fafc' }}>
                    <Icon name="plus" size={20} style={{ color: '#718096' }} />
                    <span style={{ fontSize: '10px', color: '#718096' }}>เพิ่มรูป</span>
                  </label>
                </div>

                <input id="found-file-input" type="file" accept="image/*" multiple onChange={handleImageChange} style={{ display: 'none' }} />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">ประเภทสัตว์ที่พบ</label>
                  <select name="type" className="form-input" value={formData.type} onChange={handleInputChange} required>
                    <option value="สุนัข">สุนัข</option>
                    <option value="แมว">แมว</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">สายพันธุ์ (ถ้าทราบ)</label>
                  <input type="text" name="breed" className="form-input" placeholder="เช่น ไทยหลังอาน" value={formData.breed} onChange={handleInputChange} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">อธิบายจุดสังเกตสถานที่</label>
                <input type="text" name="locationNote" className="form-input" placeholder="เช่น บริเวณหน้าปากซอยวิภาวดี 10" value={formData.locationNote} onChange={handleInputChange} required />
              </div>

              <ProvinceDistrictSelect
                province={formData.province}
                district={formData.district}
                onChange={handleLocationFieldsChange}
                required
              />

              <div className="form-group">
                <label className="form-label">ระบุจุดพิกัดที่พบเจอลงแผนที่ <Icon name="mapPin" size={16} /></label>
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
                <label className="form-label">รายละเอียดเพิ่มเติม / สภาพที่พบ</label>
                <textarea name="note" className="form-input form-textarea" placeholder="เช่น น้องมีปลอกคอสีแดง, ค่อนข้างเชื่อง" rows="3" value={formData.note} onChange={handleInputChange} required></textarea>
              </div>

              <button type="submit" className="submit-btn"><Icon name="pawprint" size={18} /> ส่งข้อมูลแจ้งพบสัตว์เลี้ยง</button>
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

export default Content3;