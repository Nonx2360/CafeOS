import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Order } from '../types';
import { getSocket } from '../socket';
import {
    DollarSign,
    ShoppingBag,
    Clock,
    ClipboardList,
    Armchair,
    ChefHat,
    Smartphone,
    Receipt,
    History,
    BarChart3,
    Users,
    Tag
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState({
        totalOrders: 0,
        totalSales: 0,
        pendingOrders: 0
    });
    const [loading, setLoading] = useState(true);
    const [recentOrders, setRecentOrders] = useState<Order[]>([]);

    useEffect(() => {
        fetchStats();
        fetchRecentOrders();

        const socket = getSocket();
        socket.on('order_created', (order: Order) => {
            setStats(prev => ({
                totalOrders: prev.totalOrders + 1,
                totalSales: prev.totalSales + order.total_cents,
                pendingOrders: prev.pendingOrders + 1
            }));
            setRecentOrders(prev => [order, ...prev.slice(0, 4)]);
        });

        socket.on('order_updated', (data: any) => {
            if (data.status === 'served' || data.status === 'paid') {
                setStats(prev => ({
                    ...prev,
                    pendingOrders: Math.max(0, prev.pendingOrders - 1)
                }));
            }
        });

        return () => {
            socket.off('order_created');
            socket.off('order_updated');
        };
    }, []);

    const fetchStats = async () => {
        try {
            const res = await fetch(`${API_URL}/api/admin/stats`);
            if (res.ok) {
                const data = await res.json();
                setStats({
                    totalOrders: data.totalOrders,
                    totalSales: data.totalSales,
                    pendingOrders: data.pendingOrders
                });
            }
        } catch (err) {
            console.error("Failed to fetch stats", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchRecentOrders = async () => {
        try {
            const res = await fetch(`${API_URL}/api/admin/orders`);
            if (res.ok) {
                const data = await res.json();
                setRecentOrders(data.slice(0, 5));
            }
        } catch (err) {
            console.error("Failed to fetch orders", err);
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'pending': return { bg: 'rgba(184, 86, 86, 0.15)', color: '#d07070' };
            case 'preparing': return { bg: 'rgba(224, 120, 72, 0.15)', color: '#e07848' };
            case 'ready': return { bg: 'rgba(90, 154, 110, 0.15)', color: '#7ac090' };
            default: return { bg: 'rgba(107, 138, 172, 0.15)', color: '#8aa8c8' };
        }
    };

    return (
        <div className="min-h-screen p-6" style={{ background: '#0f1419', color: '#e2e8f0' }}>
            <div className="container mx-auto max-w-6xl">
                <h1 className="text-3xl font-semibold mb-8">Admin Dashboard</h1>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                    <div className="stat-card green">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-lg" style={{ background: 'rgba(90, 154, 110, 0.15)' }}>
                                <DollarSign className="w-5 h-5" style={{ color: '#7ac090' }} strokeWidth={1.5} />
                            </div>
                            <span className="text-sm font-medium uppercase tracking-wide" style={{ color: '#7ac090' }}>Today's Sales</span>
                        </div>
                        <p className="text-3xl font-semibold">
                            {loading ? '...' : `$${(stats.totalSales / 100).toFixed(2)}`}
                        </p>
                    </div>

                    <div className="stat-card blue">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-lg" style={{ background: 'rgba(107, 138, 172, 0.15)' }}>
                                <ShoppingBag className="w-5 h-5" style={{ color: '#8aa8c8' }} strokeWidth={1.5} />
                            </div>
                            <span className="text-sm font-medium uppercase tracking-wide" style={{ color: '#8aa8c8' }}>Total Orders</span>
                        </div>
                        <p className="text-3xl font-semibold">
                            {loading ? '...' : stats.totalOrders}
                        </p>
                    </div>

                    <div className="stat-card orange">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 rounded-lg" style={{ background: 'rgba(224, 120, 72, 0.15)' }}>
                                <Clock className="w-5 h-5" style={{ color: '#e07848' }} strokeWidth={1.5} />
                            </div>
                            <span className="text-sm font-medium uppercase tracking-wide" style={{ color: '#e07848' }}>Pending Orders</span>
                        </div>
                        <p className="text-3xl font-semibold">
                            {loading ? '...' : stats.pendingOrders}
                        </p>
                    </div>
                </div>

                {/* Management Links */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <Link
                        to="/admin/menu"
                        className="card p-5 flex items-start gap-4 group hover:border-amber-800/50 transition-all"
                    >
                        <div className="p-2.5 rounded-lg transition-colors" style={{ background: 'rgba(224, 120, 72, 0.1)' }}>
                            <ClipboardList className="w-5 h-5" style={{ color: '#e07848' }} strokeWidth={1.5} />
                        </div>
                        <div>
                            <span className="font-medium block mb-0.5" style={{ color: '#e2e8f0' }}>Menu Management</span>
                            <span className="text-xs" style={{ color: '#6b7785' }}>Add and edit items</span>
                        </div>
                    </Link>

                    <Link
                        to="/admin/tables"
                        className="card p-5 flex items-start gap-4 group hover:border-blue-800/50 transition-all"
                    >
                        <div className="p-2.5 rounded-lg transition-colors" style={{ background: 'rgba(107, 138, 172, 0.1)' }}>
                            <Armchair className="w-5 h-5" style={{ color: '#8aa8c8' }} strokeWidth={1.5} />
                        </div>
                        <div>
                            <span className="font-medium block mb-0.5" style={{ color: '#e2e8f0' }}>Table Management</span>
                            <span className="text-xs" style={{ color: '#6b7785' }}>Configure tables</span>
                        </div>
                    </Link>

                    <Link
                        to="/kitchen"
                        className="card p-5 flex items-start gap-4 group hover:border-orange-800/50 transition-all"
                    >
                        <div className="p-2.5 rounded-lg transition-colors" style={{ background: 'rgba(196, 154, 75, 0.1)' }}>
                            <ChefHat className="w-5 h-5" style={{ color: '#d4aa5a' }} strokeWidth={1.5} />
                        </div>
                        <div>
                            <span className="font-medium block mb-0.5" style={{ color: '#e2e8f0' }}>Kitchen Display</span>
                            <span className="text-xs" style={{ color: '#6b7785' }}>View order queue</span>
                        </div>
                    </Link>

                    <Link
                        to="/order"
                        className="card p-5 flex items-start gap-4 group hover:border-green-800/50 transition-all"
                    >
                        <div className="p-2.5 rounded-lg transition-colors" style={{ background: 'rgba(90, 154, 110, 0.1)' }}>
                            <Smartphone className="w-5 h-5" style={{ color: '#7ac090' }} strokeWidth={1.5} />
                        </div>
                        <div>
                            <span className="font-medium block mb-0.5" style={{ color: '#e2e8f0' }}>Customer View</span>
                            <span className="text-xs" style={{ color: '#6b7785' }}>Preview order page</span>
                        </div>
                    </Link>

                    <Link
                        to="/admin/orders"
                        className="card p-5 flex items-start gap-4 group hover:border-purple-800/50 transition-all"
                    >
                        <div className="p-2.5 rounded-lg transition-colors" style={{ background: 'rgba(147, 112, 219, 0.1)' }}>
                            <History className="w-5 h-5" style={{ color: '#9370db' }} strokeWidth={1.5} />
                        </div>
                        <div>
                            <span className="font-medium block mb-0.5" style={{ color: '#e2e8f0' }}>Order History</span>
                            <span className="text-xs" style={{ color: '#6b7785' }}>Search & filter orders</span>
                        </div>
                    </Link>

                    <Link
                        to="/admin/reports"
                        className="card p-5 flex items-start gap-4 group hover:border-cyan-800/50 transition-all"
                    >
                        <div className="p-2.5 rounded-lg transition-colors" style={{ background: 'rgba(56, 189, 248, 0.1)' }}>
                            <BarChart3 className="w-5 h-5" style={{ color: '#38bdf8' }} strokeWidth={1.5} />
                        </div>
                        <div>
                            <span className="font-medium block mb-0.5" style={{ color: '#e2e8f0' }}>Sales Reports</span>
                            <span className="text-xs" style={{ color: '#6b7785' }}>Revenue & analytics</span>
                        </div>
                    </Link>

                    <Link
                        to="/admin/staff"
                        className="card p-5 flex items-start gap-4 group hover:border-pink-800/50 transition-all"
                    >
                        <div className="p-2.5 rounded-lg transition-colors" style={{ background: 'rgba(236, 72, 153, 0.1)' }}>
                            <Users className="w-5 h-5" style={{ color: '#ec4899' }} strokeWidth={1.5} />
                        </div>
                        <div>
                            <span className="font-medium block mb-0.5" style={{ color: '#e2e8f0' }}>Staff & Shifts</span>
                            <span className="text-xs" style={{ color: '#6b7785' }}>Manage staff & clock</span>
                        </div>
                    </Link>

                    <Link
                        to="/admin/promotions"
                        className="card p-5 flex items-start gap-4 group hover:border-red-800/50 transition-all"
                    >
                        <div className="p-2.5 rounded-lg transition-colors" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                            <Tag className="w-5 h-5" style={{ color: '#ef4444' }} strokeWidth={1.5} />
                        </div>
                        <div>
                            <span className="font-medium block mb-0.5" style={{ color: '#e2e8f0' }}>Promotions</span>
                            <span className="text-xs" style={{ color: '#6b7785' }}>Promo codes & discounts</span>
                        </div>
                    </Link>
                </div>

                {/* Recent Orders */}
                <div className="card p-6">
                    <h2 className="text-lg font-semibold mb-5" style={{ color: '#e2e8f0' }}>Recent Orders</h2>
                    {recentOrders.length === 0 ? (
                        <p style={{ color: '#6b7785' }}>No orders yet. Place an order from the Customer View!</p>
                    ) : (
                        <div className="space-y-3">
                            {recentOrders.map((order) => {
                                const statusStyle = getStatusStyle(order.status);
                                return (
                                    <div
                                        key={order.id}
                                        className="flex justify-between items-center p-4 rounded-lg"
                                        style={{ background: 'rgba(255,255,255,0.02)' }}
                                    >
                                        <div>
                                            <span className="font-medium" style={{ color: '#e2e8f0' }}>#{order.order_number}</span>
                                            <span className="ml-4 text-sm" style={{ color: '#6b7785' }}>Table {order.table_id}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-medium" style={{ color: '#7ac090' }}>${(order.total_cents / 100).toFixed(2)}</span>
                                            <span
                                                className="px-3 py-1 rounded text-xs font-medium uppercase"
                                                style={{ background: statusStyle.bg, color: statusStyle.color }}
                                            >
                                                {order.status}
                                            </span>
                                            <Link
                                                to={`/receipt/${order.id}`}
                                                className="p-2 rounded-lg transition-colors"
                                                style={{ background: 'rgba(224, 120, 72, 0.15)', color: '#e07848' }}
                                                title="View Receipt"
                                            >
                                                <Receipt className="w-4 h-4" strokeWidth={2} />
                                            </Link>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
