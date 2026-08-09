import { useEffect, useState } from 'react';
import { fetchAdminReports, updateReportStatus } from '../../utils/admin';

const STATUS_LABEL = { pending: 'รอตรวจสอบ', reviewed: 'ตรวจสอบแล้ว', dismissed: 'ยกเลิกรายงาน' };

function AdminReports() {
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetchAdminReports()
      .then(setReports)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const setStatus = async (r, status) => {
    try {
      await updateReportStatus(r.id, status);
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  const filtered = filter === 'all' ? reports : reports.filter((r) => r.status === filter);

  return (
    <div>
      <h1>รายงานโพสต์</h1>
      {error && <div className="admin-error">{error}</div>}
      <div className="admin-filter-bar">
        {['pending', 'reviewed', 'dismissed', 'all'].map((f) => (
          <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
            {f === 'all' ? 'ทั้งหมด' : STATUS_LABEL[f]}
          </button>
        ))}
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ผู้รายงาน</th>
              <th>โพสต์</th>
              <th>เหตุผล</th>
              <th>สถานะ</th>
              <th>วันที่</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>{r.reporter_profile?.full_name || '(ไม่ทราบชื่อ)'}</td>
                <td>{r.post_type} #{r.post_id}</td>
                <td className="wrap">{r.reason}</td>
                <td><span className={`admin-badge ${r.status}`}>{STATUS_LABEL[r.status] || r.status}</span></td>
                <td>{r.created_at ? new Date(r.created_at).toLocaleDateString('th-TH') : '-'}</td>
                <td>
                  {r.status !== 'reviewed' && <button className="admin-btn primary" onClick={() => setStatus(r, 'reviewed')}>ตรวจสอบแล้ว</button>}
                  {r.status !== 'dismissed' && <button className="admin-btn" onClick={() => setStatus(r, 'dismissed')}>ยกเลิก</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && <div className="admin-empty">ไม่มีรายงานในหมวดนี้</div>}
      </div>
    </div>
  );
}

export default AdminReports;
