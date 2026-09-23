import { API_BASE } from '../config';

// ดึงรายชื่อโพสต์ฝั่งตรงข้าม (lost <-> found) ที่ AI ตรวจพบว่ารูปภาพคล้ายกัน เรียงจากเหมือนมากไปน้อย
export async function fetchAiMatches(postType, postId) {
  const res = await fetch(`${API_BASE}/api/match/${postType}/${postId}`);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'ไม่สามารถค้นหาการจับคู่ได้');
  }
  return res.json();
}
