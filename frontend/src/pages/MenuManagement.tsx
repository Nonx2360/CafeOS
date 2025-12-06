import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface MenuItem {
    id?: number;
    name: string;
    description: string;
    price_cents: number;
    category_id: number | null;
    is_available: boolean;
    tags: string[];
}

interface Category {
    id: number;
    name: string;
    order_index: number;
}

export const MenuManagement: React.FC = () => {
    const [items, setItems] = useState<MenuItem[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
    const [formData, setFormData] = useState<MenuItem>({
        name: '',
        description: '',
        price_cents: 0,
        category_id: null,
        is_available: true,
        tags: []
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [itemsRes, catsRes] = await Promise.all([
                fetch(`${API_URL}/api/admin/menu`),
                fetch(`${API_URL}/api/admin/categories`)
            ]);
            if (itemsRes.ok) setItems(await itemsRes.json());
            if (catsRes.ok) setCategories(await catsRes.json());
        } catch (err) {
            console.error("Failed to fetch menu data", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = editingItem?.id
            ? `${API_URL}/api/admin/menu/${editingItem.id}`
            : `${API_URL}/api/admin/menu`;
        const method = editingItem?.id ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                fetchData();
                setShowForm(false);
                setEditingItem(null);
                setFormData({ name: '', description: '', price_cents: 0, category_id: null, is_available: true, tags: [] });
            }
        } catch (err) {
            console.error("Failed to save item", err);
        }
    };

    const handleEdit = (item: MenuItem) => {
        setEditingItem(item);
        setFormData(item);
        setShowForm(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this item?')) return;
        try {
            await fetch(`${API_URL}/api/admin/menu/${id}`, { method: 'DELETE' });
            fetchData();
        } catch (err) {
            console.error("Failed to delete item", err);
        }
    };

    const getCategoryName = (catId: number | null) => {
        const cat = categories.find(c => c.id === catId);
        return cat?.name || 'Uncategorized';
    };

    return (
        <div className="min-h-screen p-6" style={{ background: '#0f1419', color: '#e2e8f0' }}>
            <div className="container mx-auto max-w-5xl">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <Link
                            to="/admin"
                            className="text-sm font-medium mb-3 inline-flex items-center gap-1.5 transition-colors"
                            style={{ color: '#8aa8c8' }}
                        >
                            <ArrowLeft className="w-4 h-4" strokeWidth={2} />
                            Back to Dashboard
                        </Link>
                        <h1 className="text-3xl font-semibold">Menu Management</h1>
                    </div>
                    <button
                        onClick={() => { setShowForm(true); setEditingItem(null); setFormData({ name: '', description: '', price_cents: 0, category_id: null, is_available: true, tags: [] }); }}
                        className="px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors"
                        style={{ background: '#e07848', color: 'white' }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#c96a3d'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#e07848'}
                    >
                        <Plus className="w-4 h-4" strokeWidth={2} />
                        Add Item
                    </button>
                </div>

                {/* Form Modal */}
                {showForm && (
                    <div
                        className="fixed inset-0 flex items-center justify-center z-50 modal-backdrop"
                        onClick={() => setShowForm(false)}
                    >
                        <div
                            className="p-7 rounded-xl w-full max-w-md"
                            style={{ background: '#1e252d', border: '1px solid rgba(255,255,255,0.08)' }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <h2 className="text-xl font-semibold mb-6">{editingItem ? 'Edit Item' : 'Add New Item'}</h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5" style={{ color: '#8b95a5' }}>Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full p-3 rounded-lg"
                                        style={{ background: '#1a1f26', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5" style={{ color: '#8b95a5' }}>Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        className="w-full p-3 rounded-lg resize-none"
                                        style={{ background: '#1a1f26', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
                                        rows={2}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5" style={{ color: '#8b95a5' }}>Price ($)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={(formData.price_cents / 100).toFixed(2)}
                                        onChange={e => setFormData({ ...formData, price_cents: Math.round(parseFloat(e.target.value) * 100) })}
                                        className="w-full p-3 rounded-lg"
                                        style={{ background: '#1a1f26', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5" style={{ color: '#8b95a5' }}>Category</label>
                                    <select
                                        value={formData.category_id || ''}
                                        onChange={e => setFormData({ ...formData, category_id: e.target.value ? parseInt(e.target.value) : null })}
                                        className="w-full p-3 rounded-lg"
                                        style={{ background: '#1a1f26', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
                                    >
                                        <option value="">Select category</option>
                                        {categories.map(cat => (
                                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-center gap-2 pt-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_available}
                                        onChange={e => setFormData({ ...formData, is_available: e.target.checked })}
                                        className="w-4 h-4 rounded"
                                        id="available-check"
                                    />
                                    <label htmlFor="available-check" style={{ color: '#8b95a5' }}>Available</label>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="submit"
                                        className="flex-1 py-2.5 rounded-lg font-medium transition-colors"
                                        style={{ background: '#e07848', color: 'white' }}
                                    >
                                        {editingItem ? 'Update' : 'Create'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowForm(false)}
                                        className="flex-1 py-2.5 rounded-lg font-medium transition-colors"
                                        style={{ background: '#3d4654', color: '#8b95a5' }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Items Table */}
                {loading ? (
                    <div className="text-center py-12" style={{ color: '#6b7785' }}>Loading...</div>
                ) : (
                    <div
                        className="rounded-xl overflow-hidden"
                        style={{ background: '#1e252d', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                        <table className="w-full">
                            <thead>
                                <tr style={{ background: '#1a1f26' }}>
                                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b7785' }}>Name</th>
                                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b7785' }}>Category</th>
                                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b7785' }}>Price</th>
                                    <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b7785' }}>Status</th>
                                    <th className="px-5 py-4 text-right text-xs font-semibold uppercase tracking-wide" style={{ color: '#6b7785' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map(item => (
                                    <tr
                                        key={item.id}
                                        className="transition-colors"
                                        style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}
                                    >
                                        <td className="px-5 py-4">
                                            <div>
                                                <span className="font-medium" style={{ color: '#e2e8f0' }}>{item.name}</span>
                                                <p className="text-sm mt-0.5" style={{ color: '#6b7785' }}>{item.description}</p>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span
                                                className="px-2.5 py-1 rounded text-xs font-medium"
                                                style={{ background: 'rgba(255,255,255,0.05)', color: '#8b95a5' }}
                                            >
                                                {getCategoryName(item.category_id)}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 font-medium" style={{ color: '#7ac090' }}>
                                            ${(item.price_cents / 100).toFixed(2)}
                                        </td>
                                        <td className="px-5 py-4">
                                            <span
                                                className="px-2.5 py-1 rounded text-xs font-medium"
                                                style={{
                                                    background: item.is_available ? 'rgba(90, 154, 110, 0.15)' : 'rgba(184, 86, 86, 0.15)',
                                                    color: item.is_available ? '#7ac090' : '#d07070'
                                                }}
                                            >
                                                {item.is_available ? 'Available' : 'Unavailable'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <button
                                                onClick={() => handleEdit(item)}
                                                className="p-2 rounded-lg mr-2 transition-colors"
                                                style={{ background: 'rgba(107, 138, 172, 0.15)', color: '#8aa8c8' }}
                                            >
                                                <Pencil className="w-4 h-4" strokeWidth={2} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id!)}
                                                className="p-2 rounded-lg transition-colors"
                                                style={{ background: 'rgba(184, 86, 86, 0.15)', color: '#d07070' }}
                                            >
                                                <Trash2 className="w-4 h-4" strokeWidth={2} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
