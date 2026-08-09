import { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css'; // สำคัญมาก: ต้องนำเข้า CSS ของแผนที่ด้วย
import L from 'leaflet';
import Icon from './Icon';

// 🛠️ แก้ไขบั๊กไอคอนหมุดหาย (เป็นบั๊กปกติของ Leaflet บน React)
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

function LocationMap() {
  // ตั้งค่าพิกัดเริ่มต้น (ตัวอย่าง: แถวนนทบุรี/กรุงเทพฯ)
  const [position, setPosition] = useState({ lat: 13.8500, lng: 100.5250 });

  // คอมโพเนนต์ย่อยสำหรับดักจับเหตุการณ์การคลิกบนแผนที่
  function MapEvents() {
    useMapEvents({
      click(e) {
        setPosition(e.latlng);
        console.log("พิกัดที่ปักหมุด:", e.latlng.lat, e.latlng.lng);
        // ✨ ในอนาคตสามารถนำค่า lat, lng นี้ส่งไปบันทึกพร้อมกับฟอร์มได้เลยครับ
      },
    });
    return position === null ? null : <Marker position={position} />;
  }

  return (
    <div className="map-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <label className="form-label">ปักหมุดสถานที่บนแผนที่ <Icon name="mapPin" size={16} /></label>
      <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#64748b' }}>
        * คลิกบนแผนที่เพื่อเลื่อนหมุดไปยังจุดที่เกิดเหตุ
      </p>
      
      {/* ตัวกล่องแผนที่ */}
      <div style={{ height: '350px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
        <MapContainer 
          center={[position.lat, position.lng]} 
          zoom={13} 
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapEvents />
        </MapContainer>
      </div>

      {/* แสดงพิกัดตัวเลขให้เห็น (ลบออกหรือซ่อนได้ในภายหลัง) */}
      <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>
        พิกัดปัจจุบัน: {position.lat.toFixed(4)}, {position.lng.toFixed(4)}
      </div>
    </div>
  );
}

export default LocationMap;