import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';
import './Cont4.css';
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

function Adopt() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAlertOpen, setIsAlertOpen] = useState(false);

  const [imageFiles, setImageFiles] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [statusModal, setStatusModal] = useState(null);

  // 🔍 เพิ่ม State สำหรับระบบตัวกรอง
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ทั้งหมด');
  const [filterProvince, setFilterProvince] = useState('');
  const [filterDistrict, setFilterDistrict] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');

  const [formData, setFormData] = useState({
    name: '', type: 'แมว', gender: 'ผู้', breed: '', age: '', locationNote: '', province: '', district: '', contact: '', status: 'กำลังหาบ้าน', note: ''
  });

  const [location, setLocation] = useState({ lat: 13.8500, lng: 100.5250 });

  const handleLocationFieldsChange = (province, district) => {
    setFormData(prev => ({ ...prev, province, district }));
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

  const fetchPosts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://127.0.0.1:8000/api/adopt');
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      }
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการเชื่อมต่อ Backend:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
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
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${i}.${fileExt}`;
        const filePath = `adopt/${fileName}`;

        const { error } = await supabase.storage
          .from('adopt-images')
          .upload(filePath, file);

        if (!error) {
          const { data: publicUrlData } = supabase.storage.from('adopt-images').getPublicUrl(filePath);
          uploadedImageUrls.push(publicUrlData.publicUrl);
        }
      }

      const payload = {
        name: formData.name,
        type: formData.type,
        gender: formData.gender,
        breed: formData.breed ? formData.breed : "พันธุ์ทาง",
        age: formData.age,
        location_note: formData.locationNote,
        province: formData.province,
        district: formData.district,
        latitude: location.lat,
        longitude: location.lng,
        note: formData.note,
        contact: formData.contact,
        status: formData.status,
        image_url: uploadedImageUrls[0] || null,
        images: uploadedImageUrls,
        user_id: userId
      };

      const response = await fetch('http://127.0.0.1:8000/api/adopt', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}` // ต้องส่ง Token ตรงนี้
  },
  body: JSON.stringify(payload)
  
});

      if (response.ok) {
        setStatusModal({
          status: 'success',
          title: 'ลงประกาศสำเร็จ!',
          message: `ลงประกาศหาบ้านใหม่ให้ ${formData.name} สำเร็จ`
        });
        setIsModalOpen(false);
        setPreviewUrls([]);
        setImageFiles([]);
        setFormData({ name: '', type: 'แมว', gender: 'ผู้', breed: '', age: '', locationNote: '', province: '', district: '', contact: '', status: 'กำลังหาบ้าน', note: '' });
        setLocation({ lat: 13.8500, lng: 100.5250 });
        fetchPosts();
      } else {
        setStatusModal({
          status: 'error',
          title: 'บันทึกไม่สำเร็จ',
          message: 'เกิดข้อผิดพลาดจากระบบ (422): ตรวจสอบชนิดข้อมูลอินพุต'
        });
      }
    } catch (error) {
      console.error(error);
      setStatusModal({
        status: 'error',
        title: 'เชื่อมต่อไม่สำเร็จ',
        message: 'ไม่สามารถส่งข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่อเซิร์ฟเวอร์ Python'
      });
    }
  };

  // ⚙️ Logic คัดกรองข้อมูลฝั่ง Frontend
  const filteredPosts = posts.filter(post => {
    const matchesSearch =
      (post.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (post.breed?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (post.location_note?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (post.locationNote?.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (post.note?.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = typeFilter === 'ทั้งหมด' || post.type === typeFilter;
    const matchesProvince = !filterProvince || post.province === filterProvince;
    const matchesDistrict = !filterDistrict || post.district === filterDistrict;

    return matchesSearch && matchesType && matchesProvince && matchesDistrict;
  });

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (sortOrder === 'oldest') return new Date(a.created_at) - new Date(b.created_at);
    return new Date(b.created_at) - new Date(a.created_at); // newest (ค่าเริ่มต้น)
  });

  return (
    <div id="adopt-page">
      <div className="adopt-banner">
        <div className="banner-content">
          <span className="banner-icon"><Icon name="home" size={40} /></span>
          <div className="banner-text">
            <h1>คุณต้องการหาบ้านใหม่ให้สัตว์เลี้ยงใช่หรือเปล่า?</h1>
            <p>ร่วมสร้างสังคมแห่งการแบ่งปัน หาบ้านที่อบอุ่นและปลอดภัยให้กับน้องๆ ร่วมกัน</p>
          </div>
        </div>
        <button className="banner-btn" onClick={handleOpenModal}>
          สร้างประกาศหาบ้านใหม่ <Icon name="pawprint" size={18} />
        </button>
      </div>

      {/* ส่วนแสดงโพสต์ */}
      <div className="posts-section">
        <div className="section-header-flex">
          <h2 className="section-title"><Icon name="pawprint" size={22} /> ประกาศสัตว์เลี้ยงหาบ้านล่าสุดในระบบ</h2>
          
          {/* 🔍 กล่องตัวกรองสไตล์มินิมอล */}
          <div className="filter-wrapper">
            <input 
              type="text" 
              className="filter-search-input" 
              placeholder=" ค้นหาชื่อ, สายพันธุ์, พิกัด..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select 
              className="filter-select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="ทั้งหมด">สัตว์เลี้ยงทั้งหมด</option>
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
            <p>กำลังโหลดข้อมูลสุนัขและแมวหาบ้าน...</p>
          </div>
        ) : sortedPosts.length === 0 ? (
          <div className="state-card empty-state">
            <span className="state-icon"><Icon name="pawprint" size={44} /></span>
            <h3>ไม่พบประกาศหาบ้านที่ตรงกับตัวกรองของคุณ</h3>
            <p>ลองเปลี่ยนคำค้นหรือปรับตัวกรองพื้นที่ดูนะครับ</p>
          </div>
        ) : (
          <div className="posts-grid">
            {sortedPosts.map(post => (

              <Link 
                to={`/post/${post.type}/${post.id}`} 
                key={post.id} 
                className="post-card"
                style={{ textDecoration: 'none', color: 'inherit' }} 
                >
  
                <div className="post-img-placeholder" style={{ backgroundColor: post.image_url ? '#ffffff' : '#edf2f7' }}>
                  {post.image_url ? (
                    <img src={post.image_url} alt={post.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span className="post-avatar-icon"><Icon name="image" size={36} /></span>
                  )}
                  <span className="status-badge adopt-status">{post.status || 'กำลังหาบ้าน'}</span>
                </div>
                <div className="post-info">
                  <h3>{post.name} ({post.type})</h3>
                  <p><strong>สายพันธุ์:</strong> {post.breed || 'พันธุ์ทาง'}</p>
                  <p><strong>เพศ:</strong> {post.gender} | <strong>อายุ:</strong> {post.age}</p>
                  <p><Icon name="mapPin" size={14} /> <strong>สถานที่นัดรับ:</strong> {post.location_note || post.locationNote}</p>
                  {(post.district || post.province) && (
                    <p><Icon name="map" size={14} /> <strong>พื้นที่:</strong> {[post.district, post.province].filter(Boolean).join(', ')}</p>
                  )}
                  <p><Icon name="phone" size={14} /> <strong>ติดต่อ:</strong> <span style={{ color: '#3182ce', fontWeight: 'bold' }}>{post.contact}</span></p>
                  <p className="adopt-note-text" style={{ marginTop: '8px', color: '#4a5568' }}>{post.note}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ส่วน POPUP FORMหลัก */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-container">
            <div className="modal-header">
              <h2>กรอกรายละเอียดประกาศหาบ้านใหม่</h2>
              <button className="close-modal-btn" onClick={() => setIsModalOpen(false)}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="pet-form">
              <div className="form-group image-upload-group">
                <label className="form-label">รูปถ่ายสัตว์เลี้ยงที่ชัดเจน (เลือกได้หลายรูป)</label>

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

                  <label htmlFor="adopt-file-input" className="upload-placeholder" style={{ width: '80px', height: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #cbd5e0', borderRadius: '8px', cursor: 'pointer', background: '#f7fafc' }}>
                    <Icon name="plus" size={20} style={{ color: '#718096' }} />
                    <span style={{ fontSize: '10px', color: '#718096' }}>เพิ่มรูป</span>
                  </label>
                </div>

                <input id="adopt-file-input" type="file" accept="image/*" multiple onChange={handleImageChange} style={{ display: 'none' }} />
              </div>

              <div className="form-row row-three">
                <div className="form-group">
                  <label className="form-label">ชื่อเรียก/ตั้งชื่อชั่วคราว</label>
                  <input type="text" name="name" className="form-input" placeholder="เช่น น้องส้มจี๊ด" value={formData.name} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">ประเภท</label>
                  <select name="type" className="form-input" value={formData.type} onChange={handleInputChange} required>
                    <option value="แมว">แมว</option>
                    <option value="สุนัข">สุนัข</option>
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
                  <label className="form-label">สายพันธุ์ (ถ้ามี)</label>
                  <input type="text" name="breed" className="form-input" placeholder="เช่น ไทยสามสี / โดเบอร์แมน" value={formData.breed} onChange={handleInputChange} />
                </div>
                <div className="form-group">
                  <label className="form-label">อายุโดยประมาณ</label>
                  <input type="text" name="age" className="form-input" placeholder="เช่น 3 เดือน หรือ 1 ปี" value={formData.age} onChange={handleInputChange} required />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">พิกัด / สถานที่นัดรับน้อง <Icon name="mapPin" size={16} /></label>
                  <input type="text" name="locationNote" className="form-input" placeholder="เช่น เขตจตุจักร กรุงเทพฯ" value={formData.locationNote} onChange={handleInputChange} required />
                </div>
                <div className="form-group">
                  <label className="form-label">เบอร์ติดต่อกลับ / Line ID <Icon name="phone" size={16} /></label>
                  <input type="text" name="contact" className="form-input" placeholder="เช่น 089-XXX-XXXX / line_id" value={formData.contact} onChange={handleInputChange} required />
                </div>
              </div>

              <ProvinceDistrictSelect
                province={formData.province}
                district={formData.district}
                onChange={handleLocationFieldsChange}
                required
              />

              <div className="form-group">
                <label className="form-label">ระบุจุดนัดรับน้องบนแผนที่ <Icon name="mapPin" size={16} /></label>
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
                <label className="form-label">เงื่อนไขผู้รับเลี้ยง / นิสัย / ประวัติวัคซีนเด่นๆ</label>
                <textarea name="note" className="form-input form-textarea" placeholder="เช่น ขอบ้านระบบปิด, นิสัยขี้อ้อนมาก" rows="4" value={formData.note} onChange={handleInputChange} required></textarea>
              </div>

              <button type="submit" className="submit-btn adopt-submit-btn"><Icon name="home" size={18} /> ลงประกาศหาบ้านใหม่ให้น้อง</button>
            </form>
          </div>
        </div>
      )}

      {/* POPUP เตือนล็อกอินแบบสวยงาม */}
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

export default Adopt;