import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Zap,
  Sparkles,
  Shield,
  ArrowRight,
  Infinity as InfinityIcon,
  HelpCircle,
} from 'lucide-react';
import paymentApi from '../../services/paymentApi';
import { useAuth } from '../auth';
import { VietQRPaymentModal } from './VietQRPaymentModal';
import './pricing.css';

export function PricingModal({ isOpen, onClose, onOpenAuth }) {
  const { user, isAuthenticated } = useAuth();
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderLoading, setOrderLoading] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Payment Modal State
  const [activeOrder, setActiveOrder] = useState(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const fetchPackages = async () => {
      setLoading(true);
      setErrorMsg('');
      try {
        const data = await paymentApi.getPackages();
        setPackages(data);
      } catch (err) {
        console.warn('Lỗi tải gói cước:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPackages();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectPackage = async (pkg) => {
    if (!isAuthenticated) {
      onClose();
      if (onOpenAuth) {
        onOpenAuth('signin');
      }
      return;
    }

    setOrderLoading(pkg.id);
    setErrorMsg('');
    try {
      const order = await paymentApi.createOrder(pkg.id);
      setActiveOrder(order);
      setIsQrModalOpen(true);
    } catch (err) {
      setErrorMsg(err.message || 'Không thể tạo đơn hàng thanh toán. Vui lòng thử lại.');
    } finally {
      setOrderLoading(null);
    }
  };

  return (
    <>
      <div className="pricing-modal-overlay" onClick={onClose}>
        <div
          className="pricing-modal-container"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          {/* Close Button */}
          <button className="pricing-close-btn" onClick={onClose} aria-label="Đóng">
            <X className="w-4 h-4" />
          </button>

          {/* Header */}
          <div className="pricing-header">
            <div className="pricing-header-badge">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Gói Nạp Từ Linh Hoạt (Pay-As-You-Go)</span>
            </div>
            <h2 className="pricing-title">Đầu Tư Cho Sự Minh Bạch Học Thuật</h2>
            <p className="pricing-subtitle">
              Nạp một lần, <b>số từ vĩnh viễn không bao giờ hết hạn</b>. Kiểm tra đạo văn chuẩn Turnitin
              và phát hiện văn bản AI chuyên sâu cho tiếng Việt.
            </p>
          </div>

          {/* Error alert */}
          {errorMsg && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#fca5a5',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                fontSize: '0.85rem',
                marginBottom: '1.25rem',
                textAlign: 'center',
              }}
            >
              {errorMsg}
            </div>
          )}

          {/* Packages Grid */}
          <div className="pricing-grid">
            {packages.map((pkg) => {
              const isPopular = pkg.is_popular || pkg.id === 'plus';
              const isLoadingCurrent = orderLoading === pkg.id;

              return (
                <div
                  key={pkg.id}
                  className={`pricing-card ${isPopular ? 'popular' : ''}`}
                >
                  {pkg.badge && (
                    <div className="pricing-card-badge">{pkg.badge}</div>
                  )}

                  <div>
                    <div className="pricing-card-header">
                      <h3 className="pricing-card-name">{pkg.name}</h3>
                      <p className="pricing-card-desc">{pkg.description}</p>
                    </div>

                    <div className="pricing-price-box">
                      <div className="pricing-price-num">
                        {pkg.price.toLocaleString('vi-VN')} đ
                      </div>
                      <div className="pricing-words-pill">
                        <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                        <span>+{pkg.words.toLocaleString('vi-VN')} từ kiểm tra</span>
                      </div>
                    </div>

                    <ul className="pricing-features-list">
                      {(pkg.features || []).map((feat, idx) => (
                        <li key={idx} className="pricing-feature-item">
                          <CheckCircle2
                            className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                              isPopular ? 'text-indigo-400' : 'text-emerald-400'
                            }`}
                          />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    type="button"
                    className={`pricing-card-btn ${isPopular ? 'popular' : 'default'}`}
                    onClick={() => handleSelectPackage(pkg)}
                    disabled={isLoadingCurrent}
                  >
                    {isLoadingCurrent ? (
                      <span>Đang tạo VietQR...</span>
                    ) : (
                      <>
                        <span>{isAuthenticated ? 'Nạp Ngay Qua VietQR' : 'Đăng Nhập Để Nạp'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Guarantee Footer */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1.5rem',
              flexWrap: 'wrap',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              paddingTop: '1.25rem',
              fontSize: '0.825rem',
              color: '#94a3b8',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <InfinityIcon className="w-4 h-4 text-indigo-400" />
              <span>Số từ không bao giờ hết hạn</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>Bảo mật dữ liệu tuyệt đối (Không lưu vào CSDL công cộng)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Kích hoạt tự động tức thì qua PayOS VietQR</span>
            </div>
          </div>
        </div>
      </div>

      {/* VietQR Payment Modal */}
      <VietQRPaymentModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        orderData={activeOrder}
        onPaymentSuccess={() => {
          // Callback after payment
        }}
      />
    </>
  );
}

export default PricingModal;
