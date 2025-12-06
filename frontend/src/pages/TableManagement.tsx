import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Pencil, Trash2, Users, QrCode, ExternalLink } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface Table {
    id?: number;
    number: string;
    capacity: number;
    is_active: boolean;
}

export const TableManagement: React.FC = () => {
    const [tables, setTables] = useState<Table[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingTable, setEditingTable] = useState<Table | null>(null);
    const [formData, setFormData] = useState<Table>({
        number: '',
        capacity: 4,
        is_active: true
    });

    useEffect(() => {
        fetchTables();
    }, []);

    const fetchTables = async () => {
        try {
            const res = await fetch(`${API_URL}/api/admin/tables`);
            if (res.ok) setTables(await res.json());
        } catch (err) {
            console.error("Failed to fetch tables", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = editingTable?.id
            ? `${API_URL}/api/admin/tables/${editingTable.id}`
            : `${API_URL}/api/admin/tables`;
        const method = editingTable?.id ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                fetchTables();
                setShowForm(false);
                setEditingTable(null);
                setFormData({ number: '', capacity: 4, is_active: true });
            }
        } catch (err) {
            console.error("Failed to save table", err);
        }
    };

    const handleEdit = (table: Table) => {
        setEditingTable(table);
        setFormData(table);
        setShowForm(true);
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this table?')) return;
        try {
            await fetch(`${API_URL}/api/admin/tables/${id}`, { method: 'DELETE' });
            fetchTables();
        } catch (err) {
            console.error("Failed to delete table", err);
        }
    };

    const generateQRUrl = (tableNumber: string) => {
        const baseUrl = window.location.origin;
        return `${baseUrl}/order?table=${tableNumber}`;
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
                        <h1 className="text-3xl font-semibold">Table Management</h1>
                    </div>
                    <button
                        onClick={() => { setShowForm(true); setEditingTable(null); setFormData({ number: '', capacity: 4, is_active: true }); }}
                        className="px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors"
                        style={{ background: '#e07848', color: 'white' }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#c96a3d'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#e07848'}
                    >
                        <Plus className="w-4 h-4" strokeWidth={2} />
                        Add Table
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
                            <h2 className="text-xl font-semibold mb-6">{editingTable ? 'Edit Table' : 'Add New Table'}</h2>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1.5" style={{ color: '#8b95a5' }}>Table Number</label>
                                    <input
                                        type="text"
                                        value={formData.number}
                                        onChange={e => setFormData({ ...formData, number: e.target.value })}
                                        className="w-full p-3 rounded-lg"
                                        style={{ background: '#1a1f26', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1.5" style={{ color: '#8b95a5' }}>Capacity</label>
                                    <input
                                        type="number"
                                        value={formData.capacity}
                                        onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                                        className="w-full p-3 rounded-lg"
                                        style={{ background: '#1a1f26', border: '1px solid rgba(255,255,255,0.1)', color: '#e2e8f0' }}
                                        min="1"
                                        required
                                    />
                                </div>
                                <div className="flex items-center gap-2 pt-2">
                                    <input
                                        type="checkbox"
                                        checked={formData.is_active}
                                        onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                        className="w-4 h-4 rounded"
                                        id="active-check"
                                    />
                                    <label htmlFor="active-check" style={{ color: '#8b95a5' }}>Active</label>
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="submit"
                                        className="flex-1 py-2.5 rounded-lg font-medium transition-colors"
                                        style={{ background: '#e07848', color: 'white' }}
                                    >
                                        {editingTable ? 'Update' : 'Create'}
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

                {/* Tables Grid */}
                {loading ? (
                    <div className="text-center py-12" style={{ color: '#6b7785' }}>Loading...</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {tables.map(table => (
                            <div
                                key={table.id}
                                className="rounded-xl overflow-hidden"
                                style={{
                                    background: '#1e252d',
                                    border: table.is_active
                                        ? '1px solid rgba(255,255,255,0.06)'
                                        : '1px solid rgba(184, 86, 86, 0.3)'
                                }}
                            >
                                <div className="p-5">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-xl font-semibold">Table {table.number}</h3>
                                            <p className="text-sm flex items-center gap-1.5 mt-1" style={{ color: '#6b7785' }}>
                                                <Users className="w-3.5 h-3.5" strokeWidth={2} />
                                                {table.capacity} seats
                                            </p>
                                        </div>
                                        <span
                                            className="px-2.5 py-1 rounded text-xs font-medium"
                                            style={{
                                                background: table.is_active ? 'rgba(90, 154, 110, 0.15)' : 'rgba(184, 86, 86, 0.15)',
                                                color: table.is_active ? '#7ac090' : '#d07070'
                                            }}
                                        >
                                            {table.is_active ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>

                                    {/* QR Code Section */}
                                    <div
                                        className="rounded-lg p-4 mb-4"
                                        style={{ background: 'rgba(255,255,255,0.03)' }}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <QrCode className="w-4 h-4" style={{ color: '#8aa8c8' }} strokeWidth={2} />
                                            <p className="text-xs font-medium" style={{ color: '#8b95a5' }}>Order URL</p>
                                        </div>
                                        <code
                                            className="text-xs break-all block" z
                                            style={{ color: '#8aa8c8' }}
                                        >
                                            {generateQRUrl(table.number)}
                                        </code>
                                        <a
                                            href={generateQRUrl(table.number)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium transition-colors"
                                            style={{ color: '#e07848' }}
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" strokeWidth={2} />
                                            Open Link
                                        </a>
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleEdit(table)}
                                            className="flex-1 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
                                            style={{ background: 'rgba(107, 138, 172, 0.15)', color: '#8aa8c8' }}
                                        >
                                            <Pencil className="w-4 h-4" strokeWidth={2} />
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(table.id!)}
                                            className="py-2.5 px-4 rounded-lg flex items-center justify-center transition-colors"
                                            style={{ background: 'rgba(184, 86, 86, 0.15)', color: '#d07070' }}
                                        >
                                            <Trash2 className="w-4 h-4" strokeWidth={2} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
