import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    ArrowLeft,
    UserPlus,
    Clock,
    LogIn,
    LogOut,
    Users,
    Shield,
    ChefHat,
    User,
    Trash2,
    Pencil,
    X
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface Staff {
    id: number;
    username: string;
    role: string;
    is_active: boolean;
    created_at: string;
}

interface Shift {
    id: number;
    user_id: number;
    username: string;
    clock_in: string;
    clock_out: string | null;
    hours_worked: number;
    notes: string | null;
}

export const StaffManagement: React.FC = () => {
    const [staff, setStaff] = useState<Staff[]>([]);
    const [shifts, setShifts] = useState<Shift[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
    const [activeTab, setActiveTab] = useState<'staff' | 'shifts'>('staff');

    const [formData, setFormData] = useState({
        username: '',
        password: '',
        role: 'staff',
        pin_code: ''
    });

    useEffect(() => {
        fetchStaff();
        fetchShifts();
    }, []);

    const fetchStaff = async () => {
        try {
            const res = await fetch(`${API_URL}/api/staff/`);
            if (res.ok) {
                const data = await res.json();
                setStaff(data);
            }
        } catch (err) {
            console.error("Failed to fetch staff", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchShifts = async () => {
        try {
            const res = await fetch(`${API_URL}/api/staff/shifts/all`);
            if (res.ok) {
                const data = await res.json();
                setShifts(data);
            }
        } catch (err) {
            console.error("Failed to fetch shifts", err);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const url = editingStaff
                ? `${API_URL}/api/staff/${editingStaff.id}`
                : `${API_URL}/api/staff/`;

            const res = await fetch(url, {
                method: editingStaff ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                await fetchStaff();
                closeModal();
            }
        } catch (err) {
            console.error("Failed to save staff", err);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Deactivate this staff member?')) return;
        try {
            await fetch(`${API_URL}/api/staff/${id}`, { method: 'DELETE' });
            await fetchStaff();
        } catch (err) {
            console.error("Failed to delete staff", err);
        }
    };

    const handleClockIn = async (userId: number) => {
        try {
            const res = await fetch(`${API_URL}/api/staff/${userId}/clock-in`, { method: 'POST' });
            if (res.ok) {
                await fetchShifts();
            } else {
                const data = await res.json();
                alert(data.detail || 'Failed to clock in');
            }
        } catch (err) {
            console.error("Failed to clock in", err);
        }
    };

    const handleClockOut = async (userId: number) => {
        try {
            const res = await fetch(`${API_URL}/api/staff/${userId}/clock-out`, { method: 'POST' });
            if (res.ok) {
                await fetchShifts();
            }
        } catch (err) {
            console.error("Failed to clock out", err);
        }
    };

    const closeModal = () => {
        setShowAddModal(false);
        setEditingStaff(null);
        setFormData({ username: '', password: '', role: 'staff', pin_code: '' });
    };

    const openEditModal = (s: Staff) => {
        setEditingStaff(s);
        setFormData({ username: s.username, password: '', role: s.role, pin_code: '' });
        setShowAddModal(true);
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case 'admin': return Shield;
            case 'manager': return Users;
            case 'kitchen': return ChefHat;
            default: return User;
        }
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'admin': return '#e07848';
            case 'manager': return '#8aa8c8';
            case 'kitchen': return '#d4aa5a';
            default: return '#7ac090';
        }
    };

    const formatTime = (dateStr: string) => {
        return new Date(dateStr).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric'
        });
    };

    // Check if staff is currently clocked in
    const isClocked = (userId: number) => {
        return shifts.some(s => s.user_id === userId && !s.clock_out);
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
                        <h1 className="text-2xl font-semibold">Staff Management</h1>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium"
                        style={{ background: '#5a9a6e', color: 'white' }}
                    >
                        <UserPlus className="w-4 h-4" />
                        Add Staff
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-6">
                    <button
                        onClick={() => setActiveTab('staff')}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        style={{
                            background: activeTab === 'staff' ? '#e07848' : 'rgba(255,255,255,0.05)',
                            color: activeTab === 'staff' ? 'white' : '#8b95a5'
                        }}
                    >
                        <Users className="w-4 h-4" />
                        Staff List
                    </button>
                    <button
                        onClick={() => setActiveTab('shifts')}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                        style={{
                            background: activeTab === 'shifts' ? '#e07848' : 'rgba(255,255,255,0.05)',
                            color: activeTab === 'shifts' ? 'white' : '#8b95a5'
                        }}
                    >
                        <Clock className="w-4 h-4" />
                        Shift History
                    </button>
                </div>

                {activeTab === 'staff' ? (
                    /* Staff Grid */
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {loading ? (
                            <p style={{ color: '#6b7785' }}>Loading...</p>
                        ) : staff.length === 0 ? (
                            <p style={{ color: '#6b7785' }}>No staff members yet</p>
                        ) : (
                            staff.filter(s => s.is_active).map(s => {
                                const RoleIcon = getRoleIcon(s.role);
                                const roleColor = getRoleColor(s.role);
                                const clocked = isClocked(s.id);

                                return (
                                    <div key={s.id} className="card p-5">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-10 h-10 rounded-full flex items-center justify-center"
                                                    style={{ background: `${roleColor}20` }}
                                                >
                                                    <RoleIcon className="w-5 h-5" style={{ color: roleColor }} />
                                                </div>
                                                <div>
                                                    <h3 className="font-medium">{s.username}</h3>
                                                    <span
                                                        className="text-xs px-2 py-0.5 rounded capitalize"
                                                        style={{ background: `${roleColor}20`, color: roleColor }}
                                                    >
                                                        {s.role}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => openEditModal(s)}
                                                    className="p-1.5 rounded"
                                                    style={{ color: '#8aa8c8' }}
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(s.id)}
                                                    className="p-1.5 rounded"
                                                    style={{ color: '#d07070' }}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            {clocked ? (
                                                <button
                                                    onClick={() => handleClockOut(s.id)}
                                                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium"
                                                    style={{ background: 'rgba(184, 86, 86, 0.2)', color: '#d07070' }}
                                                >
                                                    <LogOut className="w-4 h-4" />
                                                    Clock Out
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleClockIn(s.id)}
                                                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium"
                                                    style={{ background: 'rgba(90, 154, 110, 0.2)', color: '#7ac090' }}
                                                >
                                                    <LogIn className="w-4 h-4" />
                                                    Clock In
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                ) : (
                    /* Shifts Table */
                    <div className="card overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                                    <th className="text-left p-4 text-sm font-medium" style={{ color: '#6b7785' }}>Staff</th>
                                    <th className="text-left p-4 text-sm font-medium" style={{ color: '#6b7785' }}>Date</th>
                                    <th className="text-left p-4 text-sm font-medium" style={{ color: '#6b7785' }}>Clock In</th>
                                    <th className="text-left p-4 text-sm font-medium" style={{ color: '#6b7785' }}>Clock Out</th>
                                    <th className="text-right p-4 text-sm font-medium" style={{ color: '#6b7785' }}>Hours</th>
                                </tr>
                            </thead>
                            <tbody>
                                {shifts.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-8 text-center" style={{ color: '#6b7785' }}>
                                            No shifts recorded
                                        </td>
                                    </tr>
                                ) : (
                                    shifts.map(shift => (
                                        <tr key={shift.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                            <td className="p-4 font-medium">{shift.username}</td>
                                            <td className="p-4" style={{ color: '#8b95a5' }}>{formatDate(shift.clock_in)}</td>
                                            <td className="p-4" style={{ color: '#7ac090' }}>{formatTime(shift.clock_in)}</td>
                                            <td className="p-4" style={{ color: shift.clock_out ? '#d07070' : '#6b7785' }}>
                                                {shift.clock_out ? formatTime(shift.clock_out) : 'Active'}
                                            </td>
                                            <td className="p-4 text-right font-medium">
                                                {shift.hours_worked.toFixed(2)}h
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {showAddModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.8)' }}
                    onClick={closeModal}
                >
                    <div
                        className="w-full max-w-md rounded-xl p-6"
                        style={{ background: '#1e252d', border: '1px solid rgba(255,255,255,0.08)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-semibold">
                                {editingStaff ? 'Edit Staff' : 'Add Staff'}
                            </h3>
                            <button onClick={closeModal} style={{ color: '#6b7785' }}>
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm mb-2" style={{ color: '#8b95a5' }}>Username</label>
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg"
                                    style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        color: '#e2e8f0'
                                    }}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm mb-2" style={{ color: '#8b95a5' }}>
                                    Password {editingStaff && '(leave blank to keep)'}
                                </label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg"
                                    style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        color: '#e2e8f0'
                                    }}
                                    required={!editingStaff}
                                />
                            </div>

                            <div>
                                <label className="block text-sm mb-2" style={{ color: '#8b95a5' }}>Role</label>
                                <select
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg"
                                    style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        color: '#e2e8f0'
                                    }}
                                >
                                    <option value="staff">Staff</option>
                                    <option value="kitchen">Kitchen</option>
                                    <option value="manager">Manager</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm mb-2" style={{ color: '#8b95a5' }}>PIN Code (4 digits)</label>
                                <input
                                    type="text"
                                    value={formData.pin_code}
                                    onChange={e => setFormData({ ...formData, pin_code: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg"
                                    style={{
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.08)',
                                        color: '#e2e8f0'
                                    }}
                                    maxLength={4}
                                    pattern="\d{4}"
                                    placeholder="1234"
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    className="flex-1 py-2.5 rounded-lg font-medium"
                                    style={{ background: '#5a9a6e', color: 'white' }}
                                >
                                    {editingStaff ? 'Save Changes' : 'Add Staff'}
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
