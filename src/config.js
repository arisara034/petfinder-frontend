// URL ของ backend API
// - ตอนพัฒนาในเครื่อง (npm run dev) จะใช้ http://localhost:8000 โดยอัตโนมัติ
// - ตอน deploy จริง ให้ตั้งค่า environment variable VITE_API_BASE_URL เป็น URL ของ Render
//   เช่น https://petfinder-xxxx.onrender.com (ห้ามมี / ปิดท้าย)
export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
