import { useEffect, useState } from 'react';
import { fetchAdminStats } from '../../utils/admin';

const LABELS = {
  users: 'ผู้ใช้ทั้งหมด',
  adopt_posts: 'ประกาศหาบ้าน',
  lost_posts: 'ประกาศตามหาสัตว์หาย',
  found_posts: 'ประกาศพบสัตว์',
  comments: 'คอมเมนต์',
  pending_reports: 'รายงานที่รอตรวจสอบ',
};

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAdminStats().then(setStats).catch((e) => setError(e.message));
  }, []);

  return (
    <div>
      <h1>ภาพรวมระบบ</h1>
      {error && <div className="admin-error">{error}</div>}
      {!stats && !error && <div className="admin-empty">กำลังโหลด...</div>}
      {stats && (
        <div className="admin-stat-grid">
          {Object.entries(LABELS).map(([key, label]) => (
            <div className="admin-stat-card" key={key}>
              <div className="value">{stats[key] ?? 0}</div>
              <div className="label">{label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
