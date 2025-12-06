import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    TrendingUp,
    DollarSign,
    ShoppingBag,
    Calendar,
    ArrowLeft,
    Download,
    BarChart3,
    Clock
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface DailySales {
    date: string;
    orders: number;
    revenue: number;
}

interface TopItem {
    name: string;
    quantity: number;
    revenue: number;
}

export const SalesReportPage: React.FC = () => {
    const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
    const [salesData, setSalesData] = useState<DailySales[]>([]);
    const [topItems, setTopItems] = useState<TopItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalRevenue: 0,
        totalOrders: 0,
        avgOrderValue: 0,
        bestDay: ''
    });

    useEffect(() => {
        fetchSalesData();
    }, [period]);

    const fetchSalesData = async () => {
        setLoading(true);
        try {
            // Fetch orders and calculate stats
            const res = await fetch(`${API_URL}/api/admin/orders`);
            if (res.ok) {
                const orders = await res.json();
                processOrderData(orders);
            }
        } catch (err) {
            console.error("Failed to fetch sales data", err);
        } finally {
            setLoading(false);
        }
    };

    const processOrderData = (orders: any[]) => {
        // Filter by period
        const now = new Date();
        let startDate = new Date();

        if (period === 'daily') {
            startDate.setDate(now.getDate() - 7);
        } else if (period === 'weekly') {
            startDate.setDate(now.getDate() - 28);
        } else {
            startDate.setMonth(now.getMonth() - 6);
        }

        const filteredOrders = orders.filter(o => new Date(o.created_at) >= startDate);

        // Group by date
        const dailyMap: { [key: string]: { orders: number; revenue: number } } = {};
        const itemMap: { [key: string]: { quantity: number; revenue: number } } = {};

        filteredOrders.forEach(order => {
            const date = new Date(order.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

            if (!dailyMap[date]) {
                dailyMap[date] = { orders: 0, revenue: 0 };
            }
            dailyMap[date].orders += 1;
            dailyMap[date].revenue += order.total_cents;

            // Count items (simplified)
            if (order.items) {
                order.items.forEach((item: any) => {
                    const key = `Item #${item.menu_item_id}`;
                    if (!itemMap[key]) {
                        itemMap[key] = { quantity: 0, revenue: 0 };
                    }
                    itemMap[key].quantity += item.quantity;
                    itemMap[key].revenue += (item.unit_price_cents + (item.modifier_price_cents || 0)) * item.quantity;
                });
            }
        });

        // Convert to arrays
        const salesArray = Object.entries(dailyMap).map(([date, data]) => ({
            date,
            orders: data.orders,
            revenue: data.revenue
        }));

        const topItemsArray = Object.entries(itemMap)
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        // Calculate stats
        const totalRevenue = filteredOrders.reduce((sum, o) => sum + o.total_cents, 0);
        const totalOrders = filteredOrders.length;
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
        const bestDayEntry = salesArray.reduce((max, curr) => curr.revenue > (max?.revenue || 0) ? curr : max, salesArray[0]);

        setSalesData(salesArray);
        setTopItems(topItemsArray);
        setStats({
            totalRevenue,
            totalOrders,
            avgOrderValue,
            bestDay: bestDayEntry?.date || '-'
        });
    };

    const exportToCSV = () => {
        const headers = ['Date', 'Orders', 'Revenue'];
        const rows = salesData.map(d => [d.date, d.orders, `$${(d.revenue / 100).toFixed(2)}`]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sales-report-${period}-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const maxRevenue = Math.max(...salesData.map(d => d.revenue), 1);

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
                        <h1 className="text-2xl font-semibold">Sales Reports</h1>
                    </div>
                    <button
                        onClick={exportToCSV}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium"
                        style={{ background: '#5a9a6e', color: 'white' }}
                    >
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                </div>

                {/* Period Selector */}
                <div className="flex gap-2 mb-6">
                    {(['daily', 'weekly', 'monthly'] as const).map(p => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className="px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors"
                            style={{
                                background: period === p ? '#e07848' : 'rgba(255,255,255,0.05)',
                                color: period === p ? 'white' : '#8b95a5'
                            }}
                        >
                            {p}
                        </button>
                    ))}
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="card p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <DollarSign className="w-5 h-5" style={{ color: '#7ac090' }} />
                            <span className="text-sm" style={{ color: '#6b7785' }}>Total Revenue</span>
                        </div>
                        <p className="text-2xl font-semibold" style={{ color: '#7ac090' }}>
                            ${(stats.totalRevenue / 100).toFixed(2)}
                        </p>
                    </div>
                    <div className="card p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <ShoppingBag className="w-5 h-5" style={{ color: '#8aa8c8' }} />
                            <span className="text-sm" style={{ color: '#6b7785' }}>Total Orders</span>
                        </div>
                        <p className="text-2xl font-semibold">{stats.totalOrders}</p>
                    </div>
                    <div className="card p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <TrendingUp className="w-5 h-5" style={{ color: '#e07848' }} />
                            <span className="text-sm" style={{ color: '#6b7785' }}>Avg Order Value</span>
                        </div>
                        <p className="text-2xl font-semibold">${(stats.avgOrderValue / 100).toFixed(2)}</p>
                    </div>
                    <div className="card p-5">
                        <div className="flex items-center gap-3 mb-2">
                            <Calendar className="w-5 h-5" style={{ color: '#d4aa5a' }} />
                            <span className="text-sm" style={{ color: '#6b7785' }}>Best Day</span>
                        </div>
                        <p className="text-2xl font-semibold">{stats.bestDay}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Revenue Chart */}
                    <div className="lg:col-span-2 card p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <BarChart3 className="w-5 h-5" style={{ color: '#8aa8c8' }} />
                            <h3 className="font-semibold">Revenue Overview</h3>
                        </div>

                        {loading ? (
                            <div className="h-64 flex items-center justify-center" style={{ color: '#6b7785' }}>
                                Loading...
                            </div>
                        ) : salesData.length === 0 ? (
                            <div className="h-64 flex items-center justify-center" style={{ color: '#6b7785' }}>
                                No data for this period
                            </div>
                        ) : (
                            <div className="h-64 flex items-end gap-2">
                                {salesData.slice(-14).map((day, idx) => (
                                    <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                                        <div
                                            className="w-full rounded-t transition-all"
                                            style={{
                                                height: `${(day.revenue / maxRevenue) * 200}px`,
                                                background: 'linear-gradient(180deg, #7ac090 0%, #5a9a6e 100%)',
                                                minHeight: '4px'
                                            }}
                                            title={`${day.date}: $${(day.revenue / 100).toFixed(2)}`}
                                        />
                                        <span className="text-xs" style={{ color: '#6b7785' }}>
                                            {day.date.split(' ')[1]}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Top Items */}
                    <div className="card p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <TrendingUp className="w-5 h-5" style={{ color: '#e07848' }} />
                            <h3 className="font-semibold">Top Selling Items</h3>
                        </div>

                        {topItems.length === 0 ? (
                            <p style={{ color: '#6b7785' }}>No data yet</p>
                        ) : (
                            <div className="space-y-4">
                                {topItems.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span
                                                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium"
                                                style={{ background: 'rgba(224, 120, 72, 0.2)', color: '#e07848' }}
                                            >
                                                {idx + 1}
                                            </span>
                                            <div>
                                                <p className="text-sm font-medium">{item.name}</p>
                                                <p className="text-xs" style={{ color: '#6b7785' }}>{item.quantity} sold</p>
                                            </div>
                                        </div>
                                        <span className="text-sm font-medium" style={{ color: '#7ac090' }}>
                                            ${(item.revenue / 100).toFixed(2)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Peak Hours */}
                <div className="card p-6 mt-6">
                    <div className="flex items-center gap-2 mb-6">
                        <Clock className="w-5 h-5" style={{ color: '#d4aa5a' }} />
                        <h3 className="font-semibold">Daily Sales Breakdown</h3>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                    <th className="text-left p-3 text-sm font-medium" style={{ color: '#6b7785' }}>Date</th>
                                    <th className="text-right p-3 text-sm font-medium" style={{ color: '#6b7785' }}>Orders</th>
                                    <th className="text-right p-3 text-sm font-medium" style={{ color: '#6b7785' }}>Revenue</th>
                                    <th className="text-right p-3 text-sm font-medium" style={{ color: '#6b7785' }}>Avg Order</th>
                                </tr>
                            </thead>
                            <tbody>
                                {salesData.slice().reverse().map((day, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                        <td className="p-3 font-medium">{day.date}</td>
                                        <td className="p-3 text-right" style={{ color: '#8b95a5' }}>{day.orders}</td>
                                        <td className="p-3 text-right font-medium" style={{ color: '#7ac090' }}>
                                            ${(day.revenue / 100).toFixed(2)}
                                        </td>
                                        <td className="p-3 text-right" style={{ color: '#8b95a5' }}>
                                            ${day.orders > 0 ? ((day.revenue / day.orders) / 100).toFixed(2) : '0.00'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};
