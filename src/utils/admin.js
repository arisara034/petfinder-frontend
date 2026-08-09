import { API_BASE } from '../config';

function authHeaders() {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handle(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.detail || `คำขอล้มเหลว (${res.status})`);
  }
  return data;
}

export const fetchAdminStats = () =>
  fetch(`${API_BASE}/api/admin/stats`, { headers: authHeaders() }).then(handle);

export const fetchAdminUsers = () =>
  fetch(`${API_BASE}/api/admin/users`, { headers: authHeaders() }).then(handle);

export const updateUserRole = (userId, role) =>
  fetch(`${API_BASE}/api/admin/users/${userId}/role`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ role }),
  }).then(handle);

export const updateUserBan = (userId, is_banned) =>
  fetch(`${API_BASE}/api/admin/users/${userId}/ban`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ is_banned }),
  }).then(handle);

export const fetchAdminPosts = () =>
  fetch(`${API_BASE}/api/admin/posts`, { headers: authHeaders() }).then(handle);

export const updatePostStatus = (postType, postId, status) =>
  fetch(`${API_BASE}/api/admin/posts/${postType}/${postId}/status`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  }).then(handle);

export const deleteAdminPost = (postType, postId) =>
  fetch(`${API_BASE}/api/admin/posts/${postType}/${postId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  }).then(handle);

export const fetchAdminComments = () =>
  fetch(`${API_BASE}/api/admin/comments`, { headers: authHeaders() }).then(handle);

export const deleteAdminComment = (commentId) =>
  fetch(`${API_BASE}/api/admin/comments/${commentId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  }).then(handle);

export const fetchAdminReports = () =>
  fetch(`${API_BASE}/api/admin/reports`, { headers: authHeaders() }).then(handle);

export const updateReportStatus = (reportId, status) =>
  fetch(`${API_BASE}/api/admin/reports/${reportId}`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  }).then(handle);

export const submitReport = (postType, postId, reason) =>
  fetch(`${API_BASE}/api/reports`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ post_type: postType, post_id: postId, reason }),
  }).then(handle);
