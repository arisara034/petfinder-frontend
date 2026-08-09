import { useEffect, useState } from 'react';
import { fetchAdminComments, deleteAdminComment } from '../../utils/admin';

function AdminComments() {
  const [comments, setComments] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetchAdminComments()
      .then(setComments)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (c) => {
    if (!window.confirm('ลบคอมเมนต์นี้ใช่หรือไม่?')) return;
    try {
      await deleteAdminComment(c.id);
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div>
      <h1>จัดการคอมเมนต์</h1>
      {error && <div className="admin-error">{error}</div>}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ผู้เขียน</th>
              <th>ข้อความ</th>
              <th>โพสต์</th>
              <th>วันที่</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {comments.map((c) => (
              <tr key={c.id}>
                <td>{c.users_profile?.full_name || '(ไม่ทราบชื่อ)'}</td>
                <td className="wrap">{c.content}</td>
                <td>{c.post_type} #{c.post_id}</td>
                <td>{c.created_at ? new Date(c.created_at).toLocaleDateString('th-TH') : '-'}</td>
                <td>
                  <button className="admin-btn danger" onClick={() => handleDelete(c)}>ลบ</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && comments.length === 0 && <div className="admin-empty">ยังไม่มีคอมเมนต์</div>}
      </div>
    </div>
  );
}

export default AdminComments;
