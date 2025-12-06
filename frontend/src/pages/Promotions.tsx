import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowLeft,
    Plus,
    Percent,
    DollarSign,
    Trash2,
    Pencil,
    X
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface Promotion {
    id: number;
    code: string;
    name: string;
    type: string;
    value: number;
    min_order_cents: number;
    max_discount_cents: number | null;
    valid_from: string | null;
    valid_to: string | null;
    usage_limit: number | null;
    times_used: number;
    is_active: boolean;
    created_at: string;
}

export const Promotions: React.FC = () => {
    const [promotions, setPromotions] = useState<Promotion[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Promotion | null>(null);

    const [formData, setFormData] = useState({
        code: '',
        name: '',
        type: 'percentage',
        value: 10,
        min_order_cents: 0,
        max_discount_cents: '',
        valid_from: '',
        valid_to: '',
        usage_limit: ''
    });

    useEffect(() => {
        fetchPromotions();
    }, []);

    const fetchPromotions = async () => {
        try {
            const res = await fetch(`${API_URL}/api/promotions/`);
            if (res.ok) {
                const data = await res.json();
                setPromotions(data);
            }
        } catch (err) {
            console.error("Failed to fetch promotions", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                min_order_cents: formData.min_order_cents * 100,
                max_discount_cents: formData.max_discount_cents ? parseInt(formData.max_discount_cents) * 100 : null,
                usage_limit: formData.usage_limit ? parseInt(formData.usage_limit) : null
            };

            const url = editing
                ? `${API_URL}/api/promotions/${editing.id}`
                : `${API_URL}/api/promotions/`;

            const res = await fetch(url, {
                method: editing ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                await fetchPromotions();
                closeModal();
            }
        } catch (err) {
            console.error("Failed to save promotion", err);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Deactivate this promotion?')) return;
        try {
            await fetch(`${API_URL}/api/promotions/${id}`, { method: 'DELETE' });
            await fetchPromotions();
        } catch (err) {
            console.error("Failed to delete promotion", err);
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setEditing(null);
        setFormData({
            code: '',
            name: '',
            type: 'percentage',
            value: 10,
            min_order_cents: 0,
            max_discount_cents: '',
            valid_from: '',
            valid_to: '',
            usage_limit: ''
        });
    };

    const openEdit = (p: Promotion) => {
        setEditing(p);
        setFormData({
            code: p.code,
            name: p.name,
            type: p.type,
            value: p.value,
            min_order_cents: p.min_order_cents / 100,
            max_discount_cents: p.max_discount_cents ? String(p.max_discount_cents / 100) : '',
            valid_from: p.valid_from ? p.valid_from.split('T')[0] : '',
            valid_to: p.valid_to ? p.valid_to.split('T')[0] : '',
            usage_limit: p.usage_limit ? String(p.usage_limit) : ''
        });
        setShowModal(true);
    };

    const formatDiscount = (p: Promotion) => {
        if (p.type === 'percentage') {
            return `${p.value}% off`;
        } else {
            return `$${(p.value / 100).toFixed(2)} off`;
        }
    };

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
                        <h1 className="text-2xl font-semibold">Promotions & Discounts</h1>
                    </div>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium"
                        style={{ background: '#5a9a6e', color: 'white' }}
                    >
                        <Plus className="w-4 h-4" />
                        New Promo
                    </button>
                </div>

                {/* Promotions Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {loading ? (
                        <p style={{ color: '#6b7785' }}>Loading...</p>
                    ) : promotions.filter(p => p.is_active).length === 0 ? (
                        <p style={{ color: '#6b7785' }}>No active promotions</p>
                    ) : (
                        promotions.filter(p => p.is_active).map(p => (
                            <div key={p.id} className="card p-5">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-10 h-10 rounded-full flex items-center justify-center"
                                            style={{ background: 'rgba(224, 120, 72, 0.2)' }}
                                        >
                                            {p.type === 'percentage'
                                                ? <Percent className="w-5 h-5" style={{ color: '#e07848' }} />
                                                : <DollarSign className="w-5 h-5" style={{ color: '#e07848' }} />
                                            }
                                        </div>
                                        <div>
                                            <h3 className="font-medium">{p.name}</h3>
                                            <span
                                                className="text-xs px-2 py-0.5 rounded font-mono"
                                                style={{ background: 'rgba(107, 138, 172, 0.2)', color: '#8aa8c8' }}
                                            >
                                                {p.code}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() => openEdit(p)}
                                            className="p-1.5 rounded"
                                            style={{ color: '#8aa8c8' }}
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(p.id)}
                                            className="p-1.5 rounded"
                                            style={{ color: '#d07070' }}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="text-2xl font-semibold mb-3" style={{ color: '#7ac090' }}>
                                    {formatDiscount(p)}
                                </div>

                                <div className="space-y-1 text-sm" style={{ color: '#6b7785' }}>
                                    {p.min_order_cents > 0 && (
                                        <p>Min order: ${(p.min_order_cents / 100).toFixed(2)}</p>
                                    )}
                                    {p.usage_limit && (
                                        <p>Uses: {p.times_used} / {p.usage_limit}</p>
                                    )}
                                    {p.valid_to && (
                                        <p>Expires: {new Date(p.valid_to).toLocaleDateString()}</p>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Add/Edit Modal */}
            {showModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.8)' }}
                    onClick={closeModal}
                >
                    <div
                        className="w-full max-w-md rounded-xl p-6 max-h-[90vh] overflow-y-auto"
                        style={{ background: '#1e252d', border: '1px solid rgba(255,255,255,0.08)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold">
                                {editing ? 'Edit Promotion' : 'New Promotion'}
                            </h3>
                            <button onClick={closeModal} style={{ color: '#6b7785' }}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm mb-2" style={{ color: '#8b95a5' }}>Promo Code</label>
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                        className="w-full px-4 py-2 rounded-lg font-mono"
                                        style={{
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            color: '#e2e8f0'
                                        }}
                                        placeholder="SUMMER20"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm mb-2" style={{ color: '#8b95a5' }}>Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg"
                                        style={{
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            color: '#e2e8f0'
                                        }}
                                        placeholder="Summer Sale"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm mb-2" style={{ color: '#8b95a5' }}>Type</label>
                                    <select
                                        value={formData.type}
                                        onChange={e => setFormData({ ...formData, type: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg"
                                        style={{
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            color: '#e2e8f0'
                                        }}
                                    >
                                        <option value="percentage">Percentage</option>
                                        <option value="fixed">Fixed Amount</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm mb-2" style={{ color: '#8b95a5' }}>
                                        Value {formData.type === 'percentage' ? '(%)' : '($)'}
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.value}
                                        onChange={e => setFormData({ ...formData, value: parseInt(e.target.value) })}
                                        className="w-full px-4 py-2 rounded-lg"
                                        style={{
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            color: '#e2e8f0'
                                        }}
                                        min="0"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm mb-2" style={{ color: '#8b95a5' }}>Min Order ($)</label>
                                    <input
                                        type="number"
                                        value={formData.min_order_cents}
                                        onChange={e => setFormData({ ...formData, min_order_cents: parseFloat(e.target.value) })}
                                        className="w-full px-4 py-2 rounded-lg"
                                        style={{
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            color: '#e2e8f0'
                                        }}
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm mb-2" style={{ color: '#8b95a5' }}>Max Discount ($)</label>
                                    <input
                                        type="number"
                                        value={formData.max_discount_cents}
                                        onChange={e => setFormData({ ...formData, max_discount_cents: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg"
                                        style={{
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            color: '#e2e8f0'
                                        }}
                                        placeholder="No limit"
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm mb-2" style={{ color: '#8b95a5' }}>Valid From</label>
                                    <input
                                        type="date"
                                        value={formData.valid_from}
                                        onChange={e => setFormData({ ...formData, valid_from: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg"
                                        style={{
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            color: '#e2e8f0'
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm mb-2" style={{ color: '#8b95a5' }}>Valid To</label>
                                    <input
                                        type="date"
                                        value={formData.valid_to}
                                        onChange={e => setFormData({ ...formData, valid_to: e.target.value })}
                                        className="w-full px-4 py-2 rounded-lg"
                                        style={{
                                            background: 'rgba(255,255,255,0.05)',
                                            border: '1px solid rgba(255,255,255,0.08)',
                                            color: '#e2e8f0'
                                        }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm mb-2" style={{ color: '#8b95a5' }}>Usage Limit</label>
                                <input
                                    type="number"
                                    value={formData.usage_limit}
                                    onChange={e => setFormData({ ...formData, usage_limit: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg"
                                    style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        color: '#e2e8f0'
                                    }}
                                    placeholder="Unlimited"
                                    min="1"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    className="flex-1 py-2.5 rounded-lg font-medium"
                                    style={{ background: '#5a9a6e', color: 'white' }}
                                >
                                    {editing ? 'Save Changes' : 'Create Promotion'}
                                </button>
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 py-2.5 rounded-lg font-medium"
                                    style={{ background: 'rgba(255,255,255,0.05)', color: '#8b95a5' }}
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
