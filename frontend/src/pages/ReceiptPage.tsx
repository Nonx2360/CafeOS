import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    Printer,
    Download,
    ArrowLeft,
    CheckCircle,
    Clock,
    User,
    Hash,
    Coffee
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface OrderItem {
    name: string;
    quantity: number;
    unit_price_cents: number;
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

export const ReceiptPage: React.FC = () => {
    const { orderId } = useParams<{ orderId: string }>();
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [printing, setPrinting] = useState(false);

    useEffect(() => {
        if (orderId) {
            fetchOrder();
        }
    }, [orderId]);

    const fetchOrder = async () => {
        try {
            console.log('Fetching order:', orderId);
            const res = await fetch(`${API_URL}/api/orders/${orderId}`);
            console.log('Response status:', res.status);
            if (res.ok) {
                const data = await res.json();
                console.log('Order data:', data);
                // Fetch menu item names for the order items
                const itemsWithNames = await Promise.all(
                    (data.items || []).map(async (item: any) => {
                        try {
                            const menuRes = await fetch(`${API_URL}/api/orders/menu`);
                            const categories = await menuRes.json();
                            let itemName = `Item #${item.menu_item_id}`;
                            for (const cat of categories) {
                                const found = cat.items?.find((mi: any) => mi.id === item.menu_item_id);
                                if (found) {
                                    itemName = found.name;
                                    break;
                                }
                            }
                            return { ...item, name: itemName };
                        } catch {
                            return { ...item, name: `Item #${item.menu_item_id}` };
                        }
                    })
                );
                setOrder({ ...data, items: itemsWithNames });
            } else {
                console.error('Failed to fetch order, status:', res.status);
            }
        } catch (err) {
            console.error("Failed to fetch order", err);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        // Open the HTML receipt in a new window for printing
        window.open(`${API_URL}/api/receipts/${orderId}`, '_blank');
    };

    const handleDownloadPDF = async () => {
        setPrinting(true);
        try {
            const res = await fetch(`${API_URL}/api/receipts/${orderId}/pdf`);
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `receipt-${order?.order_number || orderId}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                const error = await res.json();
                alert(error.detail || 'Failed to generate PDF');
            }
        } catch (err) {
            console.error("Failed to download PDF", err);
            alert('Failed to download PDF. Make sure weasyprint is installed on the server.');
        } finally {
            setPrinting(false);
        }
    };

    const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleString();
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f1419' }}>
                <p style={{ color: '#6b7785' }}>Loading receipt...</p>
            </div>
        );
    }

    if (!order) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: '#0f1419' }}>
                <div className="text-center">
                    <p className="text-xl mb-4" style={{ color: '#d07070' }}>Order not found</p>
                    <Link to="/admin" className="text-sm" style={{ color: '#8aa8c8' }}>
                        ← Back to Dashboard
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-6" style={{ background: '#0f1419', color: '#e2e8f0' }}>
            <div className="container mx-auto max-w-2xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <Link
                        to="/admin"
                        className="flex items-center gap-2 text-sm font-medium transition-colors"
                        style={{ color: '#8aa8c8' }}
                    >
                        <ArrowLeft className="w-4 h-4" strokeWidth={2} />
                        Back to Dashboard
                    </Link>
                    <div className="flex gap-3">
                        <button
                            onClick={handlePrint}
                            className="px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
                            style={{ background: '#e07848', color: 'white' }}
                        >
                            <Printer className="w-4 h-4" strokeWidth={2} />
                            Print
                        </button>
                        <button
                            onClick={handleDownloadPDF}
                            disabled={printing}
                            className="px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors disabled:opacity-50"
                            style={{ background: 'rgba(107, 138, 172, 0.15)', color: '#8aa8c8' }}
                        >
                            <Download className="w-4 h-4" strokeWidth={2} />
                            {printing ? 'Generating...' : 'PDF'}
                        </button>
                    </div>
                </div>

                {/* Receipt Card */}
                <div
                    className="rounded-xl overflow-hidden"
                    style={{ background: '#1e252d', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                    {/* Receipt Header */}
                    <div
                        className="p-6 text-center"
                        style={{ borderBottom: '1px dashed rgba(255,255,255,0.1)' }}
                    >
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <Coffee className="w-6 h-6" style={{ color: '#e07848' }} strokeWidth={1.5} />
                            <h1 className="text-2xl font-semibold">CafeOS</h1>
                        </div>
                        <p className="text-sm" style={{ color: '#6b7785' }}>Thank you for your order!</p>
                    </div>

                    {/* Order Info */}
                    <div
                        className="p-6 grid grid-cols-2 gap-4"
                        style={{ borderBottom: '1px dashed rgba(255,255,255,0.1)' }}
                    >
                        <div className="flex items-center gap-3">
                            <Hash className="w-4 h-4" style={{ color: '#8aa8c8' }} strokeWidth={2} />
                            <div>
                                <p className="text-xs" style={{ color: '#6b7785' }}>Order Number</p>
                                <p className="font-medium">{order.order_number.split('-').pop()}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <Clock className="w-4 h-4" style={{ color: '#8aa8c8' }} strokeWidth={2} />
                            <div>
                                <p className="text-xs" style={{ color: '#6b7785' }}>Date</p>
                                <p className="font-medium text-sm">{formatDate(order.created_at)}</p>
                            </div>
                        </div>
                        {order.table_id && (
                            <div className="flex items-center gap-3">
                                <div className="w-4 h-4 flex items-center justify-center">
                                    <span className="text-sm" style={{ color: '#8aa8c8' }}>🪑</span>
                                </div>
                                <div>
                                    <p className="text-xs" style={{ color: '#6b7785' }}>Table</p>
                                    <p className="font-medium">{order.table_id}</p>
                                </div>
                            </div>
                        )}
                        {order.customer_name && order.customer_name !== 'Guest' && (
                            <div className="flex items-center gap-3">
                                <User className="w-4 h-4" style={{ color: '#8aa8c8' }} strokeWidth={2} />
                                <div>
                                    <p className="text-xs" style={{ color: '#6b7785' }}>Customer</p>
                                    <p className="font-medium">{order.customer_name}</p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Items */}
                    <div className="p-6" style={{ borderBottom: '1px dashed rgba(255,255,255,0.1)' }}>
                        <h3 className="text-sm font-medium mb-4" style={{ color: '#8b95a5' }}>ITEMS</h3>
                        <div className="space-y-3">
                            {order.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-start">
                                    <div>
                                        <p className="font-medium">
                                            <span style={{ color: '#e07848' }}>{item.quantity}×</span> {item.name}
                                        </p>
                                        {item.instructions && (
                                            <p className="text-xs mt-1" style={{ color: '#6b7785' }}>
                                                Note: {item.instructions}
                                            </p>
                                        )}
                                    </div>
                                    <p className="font-medium" style={{ color: '#7ac090' }}>
                                        {formatPrice(item.quantity * item.unit_price_cents)}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Total */}
                    <div className="p-6">
                        <div className="flex justify-between items-center mb-2">
                            <span style={{ color: '#8b95a5' }}>Subtotal</span>
                            <span>{formatPrice(order.total_cents)}</span>
                        </div>
                        <div className="flex justify-between items-center mb-4">
                            <span style={{ color: '#8b95a5' }}>Tax (0%)</span>
                            <span>$0.00</span>
                        </div>
                        <div
                            className="flex justify-between items-center pt-4"
                            style={{ borderTop: '2px solid rgba(255,255,255,0.1)' }}
                        >
                            <span className="text-lg font-semibold">TOTAL</span>
                            <span className="text-xl font-bold" style={{ color: '#7ac090' }}>
                                {formatPrice(order.total_cents)}
                            </span>
                        </div>
                    </div>

                    {/* Footer */}
                    <div
                        className="p-6 text-center"
                        style={{ background: 'rgba(255,255,255,0.02)' }}
                    >
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <CheckCircle className="w-5 h-5" style={{ color: '#7ac090' }} strokeWidth={2} />
                            <p className="font-medium">Thank you for dining with us!</p>
                        </div>
                        <p className="text-xs" style={{ color: '#5c6675' }}>Visit again soon</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
