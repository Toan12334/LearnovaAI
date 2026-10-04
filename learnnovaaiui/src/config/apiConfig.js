/**
 * Centralized API Configuration for LearnovaAI Frontend
 * 
 * Manages Base URL dynamically based on environment:
 * - Localhost / Development: http://127.0.0.1:8000 (FastAPI Backend local)
 * - Production: Railway Backend URL (from VITE_API_URL or fallback)
 */

export const getApiBaseUrl = () => {
  // 1. Ưu tiên biến môi trường VITE_API_URL nếu được chỉ định
  if (import.meta.env.VITE_API_URL) {
    let url = import.meta.env.VITE_API_URL.trim();
    // Trên Windows, chuyển 'localhost' thành '127.0.0.1' để tránh lỗi phân giải IPv6 (::1) gây connection refused
    if (url.includes('localhost')) {
      url = url.replace('localhost', '127.0.0.1');
    }
    return url.replace(/\/+$/, '');
  }

  // 2. Tự động fallback dựa theo chế độ Vite (PROD vs DEV)
  if (import.meta.env.PROD) {
    return 'https://learnovaai-production-8fe5.up.railway.app';
  }

  return 'http://127.0.0.1:8000';
};

export const API_BASE_URL = getApiBaseUrl();
export const IS_PRODUCTION = import.meta.env.PROD;
export const IS_DEVELOPMENT = import.meta.env.DEV;

export default {
  API_BASE_URL,
  IS_PRODUCTION,
  IS_DEVELOPMENT,
};
