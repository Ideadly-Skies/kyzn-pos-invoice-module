const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export async function fetchRevenue({ bucket = 'daily', limit = 30 } = {}) {
  const qs = new URLSearchParams();
  qs.set('bucket', bucket);
  qs.set('limit', String(limit));

  const res = await fetch(`${API_URL}/revenue?${qs.toString()}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  
  const data = await res.json();
  return data;
}