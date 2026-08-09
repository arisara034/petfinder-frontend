import { useEffect, useState } from 'react';
import { fetchAdminPosts, deleteAdminPost } from '../../utils/admin';

const TYPE_LABELS = { adopt: 'หาบ้าน', lost: 'สัตว์หาย', found: 'พบสัตว์' };

function AdminPosts() {
  const [posts, setPosts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetchAdminPosts()
      .then(setPosts)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (p) => {
    if (!window.confirm(`ลบโพสต์ "${p.name || p.note?.slice(0, 20) || p.id}" ใช่หรือไม่?`)) return;
    try {
      await deleteAdminPost(p.post_type, p.id);
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  const filtered = filter === 'all' ? posts : posts.filter((p) => p.post_type === filter);

  return (
    <div>
      <h1>จัดการโพสต์</h1>
      {error && <div className="admin-error">{error}</div>}
      <div className="admin-filter-bar">
        {['all', 'adopt', 'lost', 'found'].map((f) => (
          <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
            {f === 'all' ? 'ทั้งหมด' : TYPE_LABELS[f]}
          </button>
        ))}
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ประเภท</th>
              <th>ชื่อ/รายละเอียด</th>
              <th>สถานะ</th>
              <th>วันที่โพสต์</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={`${p.post_type}-${p.id}`}>
                <td>{TYPE_LABELS[p.post_type]}</td>
                <td className="wrap">{p.name || p.note?.slice(0, 60) || '(ไม่มีรายละเอียด)'}</td>
                <td>{p.status || '-'}</td>
                <td>{p.created_at ? new Date(p.created_at).toLocaleDateString('th-TH') : '-'}</td>
                <td>
                  <button className="admin-btn danger" onClick={() => handleDelete(p)}>ลบ</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filtered.length === 0 && <div className="admin-empty">ไม่มีโพสต์</div>}
      </div>
    </div>
  );
}

export default AdminPosts;
