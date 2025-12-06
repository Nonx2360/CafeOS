import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Order } from '../types';
import {
    Search,
    Filter,
    Calendar,
    ChevronLeft,
    ChevronRight,
    Receipt,
    Eye,
    Clock,
    CheckCircle,
    XCircle,
    ChefHat,
    Package,
    ArrowLeft
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface OrderWithDetails extends Order {
    updated_at?: string;
}

export const OrderHistory: React.FC = () => {
    const [orders, setOrders] = useState<OrderWithDetails[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);
    const ordersPerPage = 10;

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const res = await fetch(`${API_URL}/api/admin/orders`);
            if (res.ok) {
                const data = await res.json();
                setOrders(data);
            }
        } catch (err) {
            console.error("Failed to fetch orders", err);
        } finally {
            setLoading(false);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'pending': return { bg: 'rgba(107, 138, 172, 0.15)', color: '#8aa8c8', Icon: Clock };
            case 'preparing': return { bg: 'rgba(224, 120, 72, 0.15)', color: '#e07848', Icon: ChefHat };
            case 'ready': return { bg: 'rgba(90, 154, 110, 0.15)', color: '#7ac090', Icon: CheckCircle };
            case 'served': return { bg: 'rgba(139, 149, 165, 0.15)', color: '#8b95a5', Icon: Package };
            case 'paid': return { bg: 'rgba(90, 154, 110, 0.15)', color: '#7ac090', Icon: CheckCircle };
            case 'cancelled': return { bg: 'rgba(184, 86, 86, 0.15)', color: '#d07070', Icon: XCircle };
            default: return { bg: 'rgba(139, 149, 165, 0.15)', color: '#8b95a5', Icon: Package };
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Filter orders
    const filteredOrders = orders.filter(order => {
        // Search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const matchesNumber = order.order_number.toLowerCase().includes(query);
            const matchesCustomer = order.customer_name?.toLowerCase().includes(query);
            if (!matchesNumber && !matchesCustomer) return false;
        }

        // Status filter
        if (statusFilter !== 'all' && order.status !== statusFilter) return false;

        // Date filter
        if (dateFrom) {
            const orderDate = new Date(order.created_at);
            const fromDate = new Date(dateFrom);
            if (orderDate < fromDate) return false;
        }
        if (dateTo) {
            const orderDate = new Date(order.created_at);
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59);
            if (orderDate > toDate) return false;
        }

        return true;
    });

    // Pagination
    const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
    const paginatedOrders = filteredOrders.slice(
        (currentPage - 1) * ordersPerPage,
        currentPage * ordersPerPage
    );

    // Stats
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.total_cents, 0);
    const completedOrders = filteredOrders.filter(o => ['served', 'paid'].includes(o.status)).length;

    return (
        <div className="min-h-screen p-6" style={{ background: '#0f1419', color: '#e2e8f0' }}>
            <div className="container mx-auto max-w-6xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Link
                            to="/admin"
                            className="p-2 rounded-lg transition-colors"
                            style={{ background: 'rgba(255,255,255,0.05)' }}
                        >
                            <ArrowLeft className="w-5 h-5" style={{ color: '#8aa8c8' }} />
                        </Link>
                        <h1 className="text-2xl font-semibold">Order History</h1>
                    </div>
                    <div className="text-sm" style={{ color: '#6b7785' }}>
                        {filteredOrders.length} orders found
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="card p-4">
                        <p className="text-sm mb-1" style={{ color: '#6b7785' }}>Total Orders</p>
                        <p className="text-2xl font-semibold">{filteredOrders.length}</p>
                    </div>
                    <div className="card p-4">
                        <p className="text-sm mb-1" style={{ color: '#6b7785' }}>Completed</p>
                        <p className="text-2xl font-semibold" style={{ color: '#7ac090' }}>{completedOrders}</p>
                    </div>
                    <div className="card p-4">
                        <p className="text-sm mb-1" style={{ color: '#6b7785' }}>Total Revenue</p>
                        <p className="text-2xl font-semibold" style={{ color: '#7ac090' }}>${(totalRevenue / 100).toFixed(2)}</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="card p-4 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#6b7785' }} />
                            <input
                                type="text"
                                placeholder="Search order # or customer..."
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                className="w-full pl-10 pr-4 py-2 rounded-lg text-sm"
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    color: '#e2e8f0'
                                }}
                            />
                        </div>

                        {/* Status Filter */}
                        <div className="relative">
                            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#6b7785' }} />
                            <select
                                value={statusFilter}
                                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                                className="w-full pl-10 pr-4 py-2 rounded-lg text-sm appearance-none"
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    color: '#e2e8f0'
                                }}
                            >
                                <option value="all">All Status</option>
                                <option value="pending">Pending</option>
                                <option value="preparing">Preparing</option>
                                <option value="ready">Ready</option>
                                <option value="served">Served</option>
                                <option value="paid">Paid</option>
                                <option value="cancelled">Cancelled</option>
                            </select>
                        </div>

                        {/* Date From */}
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#6b7785' }} />
                            <input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
                                className="w-full pl-10 pr-4 py-2 rounded-lg text-sm"
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    color: '#e2e8f0'
                                }}
                            />
                        </div>

                        {/* Date To */}
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: '#6b7785' }} />
                            <input
                                type="date"
                                value={dateTo}
                                onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
                                className="w-full pl-10 pr-4 py-2 rounded-lg text-sm"
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    color: '#e2e8f0'
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Orders Table */}
                <div className="card overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center" style={{ color: '#6b7785' }}>Loading orders...</div>
                    ) : paginatedOrders.length === 0 ? (
                        <div className="p-8 text-center" style={{ color: '#6b7785' }}>No orders found</div>
                    ) : (
                        <table className="w-full">
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                    <th className="text-left p-4 text-sm font-medium" style={{ color: '#6b7785' }}>Order #</th>
                                    <th className="text-left p-4 text-sm font-medium" style={{ color: '#6b7785' }}>Customer</th>
                                    <th className="text-left p-4 text-sm font-medium" style={{ color: '#6b7785' }}>Table</th>
                                    <th className="text-left p-4 text-sm font-medium" style={{ color: '#6b7785' }}>Date</th>
                                    <th className="text-left p-4 text-sm font-medium" style={{ color: '#6b7785' }}>Status</th>
                                    <th className="text-right p-4 text-sm font-medium" style={{ color: '#6b7785' }}>Total</th>
                                    <th className="text-right p-4 text-sm font-medium" style={{ color: '#6b7785' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedOrders.map((order) => {
                                    const statusStyle = getStatusStyle(order.status);
                                    const StatusIcon = statusStyle.Icon;
                                    return (
                                        <tr
                                            key={order.id}
                                            className="transition-colors"
                                            style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <td className="p-4 font-medium">#{order.order_number.split('-').pop()}</td>
                                            <td className="p-4" style={{ color: '#8b95a5' }}>{order.customer_name || 'Guest'}</td>
                                            <td className="p-4" style={{ color: '#8b95a5' }}>{order.table_id || '-'}</td>
                                            <td className="p-4 text-sm" style={{ color: '#6b7785' }}>{formatDate(order.created_at)}</td>
                                            <td className="p-4">
                                                <span
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium"
                                                    style={{ background: statusStyle.bg, color: statusStyle.color }}
                                                >
                                                    <StatusIcon className="w-3 h-3" />
                                                    {order.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right font-medium" style={{ color: '#7ac090' }}>
                                                ${(order.total_cents / 100).toFixed(2)}
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => setSelectedOrder(order)}
                                                        className="p-2 rounded-lg transition-colors"
                                                        style={{ background: 'rgba(107, 138, 172, 0.15)', color: '#8aa8c8' }}
                                                        title="View Details"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <Link
                                                        to={`/receipt/${order.id}`}
                                                        className="p-2 rounded-lg transition-colors"
                                                        style={{ background: 'rgba(224, 120, 72, 0.15)', color: '#e07848' }}
                                                        title="View Receipt"
                                                    >
                                                        <Receipt className="w-4 h-4" />
                                                    </Link>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between p-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            <p className="text-sm" style={{ color: '#6b7785' }}>
                                Showing {((currentPage - 1) * ordersPerPage) + 1} to {Math.min(currentPage * ordersPerPage, filteredOrders.length)} of {filteredOrders.length}
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-lg transition-colors disabled:opacity-50"
                                    style={{ background: 'rgba(255,255,255,0.05)' }}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="px-3 py-1 text-sm">{currentPage} / {totalPages}</span>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-lg transition-colors disabled:opacity-50"
                                    style={{ background: 'rgba(255,255,255,0.05)' }}
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Order Detail Modal */}
            {selectedOrder && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.8)' }}
                    onClick={() => setSelectedOrder(null)}
                >
                    <div
                        className="w-full max-w-lg rounded-xl p-6 max-h-[80vh] overflow-y-auto"
                        style={{ background: '#1e252d', border: '1px solid rgba(255,255,255,0.08)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Order #{selectedOrder.order_number.split('-').pop()}</h3>
                            <span
                                className="px-2.5 py-1 rounded text-xs font-medium"
                                style={{ background: getStatusStyle(selectedOrder.status).bg, color: getStatusStyle(selectedOrder.status).color }}
                            >
                                {selectedOrder.status}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                            <div>
                                <p style={{ color: '#6b7785' }}>Customer</p>
                                <p className="font-medium">{selectedOrder.customer_name || 'Guest'}</p>
                            </div>
                            <div>
                                <p style={{ color: '#6b7785' }}>Table</p>
                                <p className="font-medium">{selectedOrder.table_id || '-'}</p>
                            </div>
                            <div>
                                <p style={{ color: '#6b7785' }}>Date</p>
                                <p className="font-medium">{formatDate(selectedOrder.created_at)}</p>
                            </div>
                            <div>
                                <p style={{ color: '#6b7785' }}>Total</p>
                                <p className="font-medium" style={{ color: '#7ac090' }}>${(selectedOrder.total_cents / 100).toFixed(2)}</p>
                            </div>
                        </div>

                        {selectedOrder.items && selectedOrder.items.length > 0 && (
                            <div className="pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                <p className="text-sm font-medium mb-3" style={{ color: '#8b95a5' }}>Items</p>
                                <div className="space-y-2">
                                    {selectedOrder.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between text-sm">
                                            <span>{item.quantity}× Item #{item.menu_item_id}</span>
                                            <span style={{ color: '#7ac090' }}>${((item.unit_price_cents + (item.modifier_price_cents || 0)) * item.quantity / 100).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mt-6 flex gap-3">
                            <Link
                                to={`/receipt/${selectedOrder.id}`}
                                className="flex-1 py-2.5 rounded-lg text-center font-medium"
                                style={{ background: '#e07848', color: 'white' }}
                            >
                                View Receipt
                            </Link>
                            <button
                                onClick={() => setSelectedOrder(null)}
                                className="flex-1 py-2.5 rounded-lg font-medium"
                                style={{ background: 'rgba(255,255,255,0.05)', color: '#8b95a5' }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
