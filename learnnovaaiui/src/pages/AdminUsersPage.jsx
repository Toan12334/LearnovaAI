import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  Shield,
  ShieldAlert,
  Search,
  Filter,
  RefreshCw,
  Plus,
  Coins,
  Calendar,
  FileText,
  Lock,
  Unlock,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowUpDown,
  MoreVertical,
} from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { formatDate } from '../utils/formatDate';
import adminUsersApi from '../services/adminUsersApi';
import { useAuth } from '../features/auth';

export function AdminUsersPage({ onBack }) {
  const { user: currentUser } = useAuth();

  // Stats state
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // User list state
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modals state
  const [selectedUser, setSelectedUser] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [userDetailData, setUserDetailData] = useState(null);

  // Adjust balance modal
  const [balanceModalOpen, setBalanceModalOpen] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState(10000);
  const [adjustReason, setAdjustReason] = useState('Nạp bù số từ cho người dùng');
  const [actionLoading, setActionLoading] = useState(false);

  // Create user modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'user',
    words_balance: 10000,
    admin_notes: '',
  });

  // Notification toast
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load stats
  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const res = await adminUsersApi.getStats();
      setStats(res);
    } catch (err) {
      console.error('Lỗi nạp thống kê:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Load users
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await adminUsersApi.getUsers({
        page,
        pageSize,
        search: searchTerm,
        role: roleFilter,
        status: statusFilter,
        sortBy,
        sortOrder,
      });
      setUsers(res.users || []);
      setTotal(res.total || 0);
      setTotalPages(res.total_pages || 1);
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách người dùng.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, roleFilter, statusFilter, sortBy, sortOrder]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchUsers();
  };

  // Open Adjust Balance Modal
  const openAdjustBalance = (user) => {
    setSelectedUser(user);
    setAdjustAmount(10000);
    setAdjustReason('Nạp bổ sung số từ cho tài khoản');
    setBalanceModalOpen(true);
  };

  const submitAdjustBalance = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      setActionLoading(true);
      const res = await adminUsersApi.adjustBalance(selectedUser.id, adjustAmount, adjustReason);
      showToast(res.message || 'Điều chỉnh số từ thành công!');
      setBalanceModalOpen(false);
      fetchUsers();
      fetchStats();
    } catch (err) {
      showToast(err.message || 'Lỗi khi điều chỉnh số từ.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle user role
  const handleToggleRole = async (targetUser) => {
    const newRole = targetUser.role === 'admin' ? 'user' : 'admin';
    const confirmMsg = newRole === 'admin'
      ? `Cấp quyền Quản trị viên (Admin) cho tài khoản ${targetUser.email || targetUser.id}?`
      : `Thu hồi quyền Quản trị viên của tài khoản ${targetUser.email || targetUser.id}?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await adminUsersApi.updateRole(targetUser.id, newRole);
      showToast(res.message || 'Cập nhật vai trò thành công!');
      fetchUsers();
      fetchStats();
    } catch (err) {
      showToast(err.message || 'Lỗi khi cập nhật vai trò.', 'error');
    }
  };

  // Toggle status (Active / Banned)
  const handleToggleStatus = async (targetUser) => {
    const isCurrentlyActive = (targetUser.status || 'active') === 'active';
    const newStatus = isCurrentlyActive ? 'banned' : 'active';
    const actionLabel = isCurrentlyActive ? 'KHÓA' : 'MỞ KHÓA';

    const reason = window.prompt(
      `Nhập lý do ${actionLabel} tài khoản ${targetUser.email || targetUser.id}:`,
      isCurrentlyActive ? 'Vi phạm điều khoản dịch vụ' : 'Đã xác minh tài khoản'
    );
    if (reason === null) return; // User cancelled prompt

    try {
      const res = await adminUsersApi.updateStatus(targetUser.id, newStatus, reason);
      showToast(res.message || 'Cập nhật trạng thái thành công!');
      fetchUsers();
      fetchStats();
    } catch (err) {
      showToast(err.message || 'Lỗi khi cập nhật trạng thái tài khoản.', 'error');
    }
  };

  // Open User Detail
  const openUserDetail = async (user) => {
    setSelectedUser(user);
    setDetailModalOpen(true);
    setDetailLoading(true);
    try {
      const res = await adminUsersApi.getUserDetail(user.id);
      setUserDetailData(res);
    } catch (err) {
      showToast(err.message || 'Không thể tải chi tiết người dùng.', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  // Submit Create User
  const submitCreateUser = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const res = await adminUsersApi.createUser(createForm);
      showToast(res.message || 'Tạo tài khoản người dùng mới thành công!');
      setCreateModalOpen(false);
      setCreateForm({
        email: '',
        password: '',
        full_name: '',
        role: 'user',
        words_balance: 10000,
        admin_notes: '',
      });
      fetchUsers();
      fetchStats();
    } catch (err) {
      showToast(err.message || 'Lỗi khi tạo người dùng.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full pb-12">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl text-xs font-bold transition-all border ${
          toast.type === 'error'
            ? 'bg-rose-900/90 text-rose-100 border-rose-700/80'
            : 'bg-emerald-900/90 text-emerald-100 border-emerald-700/80'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4 text-rose-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-600 font-black">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Quản Trị Người Dùng & Hệ Thống
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-purple-100 text-purple-700 border border-purple-200">
                  Admin Dashboard
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Quản lý hồ sơ, phân quyền, kiểm soát hạn mức số từ và giám sát bảo mật hệ thống
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => { fetchStats(); fetchUsers(); }}
            icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
          >
            Làm mới
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => setCreateModalOpen(true)}
            icon={<Plus className="w-4 h-4" />}
          >
            Tạo tài khoản mới
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        
        {/* Card 1: Total Users */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng người dùng</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-900">
              {statsLoading ? '...' : (stats?.total_users ?? 0).toLocaleString('vi-VN')}
            </div>
            <div className="text-[11px] font-semibold text-emerald-600 mt-1 flex items-center gap-1">
              <span>+{stats?.new_users_last_7_days ?? 0}</span>
              <span className="text-slate-400 font-normal">trong 7 ngày qua</span>
            </div>
          </div>
        </div>

        {/* Card 2: Active Users */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Đang hoạt động</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-600">
              {statsLoading ? '...' : (stats?.active_users ?? 0).toLocaleString('vi-VN')}
            </div>
            <div className="text-[11px] font-semibold text-slate-400 mt-1">
              Tài khoản hợp lệ
            </div>
          </div>
        </div>

        {/* Card 3: Banned Users */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Đã khóa</span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-rose-600">
              {statsLoading ? '...' : (stats?.banned_users ?? 0).toLocaleString('vi-VN')}
            </div>
            <div className="text-[11px] font-semibold text-slate-400 mt-1">
              Bị chặn truy cập
            </div>
          </div>
        </div>

        {/* Card 4: Total Words Quota */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng số từ cấp</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-amber-600">
              {statsLoading ? '...' : (stats?.total_words_allocated ?? 0).toLocaleString('vi-VN')}
            </div>
            <div className="text-[11px] font-semibold text-slate-400 mt-1">
              Hạn mức toàn hệ thống
            </div>
          </div>
        </div>

        {/* Card 5: Documents Checked */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col justify-between col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lượt kiểm tra</span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-purple-600">
              {statsLoading ? '...' : (stats?.total_documents_checked ?? 0).toLocaleString('vi-VN')}
            </div>
            <div className="text-[11px] font-semibold text-slate-400 mt-1">
              Tài liệu đã đối soát
            </div>
          </div>
        </div>

      </div>

      {/* Main Filter & Table Card */}
      <Card
        title={`Danh Sách Người Dùng (${total.toLocaleString('vi-VN')})`}
        subtitle="Tìm kiếm, phân quyền tài khoản và cộng/trừ số từ trực tiếp"
      >
        {/* Search & Filter Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100">
          
          {/* Search Box */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Tìm theo email, họ tên..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-20 py-2 rounded-xl text-xs font-medium border border-slate-200 bg-slate-50 focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <button
              type="submit"
              className="absolute right-1.5 top-1 px-3 py-1 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              Tìm
            </button>
          </form>

          {/* Filters Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:bg-white cursor-pointer"
            >
              <option value="all">Tất cả vai trò</option>
              <option value="user">Người dùng (User)</option>
              <option value="admin">Quản trị viên (Admin)</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:bg-white cursor-pointer"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Hoạt động (Active)</option>
              <option value="banned">Bị khóa (Banned)</option>
            </select>

            {/* Sort Order */}
            <select
              value={`${sortBy}_${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split('_');
                setSortBy(sb);
                setSortOrder(so);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:bg-white cursor-pointer"
            >
              <option value="created_at_desc">Mới đăng ký nhất</option>
              <option value="created_at_asc">Đăng ký lâu nhất</option>
              <option value="words_balance_desc">Số từ nhiều nhất</option>
              <option value="words_balance_asc">Số từ ít nhất</option>
            </select>

          </div>
        </div>

        {/* User Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-9 h-9 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-xs text-slate-500 font-semibold">Đang tải danh sách người dùng...</p>
            </div>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 px-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h4 className="text-base font-bold text-slate-700 mb-1">Không tìm thấy người dùng phù hợp</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Thử thay đổi từ khóa tìm kiếm hoặc bỏ các bộ lọc để xem toàn bộ danh sách.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3 px-3">Người dùng / Email</th>
                  <th className="py-3 px-3">Vai trò</th>
                  <th className="py-3 px-3">Số dư từ</th>
                  <th className="py-3 px-3">Trạng thái</th>
                  <th className="py-3 px-3">Lượt check</th>
                  <th className="py-3 px-3">Ngày đăng ký</th>
                  <th className="py-3 px-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {users.map((u) => {
                  const isAdmin = u.role === 'admin';
                  const isBanned = u.status === 'banned';
                  const isSelf = currentUser && currentUser.id === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      
                      {/* User Info */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 ${
                            isAdmin ? 'bg-gradient-to-tr from-purple-600 to-indigo-600 shadow-xs' : 'bg-gradient-to-tr from-slate-600 to-slate-800'
                          }`}>
                            {(u.full_name || u.email || 'U')[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                              <span>{u.full_name || 'Chưa đặt tên'}</span>
                              {isSelf && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-indigo-100 text-indigo-700">
                                  Bạn
                                </span>
                              )}
                            </div>
                            <div className="text-slate-500 font-mono text-[11px] mt-0.5">
                              {u.email || <span className="text-slate-400 italic">Chưa có email</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase border ${
                          isAdmin
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}>
                          {isAdmin ? <Shield className="w-3 h-3 text-purple-600" /> : null}
                          <span>{u.role || 'user'}</span>
                        </span>
                      </td>

                      {/* Words Balance */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="flex items-baseline gap-1">
                            <span className="text-sm font-black text-amber-600">
                              {(u.words_balance ?? 0).toLocaleString('vi-VN')}
                            </span>
                            <span className="text-[10px] text-slate-400 uppercase font-semibold">từ</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => openAdjustBalance(u)}
                            title="Điều chỉnh số từ"
                            className="p-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200/80 transition-colors cursor-pointer"
                          >
                            <Coins className="w-3 h-3" />
                          </button>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                          isBanned
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isBanned ? 'bg-rose-500' : 'bg-emerald-500'}`}></span>
                          <span>{isBanned ? 'Bị khóa' : 'Hoạt động'}</span>
                        </span>
                      </td>

                      {/* Document Checks Count */}
                      <td className="py-3 px-3 text-slate-600 font-semibold">
                        <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-700">
                          {u.total_documents ?? 0} bài
                        </span>
                      </td>

                      {/* Registration Date */}
                      <td className="py-3 px-3 text-slate-500 font-medium whitespace-nowrap">
                        {formatDate(u.created_at)}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* View Detail */}
                          <button
                            type="button"
                            onClick={() => openUserDetail(u)}
                            title="Xem chi tiết hồ sơ & lịch sử"
                            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Role */}
                          <button
                            type="button"
                            onClick={() => handleToggleRole(u)}
                            disabled={isSelf}
                            title={isAdmin ? 'Hạ quyền xuống User' : 'Nâng cấp quyền Admin'}
                            className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                              isSelf
                                ? 'opacity-30 cursor-not-allowed bg-slate-50 text-slate-400 border-slate-200'
                                : isAdmin
                                ? 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                            }`}
                          >
                            <Shield className="w-3.5 h-3.5" />
                          </button>

                          {/* Ban / Unban */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(u)}
                            disabled={isSelf}
                            title={isBanned ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                            className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                              isSelf
                                ? 'opacity-30 cursor-not-allowed bg-slate-50 text-slate-400 border-slate-200'
                                : isBanned
                                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                            }`}
                          >
                            {isBanned ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                          </button>

                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100 text-xs font-semibold text-slate-500">
            <div>
              Hiển thị {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} trong tổng số {total} tài khoản
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2">
                Trang {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: ĐIỀU CHỈNH SỐ TỪ (ADJUST BALANCE MODAL) */}
      {/* ------------------------------------------------------------- */}
      {balanceModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center font-bold">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Điều Chỉnh Số Dư Từ</h3>
                  <p className="text-xs text-slate-400">Tài khoản: {selectedUser.email || selectedUser.full_name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBalanceModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitAdjustBalance} className="p-5 flex flex-col gap-4 text-xs font-semibold">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                <span className="text-slate-500">Số dư hiện tại:</span>
                <span className="text-base font-black text-amber-600">
                  {(selectedUser.words_balance ?? 0).toLocaleString('vi-VN')} từ
                </span>
              </div>

              <div>
                <label className="block text-slate-700 mb-1.5 font-bold">
                  Số từ điều chỉnh (+ cộng thêm, - trừ bớt):
                </label>
                <input
                  type="number"
                  step="1000"
                  required
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-bold focus:border-indigo-500 focus:outline-none"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[5000, 10000, 30000, 100000, -5000].map((quick) => (
                    <button
                      key={quick}
                      type="button"
                      onClick={() => setAdjustAmount(quick)}
                      className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] transition-colors"
                    >
                      {quick > 0 ? `+${quick.toLocaleString('vi-VN')}` : quick.toLocaleString('vi-VN')}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1.5 font-bold">Lý do điều chỉnh (Audit log):</label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Ví dụ: Tặng khuyến mãi, Bù sự cố mạng..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button size="sm" variant="outline" type="button" onClick={() => setBalanceModalOpen(false)}>
                  Hủy
                </Button>
                <Button size="sm" variant="primary" type="submit" disabled={actionLoading}>
                  {actionLoading ? 'Đang lưu...' : 'Xác nhận điều chỉnh'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: TẠO TÀI KHOẢN MỚI TRỰC TIẾP (CREATE USER MODAL) */}
      {/* ------------------------------------------------------------- */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Tạo Tài Khoản Mới</h3>
                  <p className="text-xs text-slate-400">Khởi tạo trực tiếp không cần qua xác thực OTP</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitCreateUser} className="p-5 flex flex-col gap-3.5 text-xs font-semibold">
              <div>
                <label className="block text-slate-700 mb-1 font-bold">Email đăng nhập *</label>
                <input
                  type="email"
                  required
                  value={createForm.email}
                  onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-bold">Mật khẩu khởi tạo * (tối thiểu 6 ký tự)</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  placeholder="Mật khẩu tài khoản"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-bold">Họ và tên hiển thị</label>
                <input
                  type="text"
                  value={createForm.full_name}
                  onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                  placeholder="Nguyễn Văn A"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Vai trò</label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="user">Người dùng (User)</option>
                    <option value="admin">Quản trị viên (Admin)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 mb-1 font-bold">Số từ khởi tạo</label>
                  <input
                    type="number"
                    step="1000"
                    value={createForm.words_balance}
                    onChange={(e) => setCreateForm({ ...createForm, words_balance: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900 focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 mb-1 font-bold">Ghi chú nội bộ</label>
                <input
                  type="text"
                  value={createForm.admin_notes}
                  onChange={(e) => setCreateForm({ ...createForm, admin_notes: e.target.value })}
                  placeholder="Ví dụ: Tài khoản đối tác trường ĐH..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button size="sm" variant="outline" type="button" onClick={() => setCreateModalOpen(false)}>
                  Hủy
                </Button>
                <Button size="sm" variant="primary" type="submit" disabled={actionLoading}>
                  {actionLoading ? 'Đang tạo...' : 'Tạo tài khoản'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: CHI TIẾT NGƯỜI DÙNG & LỊCH SỬ HOẠT ĐỘNG (DETAIL MODAL) */}
      {/* ------------------------------------------------------------- */}
      {detailModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center font-bold text-base">
                  {(selectedUser.full_name || selectedUser.email || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    {selectedUser.full_name || 'Người dùng'}
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-slate-100 text-slate-700">
                      {selectedUser.role}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">{selectedUser.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto flex-1 flex flex-col gap-5 text-xs">
              {detailLoading ? (
                <div className="py-12 text-center text-slate-400 font-semibold">Đang tải dữ liệu chi tiết...</div>
              ) : (
                <>
                  {/* Summary Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                      <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Số dư từ</div>
                      <div className="text-lg font-black text-amber-600">
                        {(selectedUser.words_balance ?? 0).toLocaleString('vi-VN')} từ
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                      <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Trạng thái</div>
                      <div className="text-sm font-bold text-slate-800">
                        {(selectedUser.status || 'active') === 'active' ? '✅ Hoạt động' : '🚫 Đã khóa'}
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                      <div className="text-[10px] text-slate-400 font-bold uppercase mb-1">Ngày đăng ký</div>
                      <div className="text-xs font-semibold text-slate-700">
                        {formatDate(selectedUser.created_at)}
                      </div>
                    </div>
                  </div>

                  {/* Recent Checked Documents */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 mb-2.5 flex items-center justify-between">
                      <span>Lịch sử kiểm tra gần nhất ({userDetailData?.recent_documents?.length ?? 0})</span>
                    </h4>

                    {userDetailData?.recent_documents?.length === 0 ? (
                      <p className="p-4 rounded-xl bg-slate-50 text-slate-400 text-center">Người dùng chưa kiểm tra tài liệu nào.</p>
                    ) : (
                      <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                        {userDetailData?.recent_documents?.map((doc) => (
                          <div key={doc.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                            <div className="max-w-md">
                              <div className="font-bold text-slate-800 truncate">{doc.title}</div>
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">{doc.id} • {formatDate(doc.created_at)}</div>
                            </div>
                            <div className="text-right">
                              <span className="font-black text-rose-600 text-sm">
                                {doc.plagiarism_score ?? 0}%
                              </span>
                              <div className="text-[10px] text-slate-400 font-bold">Trùng lặp</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end shrink-0">
              <Button size="sm" variant="secondary" onClick={() => setDetailModalOpen(false)}>
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default AdminUsersPage;
