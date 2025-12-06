import React, { useEffect, useState } from 'react';
import { getSocket } from '../socket';
import {
    AlertCircle,
    Flame,
    CheckCircle,
    Package,
    RefreshCw,
    ChefHat,
    UtensilsCrossed,
    AlertTriangle
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface OrderItem {
    id: number;
    menu_item_id: number;
    name: string;
    quantity: number;
    instructions?: string;
}

interface Order {
    id: number;
    order_number: string;
    table_id: number;
    customer_name: string;
    status: string;
    total_cents: number;
    created_at: string;
    items: OrderItem[];
}

export const Kitchen: React.FC = () => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchQueue();
        const socket = getSocket();

        socket.on('order_created', (order: Order) => {
            setOrders(prev => [...prev, order]);
        });

        socket.on('order_updated', (data: any) => {
            setOrders(prev => prev.map(o =>
                o.id === data.id ? { ...o, status: data.status } : o
            ).filter(o => !['served', 'paid', 'cancelled'].includes(o.status)));
        });

        return () => {
            socket.off('order_created');
            socket.off('order_updated');
        };
    }, []);

    const fetchQueue = async () => {
        try {
            const res = await fetch(`${API_URL}/api/kitchen/queue`);
            if (res.ok) {
                const data = await res.json();
                setOrders(data);
            }
        } catch (err) {
            console.error("Failed to fetch kitchen queue", err);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (orderId: number, status: string) => {
        try {
            await fetch(`${API_URL}/api/kitchen/orders/${orderId}/status?status=${status}`, {
                method: 'PUT'
            });
            if (status === 'served') {
                setOrders(prev => prev.filter(o => o.id !== orderId));
            } else {
                setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
            }
        } catch (err) {
            console.error("Failed to update status", err);
        }
    };

    const getTimeElapsed = (createdAt: string) => {
        const created = new Date(createdAt);
        const now = new Date();
        const diffMs = now.getTime() - created.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        return `${Math.floor(diffMins / 60)}h ${diffMins % 60}m ago`;
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'pending': return {
                bg: 'rgba(184, 86, 86, 0.15)',
                border: '#b85656',
                headerBg: 'rgba(184, 86, 86, 0.25)',
                color: '#d07070',
                label: 'NEW',
                Icon: AlertCircle
            };
            case 'preparing': return {
                bg: 'rgba(224, 120, 72, 0.15)',
                border: '#e07848',
                headerBg: 'rgba(224, 120, 72, 0.25)',
                color: '#e07848',
                label: 'COOKING',
                Icon: Flame
            };
            case 'ready': return {
                bg: 'rgba(90, 154, 110, 0.15)',
                border: '#5a9a6e',
                headerBg: 'rgba(90, 154, 110, 0.25)',
                color: '#7ac090',
                label: 'READY',
                Icon: CheckCircle
            };
            default: return {
                bg: 'rgba(139, 149, 165, 0.15)',
                border: '#8b95a5',
                headerBg: 'rgba(139, 149, 165, 0.25)',
                color: '#8b95a5',
                label: status,
                Icon: Package
            };
        }
    };

    return (
        <div className="min-h-screen p-6" style={{ background: '#0f1419', color: '#e2e8f0' }}>
            <div className="container mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-semibold">Kitchen Display</h1>
                    <div className="flex items-center gap-4">
                        <span
                            className="px-4 py-2 rounded-lg flex items-center gap-2"
                            style={{ background: '#1a1f26', border: '1px solid rgba(255,255,255,0.06)' }}
                        >
                            <span style={{ color: '#6b7785' }}>Active Orders:</span>
                            <span className="text-xl font-semibold" style={{ color: '#7ac090' }}>{orders.length}</span>
                        </span>
                        <button
                            onClick={fetchQueue}
                            className="px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                            style={{ background: '#e07848', color: 'white' }}
                            onMouseOver={(e) => e.currentTarget.style.background = '#c96a3d'}
                            onMouseOut={(e) => e.currentTarget.style.background = '#e07848'}
                        >
                            <RefreshCw className="w-4 h-4" strokeWidth={2} />
                            Refresh
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-12" style={{ color: '#6b7785' }}>Loading orders...</div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-20">
                        <div
                            className="w-24 h-24 rounded-2xl flex items-center justify-center mx-auto mb-6"
                            style={{ background: 'rgba(224, 120, 72, 0.1)' }}
                        >
                            <ChefHat className="w-12 h-12" style={{ color: '#e07848' }} strokeWidth={1.5} />
                        </div>
                        <h2 className="text-2xl font-semibold" style={{ color: '#6b7785' }}>No Active Orders</h2>
                        <p className="mt-2 text-sm" style={{ color: '#5c6675' }}>Orders will appear here in real-time</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {orders.map(order => {
                            const statusConfig = getStatusConfig(order.status);
                            const StatusIcon = statusConfig.Icon;
                            return (
                                <div
                                    key={order.id}
                                    className="rounded-xl overflow-hidden"
                                    style={{
                                        background: '#1e252d',
                                        border: '1px solid rgba(255,255,255,0.06)',
                                        borderLeft: `3px solid ${statusConfig.border}`
                                    }}
                                >
                                    {/* Header */}
                                    <div
                                        className="px-4 py-3 flex justify-between items-center"
                                        style={{ background: statusConfig.headerBg }}
                                    >
                                        <span className="font-medium flex items-center gap-2" style={{ color: statusConfig.color }}>
                                            <StatusIcon className="w-4 h-4" strokeWidth={2} />
                                            {statusConfig.label}
                                        </span>
                                        <span className="text-xs" style={{ color: '#8b95a5' }}>{getTimeElapsed(order.created_at)}</span>
                                    </div>

                                    {/* Order Info */}
                                    <div className="p-4">
                                        <div className="flex justify-between items-start mb-3">
                                            <div>
                                                <span className="text-xl font-semibold">#{order.order_number.split('-').pop()}</span>
                                                <p className="text-sm mt-0.5" style={{ color: '#6b7785' }}>Table {order.table_id}</p>
                                            </div>
                                            {order.customer_name && order.customer_name !== 'Guest' && (
                                                <span
                                                    className="px-2.5 py-1 rounded text-xs font-medium"
                                                    style={{ background: 'rgba(255,255,255,0.05)', color: '#8b95a5' }}
                                                >
                                                    {order.customer_name}
                                                </span>
                                            )}
                                        </div>

                                        {/* Items */}
                                        <div className="py-3 space-y-2" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                                            {order.items.map((item, idx) => (
                                                <div key={idx} className="flex justify-between items-start">
                                                    <div>
                                                        <span className="font-semibold" style={{ color: '#e07848' }}>{item.quantity}×</span>
                                                        <span className="ml-2">{item.name}</span>
                                                        {item.instructions && (
                                                            <p className="text-xs ml-5 mt-1 flex items-center gap-1" style={{ color: '#d07070' }}>
                                                                <AlertTriangle className="w-3 h-3" strokeWidth={2} />
                                                                {item.instructions}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Actions */}
                                        <div className="mt-4 space-y-2">
                                            {order.status === 'pending' && (
                                                <button
                                                    onClick={() => updateStatus(order.id, 'preparing')}
                                                    className="w-full py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                                                    style={{ background: '#e07848', color: 'white' }}
                                                    onMouseOver={(e) => e.currentTarget.style.background = '#c96a3d'}
                                                    onMouseOut={(e) => e.currentTarget.style.background = '#e07848'}
                                                >
                                                    <Flame className="w-4 h-4" strokeWidth={2} />
                                                    Start Cooking
                                                </button>
                                            )}
                                            {order.status === 'preparing' && (
                                                <button
                                                    onClick={() => updateStatus(order.id, 'ready')}
                                                    className="w-full py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                                                    style={{ background: '#5a9a6e', color: 'white' }}
                                                    onMouseOver={(e) => e.currentTarget.style.background = '#4a8a5e'}
                                                    onMouseOut={(e) => e.currentTarget.style.background = '#5a9a6e'}
                                                >
                                                    <CheckCircle className="w-4 h-4" strokeWidth={2} />
                                                    Mark Ready
                                                </button>
                                            )}
                                            {order.status === 'ready' && (
                                                <button
                                                    onClick={() => updateStatus(order.id, 'served')}
                                                    className="w-full py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
                                                    style={{ background: '#3d4654', color: '#8b95a5' }}
                                                    onMouseOver={(e) => e.currentTarget.style.background = '#4a5566'}
                                                    onMouseOut={(e) => e.currentTarget.style.background = '#3d4654'}
                                                >
                                                    <UtensilsCrossed className="w-4 h-4" strokeWidth={2} />
                                                    Served
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
