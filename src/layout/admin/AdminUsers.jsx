import { useEffect, useState } from 'react';
import { fetchAdminUsers, updateUserRole, updateUserBan } from '../../utils/admin';

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetchAdminUsers()
      .then(setUsers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const myUserId = localStorage.getItem('userId');

  const toggleRole = async (u) => {
    const nextRole = u.role === 'admin' ? 'user' : 'admin';
    if (u.id === myUserId && nextRole !== 'admin') {
      if (!window.confirm('คุณกำลังจะถอดสิทธิ์แอดมินของตัวเอง แน่ใจหรือไม่?')) return;
    }
    try {
      await updateUserRole(u.id, nextRole);
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  const toggleBan = async (u) => {
    try {
      await updateUserBan(u.id, !u.is_banned);
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div>
      <h1>จัดการผู้ใช้</h1>
      {error && <div className="admin-error">{error}</div>}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>ชื่อ</th>
              <th>เบอร์โทร</th>
              <th>สิทธิ์</th>
              <th>สถานะ</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.full_name || '(ไม่ระบุชื่อ)'}</td>
                <td>{u.phone || '-'}</td>
                <td><span className={`admin-badge ${u.role === 'admin' ? 'admin' : 'user'}`}>{u.role === 'admin' ? 'แอดมิน' : 'ผู้ใช้'}</span></td>
                <td><span className={`admin-badge ${u.is_banned ? 'banned' : 'active'}`}>{u.is_banned ? 'ถูกระงับ' : 'ปกติ'}</span></td>
                <td>
                  <button className="admin-btn" onClick={() => toggleRole(u)}>
                    {u.role === 'admin' ? 'ถอดสิทธิ์แอดมิน' : 'ตั้งเป็นแอดมิน'}
                  </button>
                  <button className={`admin-btn ${u.is_banned ? '' : 'danger'}`} onClick={() => toggleBan(u)}>
                    {u.is_banned ? 'ปลดแบน' : 'แบนผู้ใช้'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && users.length === 0 && <div className="admin-empty">ยังไม่มีผู้ใช้ในระบบ</div>}
      </div>
    </div>
  );
}

export default AdminUsers;
