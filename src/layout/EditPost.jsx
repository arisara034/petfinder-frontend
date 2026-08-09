import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import '../components/Cont2.css';
import ProvinceDistrictSelect from '../components/ProvinceDistrictSelect';
import { reverseGeocodeProvinceDistrict } from '../utils/geocode';
import PostStatusModal from '../components/PostStatusModal';
import Icon from '../components/Icon';
import './EditPost.css';

let DefaultIcon = L.icon({
  iconUrl: markerIcon, shadowUrl: markerShadow, iconSize: [25, 41], iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const TABLE_MAP = { lost: 'lost_posts', found: 'found_posts', adopt: 'adopt_posts' };
const BUCKET_MAP = { lost: 'lost-images', found: 'found-images', adopt: 'adopt-images' };

function EditPost() {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const tableName = TABLE_MAP[type];

  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [notAllowed, setNotAllowed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusModal, setStatusModal] = useState(null);

  const [formData, setFormData] = useState({
    name: '', type: 'สุนัข', gender: 'ผู้', breed: '', age: '', reward: '0',
    lost_date: '', location_note: '', province: '', district: '', note: '', contact: '', status: '', image_url: ''
  });
  const [location, setLocation] = useState({ lat: 13.8500, lng: 100.5250 });
  const [existingImages, setExistingImages] = useState([]);
  const [newImageFiles, setNewImageFiles] = useState([]);
  const [newPreviewUrls, setNewPreviewUrls] = useState([]);

  useEffect(() => {
    const fetchPost = async () => {
      if (!tableName) { setLoading(false); return; }

      const { data, error } = await supabase.from(tableName).select('*').eq('id', id).single();
      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      const userId = localStorage.getItem('userId');
      if (data.user_id !== userId) {
        setNotAllowed(true);
        setLoading(false);
        return;
      }

      setFormData({
        name: data.name || '',
        type: data.type || 'สุนัข',
        gender: data.gender || 'ผู้',
        breed: data.breed || '',
        age: data.age || '',
        reward: data.reward ?? '0',
        lost_date: data.lost_date || '',
        location_note: data.location_note || '',
        province: data.province || '',
        district: data.district || '',
        note: data.note || '',
        contact: data.contact || '',
        status: data.status || '',
        image_url: data.image_url || ''
      });

      if (data.latitude && data.longitude) {
        setLocation({ lat: data.latitude, lng: data.longitude });
      }

      const initialImages = Array.isArray(data.images) && data.images.length > 0
        ? data.images
        : (data.image_url ? [data.image_url] : []);
      setExistingImages(initialImages);
      setLoading(false);
    };

    fetchPost();
  }, [type, id, tableName]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLocationFieldsChange = (province, district) => {
    setFormData(prev => ({ ...prev, province, district }));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setNewImageFiles(prev => [...prev, ...files]);
      const newPreviews = files.map(file => URL.createObjectURL(file));
      setNewPreviewUrls(prev => [...prev, ...newPreviews]);
    }
  };

  const handleRemoveExistingImage = (index) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveNewImage = (index) => {
    setNewImageFiles(prev => prev.filter((_, i) => i !== index));
    setNewPreviewUrls(prev => prev.filter((_, i) => i !== index));
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
    setSaving(true);

    try {
      const uploadedUrls = [];
      for (let i = 0; i < newImageFiles.length; i++) {
        const file = newImageFiles[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${type}_edit_${i}.${fileExt}`;
        const filePath = `${type}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET_MAP[type])
          .upload(filePath, file);

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage.from(BUCKET_MAP[type]).getPublicUrl(filePath);
          uploadedUrls.push(publicUrlData.publicUrl);
        }
      }

      const finalImages = [...existingImages, ...uploadedUrls];

      const updateData = {
        breed: formData.breed,
        location_note: formData.location_note,
        province: formData.province,
        district: formData.district,
        note: formData.note,
        status: formData.status,
        image_url: finalImages[0] || null,
        images: finalImages,
        type: formData.type
      };

      if (type === 'lost') {
        Object.assign(updateData, {
          name: formData.name,
          gender: formData.gender,
          reward: parseFloat(formData.reward) || 0,
          lost_date: formData.lost_date,
          latitude: location.lat,
          longitude: location.lng
        });
      } else if (type === 'found') {
        Object.assign(updateData, {
          latitude: location.lat,
          longitude: location.lng
        });
      } else if (type === 'adopt') {
        Object.assign(updateData, {
          name: formData.name,
          gender: formData.gender,
          age: formData.age,
          contact: formData.contact
        });
      }

      const { error } = await supabase.from(tableName).update(updateData).eq('id', id);

      if (error) {
        setStatusModal({ status: 'error', title: 'บันทึกไม่สำเร็จ', message: error.message });
      } else {
        setStatusModal({ status: 'success', title: 'แก้ไขโพสต์สำเร็จ!', message: 'บันทึกการแก้ไขโพสต์เรียบร้อยแล้ว' });
      }
    } catch (err) {
      console.error(err);
      setStatusModal({ status: 'error', title: 'เกิดข้อผิดพลาด', message: 'เกิดข้อผิดพลาดในการบันทึก' });
    } finally {
      setSaving(false);
    }
  };

  const handleStatusModalClose = () => {
    const wasSuccess = statusModal?.status === 'success';
    setStatusModal(null);
    if (wasSuccess) {
      navigate('/profile');
    }
  };

  if (!tableName) return <div className="edit-post-status">ประเภทโพสต์ไม่ถูกต้อง</div>;
  if (loading) return <div className="edit-post-status">กำลังโหลดข้อมูล...</div>;
  if (notFound) return <div className="edit-post-status">ไม่พบโพสต์นี้ในระบบ</div>;
  if (notAllowed) return <div className="edit-post-status">คุณไม่มีสิทธิ์แก้ไขโพสต์นี้</div>;

  return (
    <div className="edit-post-page">
      <div className="modal-container edit-post-container">
        <div className="modal-header">
          <h2>แก้ไขโพสต์</h2>
          <button type="button" className="close-modal-btn" onClick={() => navigate('/profile')}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="pet-form">
          <div className="form-group image-upload-group">
            <label className="form-label">รูปภาพ (เลือกเพิ่มได้หลายรูป)</label>

            <div className="multi-preview-container" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
              {existingImages.map((url, index) => (
                <div key={`existing-${index}`} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e0' }}>
                  <img src={url} alt={`Existing ${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => handleRemoveExistingImage(index)}
                    style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '12px' }}
                  >
                    ×
                  </button>
                </div>
              ))}

              {newPreviewUrls.map((url, index) => (
                <div key={`new-${index}`} style={{ position: 'relative', width: '80px', height: '80px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #cbd5e0' }}>
                  <img src={url} alt={`New ${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    type="button"
                    onClick={() => handleRemoveNewImage(index)}
                    style={{ position: 'absolute', top: '2px', right: '2px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', fontSize: '12px' }}
                  >
                    ×
                  </button>
                </div>
              ))}

              <label htmlFor="edit-post-file-input" className="upload-placeholder" style={{ width: '80px', height: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: '2px dashed #cbd5e0', borderRadius: '8px', cursor: 'pointer', background: '#f7fafc' }}>
                <Icon name="plus" size={20} style={{ color: '#718096' }} />
                <span style={{ fontSize: '10px', color: '#718096' }}>เพิ่มรูป</span>
              </label>
            </div>

            <input id="edit-post-file-input" type="file" accept="image/*" multiple onChange={handleImageChange} style={{ display: 'none' }} />
          </div>

          {(type === 'lost' || type === 'adopt') && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">ชื่อสัตว์เลี้ยง</label>
                <input type="text" name="name" className="form-input" value={formData.name} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">เพศ</label>
                <select name="gender" className="form-input" value={formData.gender} onChange={handleInputChange}>
                  <option value="ผู้">ผู้</option>
                  <option value="เมีย">เมีย</option>
                </select>
              </div>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">ประเภท</label>
              <select name="type" className="form-input" value={formData.type} onChange={handleInputChange}>
                <option value="สุนัข">สุนัข</option>
                <option value="แมว">แมว</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">สายพันธุ์</label>
              <input type="text" name="breed" className="form-input" value={formData.breed} onChange={handleInputChange} />
            </div>
          </div>

          {type === 'lost' && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">เงินรางวัลนำจับ (บาท)</label>
                <input type="number" name="reward" className="form-input" min="0" value={formData.reward} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label className="form-label">วันที่หาย</label>
                <input type="date" name="lost_date" className="form-input" value={formData.lost_date} onChange={handleInputChange} />
              </div>
            </div>
          )}

          {type === 'adopt' && (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">อายุโดยประมาณ</label>
                <input type="text" name="age" className="form-input" value={formData.age} onChange={handleInputChange} />
              </div>
              <div className="form-group">
                <label className="form-label">เบอร์ติดต่อกลับ / Line ID</label>
                <input type="text" name="contact" className="form-input" value={formData.contact} onChange={handleInputChange} />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">สถานที่</label>
            <input type="text" name="location_note" className="form-input" value={formData.location_note} onChange={handleInputChange} />
          </div>

          <ProvinceDistrictSelect
            province={formData.province}
            district={formData.district}
            onChange={handleLocationFieldsChange}
          />

          {(type === 'lost' || type === 'found') && (
            <div className="form-group">
              <label className="form-label">ปักหมุดตำแหน่งใหม่ <Icon name="mapPin" size={16} /></label>
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
          )}

          <div className="form-group">
            <label className="form-label">สถานะ</label>
            <input type="text" name="status" className="form-input" value={formData.status} onChange={handleInputChange} />
          </div>

          <div className="form-group">
            <label className="form-label">รายละเอียดเพิ่มเติม</label>
            <textarea name="note" className="form-input form-textarea" rows="4" value={formData.note} onChange={handleInputChange}></textarea>
          </div>

          <button type="submit" className="submit-btn" disabled={saving}>
            {saving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
          </button>
        </form>
      </div>

      <PostStatusModal
        status={statusModal?.status}
        title={statusModal?.title}
        message={statusModal?.message}
        onClose={handleStatusModalClose}
      />
    </div>
  );
}

export default EditPost;
