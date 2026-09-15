/**
 * Date formatting utilities for LearnovaAI
 */

export function formatDate(dateInput, format = 'full') {
  if (!dateInput) return 'N/A';

  const date = typeof dateInput === 'string' || typeof dateInput === 'number'
    ? new Date(dateInput)
    : dateInput;

  if (isNaN(date.getTime())) {
    return 'Ngày không hợp lệ';
  }

  const pad = (n) => String(n).padStart(2, '0');
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  if (format === 'date-only') {
    return `${day}/${month}/${year}`;
  }

  if (format === 'time-only') {
    return `${hours}:${minutes}`;
  }

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export function timeAgo(dateInput) {
  if (!dateInput) return '';

  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return 'Vừa xong';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} phút trước`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} giờ trước`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} ngày trước`;
  
  return formatDate(date, 'date-only');
}
