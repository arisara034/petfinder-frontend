import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import { supabase } from '../supabaseClient';
import Icon from './Icon';
import './Petmap.css';

const TYPE_META = {
  lost: { color: '#f97316', icon: 'search', label: 'ประกาศหาย' },
  found: { color: '#22c55e', icon: 'home', label: 'แจ้งพบ' },
  adopt: { color: '#0ea5e9', icon: 'pawprint', label: 'หาบ้านใหม่' },
};

// SVG แบบ raw string สำหรับหมุดบนแผนที่ (Leaflet divIcon รับได้แค่ HTML string ไม่ใช่ JSX)
const MARKER_SVG = {
  search: '<circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10"/>',
  pawprint: '<ellipse cx="12" cy="16.2" rx="4" ry="3.2"/><ellipse cx="5.5" cy="10.5" rx="1.9" ry="2.4"/><ellipse cx="9.3" cy="6.8" rx="1.9" ry="2.4"/><ellipse cx="14.7" cy="6.8" rx="1.9" ry="2.4"/><ellipse cx="18.5" cy="10.5" rx="1.9" ry="2.4"/>',
};

function buildIcon(type) {
  const meta = TYPE_META[type];
  const svg = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${MARKER_SVG[meta.icon]}</svg>`;
  return L.divIcon({
    className: 'pet-map-marker',
    html: `<span style="background:${meta.color}">${svg}</span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 34],
    popupAnchor: [0, -34],
  });
}

const ICONS = {
  lost: buildIcon('lost'),
  found: buildIcon('found'),
  adopt: buildIcon('adopt'),
};

function PetMap() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const fetchPostsWithLocation = async () => {
      const [{ data: lost }, { data: found }, { data: adopt }] = await Promise.all([
        supabase.from('lost_posts').select('*').not('latitude', 'is', null).not('longitude', 'is', null),
        supabase.from('found_posts').select('*').not('latitude', 'is', null).not('longitude', 'is', null),
        supabase.from('adopt_posts').select('*').not('latitude', 'is', null).not('longitude', 'is', null),
      ]);

      setPosts([
        ...(lost || []).map(p => ({ ...p, type: 'lost' })),
        ...(found || []).map(p => ({ ...p, type: 'found' })),
        ...(adopt || []).map(p => ({ ...p, type: 'adopt' })),
      ]);
    };

    fetchPostsWithLocation();
  }, []);

  return (
    <div className="pet-map-box">
      <div className="pet-map-legend">
        {Object.entries(TYPE_META).map(([type, meta]) => (
          <span key={type} className="pet-map-legend-item">
            <span className="pet-map-legend-dot" style={{ background: meta.color }}>
              <Icon name={meta.icon} size={13} style={{ color: '#fff' }} />
            </span>
            {meta.label}
          </span>
        ))}
      </div>

      <MapContainer
        center={[13.8591, 100.5217]}
        zoom={11}
        scrollWheelZoom={false}
        style={{ width: '100%', height: '450px', borderRadius: '16px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {posts.map((post) => (
          <Marker key={`${post.type}-${post.id}`} position={[post.latitude, post.longitude]} icon={ICONS[post.type]}>
            <Popup>
              <div className="pet-map-popup">
                {post.image_url && (
                  <img src={post.image_url} alt={post.name || post.type} />
                )}
                <span className="pet-map-popup-badge" style={{ background: TYPE_META[post.type].color }}>
                  <Icon name={TYPE_META[post.type].icon} size={12} style={{ color: '#fff' }} /> {TYPE_META[post.type].label}
                </span>
                <h4>{post.name || post.breed || 'สัตว์เลี้ยง'}</h4>
                <p>{post.location_note || 'ไม่มีระบุสถานที่'}</p>
                <Link to={`/post/${post.type}/${post.id}`}>ดูรายละเอียด</Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}

export default PetMap;
