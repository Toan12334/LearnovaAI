import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  QrCode,
} from 'lucide-react';
import paymentApi from '../../services/paymentApi';
import { useAuth } from '../auth';
import './pricing.css';

export function VietQRPaymentModal({ isOpen, onClose, orderData, onPaymentSuccess }) {
  const { updateWordsBalance } = useAuth();
  const [copiedField, setCopiedField] = useState(null);
  const [countdown, setCountdown] = useState(600); // 10 phút
  const [isPaid, setIsPaid] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Countdown timer
  useEffect(() => {
    if (!isOpen || !orderData) return;
    setCountdown(orderData.expires_in_seconds || 600);
    setIsPaid(false);
    setErrorMsg('');

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, orderData]);

  // 2. Polling order status every 2.5 seconds
  useEffect(() => {
    if (!isOpen || !orderData || isPaid) return;

    const interval = setInterval(async () => {
      try {
        const res = await paymentApi.getOrderStatus(orderData.order_code);
        if (res && res.status === 'PAID') {
          setIsPaid(true);
          if (res.words_balance !== undefined && res.words_balance !== null) {
            updateWordsBalance(res.words_balance);
          }
          if (onPaymentSuccess) {
            onPaymentSuccess(res);
          }
          clearInterval(interval);
          setTimeout(() => {
            onClose();
          }, 3000);
        }
      } catch (err) {
        // Silent poll error
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [isOpen, orderData, isPaid, updateWordsBalance, onPaymentSuccess, onClose]);

  if (!isOpen || !orderData) return null;

  const handleCopy = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => {
      setCopiedField(null);
    }, 2000);
  };

  const handleSimulatePayment = async () => {
    setSimulating(true);
    setErrorMsg('');
    try {
      const res = await paymentApi.simulatePayment(orderData.order_code);
      if (res && res.success) {
        setIsPaid(true);
        // Refresh order status
        const statusRes = await paymentApi.getOrderStatus(orderData.order_code);
        if (statusRes?.words_balance !== undefined) {
          updateWordsBalance(statusRes.words_balance);
        }
        if (onPaymentSuccess) {
          onPaymentSuccess(statusRes);
        }
        setTimeout(() => {
          onClose();
        }, 3000);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Mô phỏng thanh toán thất bại.');
    } finally {
      setSimulating(false);
    }
  };

  const formatSeconds = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="pricing-modal-overlay" onClick={onClose}>
      <div
        className="pricing-modal-container vietqr-modal-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Close Button */}
        <button className="pricing-close-btn" onClick={onClose} aria-label="Đóng">
          <X className="w-4 h-4" />
        </button>

        {/* Success View */}
        {isPaid ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center' }}>
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: 'rgba(34, 197, 94, 0.2)',
                border: '2px solid #22c55e',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem',
                color: '#22c55e',
              }}
            >
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ffffff', margin: '0 0 0.5rem 0' }}>
              Thanh Toán Thành Công! 🎉
            </h3>
            <p style={{ color: '#86efac', fontSize: '1.05rem', fontWeight: 600, margin: '0 0 1rem 0' }}>
              +{orderData.words.toLocaleString()} từ đã được cộng vào tài khoản của bạn.
            </p>
            <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>
              Cảm ơn bạn đã tin tưởng sử dụng dịch vụ của LearnovaAI. Cửa sổ sẽ tự động đóng sau 3 giây...
            </p>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div className="pricing-header-badge">
                <QrCode className="w-3.5 h-3.5" />
                <span>Thanh Toán PayOS VietQR</span>
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ffffff', margin: '0 0 0.35rem 0' }}>
                {orderData.package_name}
              </h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
                Quét mã QR bằng ứng dụng ngân hàng hoặc MoMo bất kỳ để thanh toán tự động
              </p>
            </div>

            {/* Countdown Badge */}
            <div className="vietqr-countdown-badge">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>
                Đơn hàng hết hạn sau: <b>{formatSeconds(countdown)}</b>
              </span>
            </div>

            {/* QR Code Frame */}
            <div>
              <div className="vietqr-qr-frame">
                <img
                  src={
                    orderData.qr_code?.startsWith('http')
                      ? orderData.qr_code
                      : `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(orderData.qr_code || '')}`
                  }
                  alt="Mã QR chuyển khoản VietQR"
                  className="vietqr-qr-img"
                />
              </div>
            </div>

            {/* Bank Transfer Details Table */}
            <div className="vietqr-info-table">
              <div className="vietqr-info-row">
                <span className="vietqr-info-label">Ngân hàng thụ hưởng:</span>
                <span className="vietqr-info-val">{orderData.bank_name || 'MB Bank'}</span>
              </div>

              <div className="vietqr-info-row">
                <span className="vietqr-info-label">Số tài khoản:</span>
                <div className="vietqr-info-val">
                  <span style={{ color: '#38bdf8', fontFamily: 'monospace', fontSize: '0.95rem' }}>
                    {orderData.account_number || '0345678999'}
                  </span>
                  <button
                    type="button"
                    className="vietqr-copy-btn"
                    onClick={() => handleCopy(orderData.account_number || '0345678999', 'account')}
                  >
                    {copiedField === 'account' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              <div className="vietqr-info-row">
                <span className="vietqr-info-label">Tên người nhận:</span>
                <span className="vietqr-info-val">{orderData.account_name || 'CONG TY LEARNOVAAI'}</span>
              </div>

              <div className="vietqr-info-row">
                <span className="vietqr-info-label">Số tiền chính xác:</span>
                <div className="vietqr-info-val">
                  <span style={{ color: '#22c55e', fontSize: '1rem', fontWeight: 700 }}>
                    {orderData.amount.toLocaleString('vi-VN')} đ
                  </span>
                  <button
                    type="button"
                    className="vietqr-copy-btn"
                    onClick={() => handleCopy(orderData.amount.toString(), 'amount')}
                  >
                    {copiedField === 'amount' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              <div className="vietqr-info-row">
                <span className="vietqr-info-label">Nội dung chuyển tiền:</span>
                <div className="vietqr-info-val">
                  <span
                    style={{
                      background: 'rgba(99, 102, 241, 0.2)',
                      color: '#a5b4fc',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontFamily: 'monospace',
                      fontWeight: 700,
                    }}
                  >
                    {orderData.payment_content}
                  </span>
                  <button
                    type="button"
                    className="vietqr-copy-btn"
                    onClick={() => handleCopy(orderData.payment_content, 'content')}
                  >
                    {copiedField === 'content' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>

            {/* PayOS Checkout Link button if present */}
            {orderData.checkout_url && (
              <a
                href={orderData.checkout_url}
                target="_blank"
                rel="noopener noreferrer"
                className="pricing-card-btn popular"
                style={{ textDecoration: 'none', marginBottom: '0.75rem' }}
              >
                <span>Mở Cổng Thanh Toán PayOS</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            {/* Test Simulation Button */}
            {orderData.is_simulation && (
              <button
                type="button"
                className="vietqr-simulation-btn"
                onClick={handleSimulatePayment}
                disabled={simulating}
              >
                {simulating ? (
                  <span>Đang xử lý cộng từ...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>[Thử Nghiệm Sandbox] Xác nhận Đã Chuyển Tiền</span>
                  </>
                )}
              </button>
            )}

            <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: '#64748b' }}>
              <ShieldCheck className="w-3.5 h-3.5 inline mr-1 text-indigo-400" />
              Hệ thống tự động phát hiện chuyển khoản và cộng từ trong vòng 3 giây
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default VietQRPaymentModal;
