import React, { useEffect, useState } from 'react';
import type { MenuCategory, MenuItem, OrderItem, ModifierGroup, SelectedModifier } from '../types';
import { getSocket } from '../socket';
import { useSearchParams } from 'react-router-dom';
import {
    ClipboardList,
    ChefHat,
    CheckCircle,
    UtensilsCrossed,
    Package,
    Plus,
    Minus,
    Send,
    X,
    Settings2
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const OrderPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const [menu, setMenu] = useState<MenuCategory[]>([]);
    const [cart, setCart] = useState<OrderItem[]>([]);
    const [tableId, setTableId] = useState<number>(() => {
        const tableParam = searchParams.get('table');
        return tableParam ? parseInt(tableParam) : 1;
    });
    const [customerName, setCustomerName] = useState<string>('');
    const [activeOrder, setActiveOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Modifier state
    const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
    const [showModifierModal, setShowModifierModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
    const [tempModifiers, setTempModifiers] = useState<SelectedModifier[]>([]);

    // Promo & Loyalty state
    const [promoCode, setPromoCode] = useState('');
    const [appliedPromo, setAppliedPromo] = useState<any>(null);
    const [promoError, setPromoError] = useState('');
    const [loyaltyPhone, setLoyaltyPhone] = useState('');
    const [customerInfo, setCustomerInfo] = useState<any>(null);
    const [checkingLoyalty, setCheckingLoyalty] = useState(false);

    useEffect(() => {
        fetchMenu();
        fetchModifierGroups();
        const socket = getSocket();

        socket.on('order_created', (order) => {
            if (order.customer_name === customerName || order.table_id === tableId) {
                setActiveOrder(order);
            }
        });

        socket.on('order_updated', (data) => {
            if (activeOrder && activeOrder.id === data.id) {
                setActiveOrder((prev: any) => ({ ...prev, status: data.status }));
            }
        });

        return () => {
            socket.off('order_created');
            socket.off('order_updated');
        };
    }, [activeOrder, customerName, tableId]);

    const fetchMenu = async () => {
        try {
            const res = await fetch(`${API_URL}/api/orders/menu`);
            const data = await res.json();
            setMenu(data);
        } catch (err) {
            console.error("Failed to fetch menu", err);
        } finally {
            setLoading(false);
        }
    };

    const fetchModifierGroups = async () => {
        try {
            const res = await fetch(`${API_URL}/api/modifiers/groups`);
            const data = await res.json();
            setModifierGroups(data);
        } catch (err) {
            console.error("Failed to fetch modifier groups", err);
        }
    };

    const getCartTotal = () => {
        return cart.reduce((acc, i) => acc + ((i.unit_price_cents + (i.modifier_price_cents || 0)) * i.quantity), 0);
    };

    const checkPromoCode = async () => {
        if (!promoCode) return;
        setPromoError('');
        try {
            const total = getCartTotal();
            const res = await fetch(`${API_URL}/api/promotions/validate?code=${promoCode}&order_total_cents=${total}`, {
                method: 'POST'
            });
            const data = await res.json();
            if (res.ok) {
                setAppliedPromo(data);
                setPromoError('');
            } else {
                setPromoError(data.detail || 'Invalid code');
                setAppliedPromo(null);
            }
        } catch (err) {
            setPromoError('Validation failed');
        }
    };

    const checkLoyalty = async () => {
        if (!loyaltyPhone || loyaltyPhone.length < 4) return;
        setCheckingLoyalty(true);
        try {
            const res = await fetch(`${API_URL}/api/promotions/loyalty/${loyaltyPhone}`);
            const data = await res.json();
            if (res.ok && data.found) {
                setCustomerInfo(data);
                if (!customerName) setCustomerName(data.name || 'Valued Customer');
            } else {
                // Register new?
                const regRes = await fetch(`${API_URL}/api/promotions/loyalty/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: loyaltyPhone, name: customerName || 'Guest' })
                });
                if (regRes.ok) {
                    const newData = await regRes.json();
                    setCustomerInfo(newData);
                }
            }
        } catch (err) {
            console.error("Loyalty check failed", err);
        } finally {
            setCheckingLoyalty(false);
        }
    };

    const openModifierModal = (item: MenuItem) => {
        setSelectedItem(item);
        // Pre-select default modifiers
        const defaults: SelectedModifier[] = [];
        const itemGroupIds = item.modifier_group_ids || [];
        itemGroupIds.forEach(groupId => {
            const group = modifierGroups.find(g => g.id === groupId);
            if (group) {
                const defaultMod = group.modifiers.find(m => m.is_default);
                if (defaultMod) {
                    defaults.push({ id: defaultMod.id, name: defaultMod.name, price_cents: defaultMod.price_cents });
                }
            }
        });
        setTempModifiers(defaults);
        setShowModifierModal(true);
    };

    const addToCart = (item: MenuItem, modifiers: SelectedModifier[] = []) => {
        const modifierPrice = modifiers.reduce((sum, m) => sum + m.price_cents, 0);
        // Create a unique key for cart item based on item + modifiers
        const modifierKey = modifiers.map(m => m.id).sort().join('-');

        setCart(prev => {
            const existing = prev.find(i =>
                i.menu_item_id === item.id &&
                (i.selected_modifiers || []).map(m => m.id).sort().join('-') === modifierKey
            );
            if (existing) {
                return prev.map(i =>
                    i.menu_item_id === item.id &&
                        (i.selected_modifiers || []).map(m => m.id).sort().join('-') === modifierKey
                        ? { ...i, quantity: i.quantity + 1 }
                        : i
                );
            }
            return [...prev, {
                menu_item_id: item.id,
                name: item.name,
                quantity: 1,
                unit_price_cents: item.price_cents,
                modifier_price_cents: modifierPrice,
                selected_modifiers: modifiers
            }];
        });
    };

    const handleAddWithModifiers = () => {
        if (selectedItem) {
            addToCart(selectedItem, tempModifiers);
            setShowModifierModal(false);
            setSelectedItem(null);
            setTempModifiers([]);
        }
    };

    const handleItemClick = (item: MenuItem) => {
        const hasModifiers = (item.modifier_group_ids || []).length > 0;
        if (hasModifiers) {
            openModifierModal(item);
        } else {
            addToCart(item, []);
        }
    };

    const removeFromCart = (menuItemId: number, modifierKey: string = '') => {
        setCart(prev => {
            const existing = prev.find(i =>
                i.menu_item_id === menuItemId &&
                (i.selected_modifiers || []).map(m => m.id).sort().join('-') === modifierKey
            );
            if (existing && existing.quantity > 1) {
                return prev.map(i =>
                    i.menu_item_id === menuItemId &&
                        (i.selected_modifiers || []).map(m => m.id).sort().join('-') === modifierKey
                        ? { ...i, quantity: i.quantity - 1 }
                        : i
                );
            }
            return prev.filter(i =>
                !(i.menu_item_id === menuItemId &&
                    (i.selected_modifiers || []).map(m => m.id).sort().join('-') === modifierKey)
            );
        });
    };

    const updateInstructions = (menuItemId: number, modifierKey: string, instructions: string) => {
        setCart(prev => prev.map(i =>
            i.menu_item_id === menuItemId &&
                (i.selected_modifiers || []).map(m => m.id).sort().join('-') === modifierKey
                ? { ...i, instructions }
                : i
        ));
    };

    const toggleModifier = (group: ModifierGroup, modifierId: number) => {
        const modifier = group.modifiers.find(m => m.id === modifierId);
        if (!modifier) return;

        if (group.selection_type === 'single') {
            // Remove any existing from this group and add new one
            setTempModifiers(prev => [
                ...prev.filter(m => !group.modifiers.some(gm => gm.id === m.id)),
                { id: modifier.id, name: modifier.name, price_cents: modifier.price_cents }
            ]);
        } else {
            // Toggle for multiple selection
            const exists = tempModifiers.find(m => m.id === modifierId);
            if (exists) {
                setTempModifiers(prev => prev.filter(m => m.id !== modifierId));
            } else {
                setTempModifiers(prev => [...prev, { id: modifier.id, name: modifier.name, price_cents: modifier.price_cents }]);
            }
        }
    };

    const placeOrder = async () => {
        if (cart.length === 0) return;

        const orderData = {
            table_id: tableId,
            customer_name: customerName || "Guest",
            items: cart.map(i => ({
                menu_item_id: i.menu_item_id,
                quantity: i.quantity,
                instructions: i.instructions,
                selected_modifiers: i.selected_modifiers || []
            })),
            promo_code: appliedPromo ? appliedPromo.code : null,
            discount_cents: appliedPromo ? appliedPromo.discount_cents : 0,
            customer_id: customerInfo ? customerInfo.id : null
        };

        try {
            const res = await fetch(`${API_URL}/api/orders/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(orderData)
            });
            const newOrder = await res.json();

            if (customerInfo) {
                try {
                    await fetch(`${API_URL}/api/promotions/loyalty/${customerInfo.id}/earn?order_id=${newOrder.id}&amount_cents=${newOrder.total_cents - (newOrder.discount_cents || 0)}`, {
                        method: 'POST'
                    });
                } catch (e) { console.error("Failed to record points"); }
            }

            setActiveOrder(newOrder);
            setCart([]);
            setAppliedPromo(null);
            setCustomerInfo(null);
        } catch (err) {
            console.error("Failed to place order", err);
        }
    };

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'pending': return {
                text: 'Order Received',
                color: '#8aa8c8',
                bg: 'rgba(107, 138, 172, 0.15)',
                Icon: ClipboardList
            };
            case 'preparing': return {
                text: 'Being Prepared',
                color: '#e07848',
                bg: 'rgba(224, 120, 72, 0.15)',
                Icon: ChefHat
            };
            case 'ready': return {
                text: 'Ready for Pickup!',
                color: '#7ac090',
                bg: 'rgba(90, 154, 110, 0.15)',
                Icon: CheckCircle
            };
            case 'served': return {
                text: 'Served',
                color: '#8b95a5',
                bg: 'rgba(139, 149, 165, 0.15)',
                Icon: UtensilsCrossed
            };
            default: return {
                text: status,
                color: '#8b95a5',
                bg: 'rgba(139, 149, 165, 0.15)',
                Icon: Package
            };
        }
    };

    // Order Status View
    if (activeOrder) {
        const statusInfo = getStatusInfo(activeOrder.status);
        const StatusIcon = statusInfo.Icon;
        return (
            <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0f1419' }}>
                <div className="max-w-md w-full animate-fade-in">
                    <div className="card p-8 text-center">
                        <div
                            className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5"
                            style={{ background: statusInfo.bg }}
                        >
                            <StatusIcon className="w-10 h-10" style={{ color: statusInfo.color }} strokeWidth={1.5} />
                        </div>
                        <h2 className="text-2xl font-semibold mb-2" style={{ color: '#e2e8f0' }}>Order #{activeOrder.order_number}</h2>
                        <p className="mb-6" style={{ color: '#6b7785' }}>Table {activeOrder.table_id}</p>

                        <div
                            className="inline-block px-5 py-2.5 rounded-lg text-sm font-medium mb-6"
                            style={{ background: statusInfo.bg, color: statusInfo.color }}
                        >
                            {statusInfo.text}
                        </div>

                        <div className="pt-6 mt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            <p className="text-3xl font-semibold" style={{ color: '#7ac090' }}>${(activeOrder.total_cents / 100).toFixed(2)}</p>
                            <p className="text-sm mt-1" style={{ color: '#6b7785' }}>Total</p>
                        </div>

                        <button
                            onClick={() => setActiveOrder(null)}
                            className="mt-8 w-full py-3.5 rounded-lg font-medium transition-colors"
                            style={{ background: '#e07848', color: 'white' }}
                            onMouseOver={(e) => e.currentTarget.style.background = '#c96a3d'}
                            onMouseOut={(e) => e.currentTarget.style.background = '#e07848'}
                        >
                            Start New Order
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Menu & Order View
    return (
        <div className="min-h-screen pb-32" style={{ background: '#0f1419', color: '#e2e8f0' }}>
            {/* Header */}
            <div
                className="sticky top-16 z-40"
                style={{
                    background: 'rgba(15, 20, 25, 0.9)',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    backdropFilter: 'blur(12px)'
                }}
            >
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <label className="block text-xs mb-1" style={{ color: '#6b7785' }}>Table</label>
                            <select
                                value={tableId}
                                onChange={(e) => setTableId(parseInt(e.target.value))}
                                className="w-full px-3 py-2 rounded-lg text-sm"
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    color: '#e2e8f0'
                                }}
                            >
                                {[1, 2, 3, 4, 5].map(n => (
                                    <option key={n} value={n}>Table {n}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs mb-1" style={{ color: '#6b7785' }}>Your Name</label>
                            <input
                                type="text"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                placeholder="Guest"
                                className="w-full px-3 py-2 rounded-lg text-sm"
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    color: '#e2e8f0'
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Menu */}
            <div className="container mx-auto px-4 py-6">
                {loading ? (
                    <div className="text-center py-12" style={{ color: '#6b7785' }}>Loading menu...</div>
                ) : (
                    <div className="space-y-8">
                        {menu.map((category) => (
                            <div key={category.id}>
                                <h2 className="text-lg font-semibold mb-4 pb-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', color: '#8aa8c8' }}>
                                    {category.name}
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {category.items.filter(item => item.is_available).map((item) => {
                                        const inCart = cart.find(i => i.menu_item_id === item.id);
                                        const hasModifiers = (item.modifier_group_ids || []).length > 0;
                                        return (
                                            <div
                                                key={item.id}
                                                className="card p-4 hover:border-amber-800/30 transition-all"
                                            >
                                                <div className="flex flex-col h-full">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h3 className="font-medium" style={{ color: '#e2e8f0' }}>{item.name}</h3>
                                                        <span className="font-semibold" style={{ color: '#7ac090' }}>
                                                            ${(item.price_cents / 100).toFixed(2)}
                                                            {hasModifiers && <span className="text-xs ml-1" style={{ color: '#e07848' }}>+</span>}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm mb-4 flex-1" style={{ color: '#6b7785' }}>{item.description}</p>

                                                    {inCart ? (
                                                        <div className="space-y-2">
                                                            {/* Show all cart entries for this item */}
                                                            {cart.filter(c => c.menu_item_id === item.id).map((cartItem, idx) => {
                                                                const modKey = (cartItem.selected_modifiers || []).map(m => m.id).sort().join('-');
                                                                return (
                                                                    <div key={idx} className="space-y-2 p-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)' }}>
                                                                        {cartItem.selected_modifiers && cartItem.selected_modifiers.length > 0 && (
                                                                            <div className="text-xs" style={{ color: '#e07848' }}>
                                                                                {cartItem.selected_modifiers.map(m => m.name).join(', ')}
                                                                            </div>
                                                                        )}
                                                                        <div className="flex items-center justify-between">
                                                                            <button
                                                                                onClick={() => removeFromCart(item.id, modKey)}
                                                                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                                                                                style={{ background: 'rgba(184, 86, 86, 0.2)', color: '#d07070' }}
                                                                            >
                                                                                <Minus className="w-4 h-4" strokeWidth={2} />
                                                                            </button>
                                                                            <span className="font-semibold">{cartItem.quantity}</span>
                                                                            <button
                                                                                onClick={() => hasModifiers ? openModifierModal(item) : addToCart(item, cartItem.selected_modifiers)}
                                                                                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                                                                                style={{ background: 'rgba(90, 154, 110, 0.2)', color: '#7ac090' }}
                                                                            >
                                                                                <Plus className="w-4 h-4" strokeWidth={2} />
                                                                            </button>
                                                                        </div>
                                                                        <input
                                                                            type="text"
                                                                            placeholder="Special request..."
                                                                            value={cartItem.instructions || ''}
                                                                            onChange={(e) => updateInstructions(item.id, modKey, e.target.value)}
                                                                            className="w-full px-2 py-1.5 rounded text-xs"
                                                                            style={{
                                                                                background: 'rgba(255,255,255,0.05)',
                                                                                border: '1px solid rgba(255,255,255,0.08)',
                                                                                color: '#e2e8f0'
                                                                            }}
                                                                        />
                                                                    </div>
                                                                );
                                                            })}
                                                            {hasModifiers && (
                                                                <button
                                                                    onClick={() => openModifierModal(item)}
                                                                    className="w-full py-2 rounded-lg text-xs flex items-center justify-center gap-1"
                                                                    style={{ background: 'rgba(224, 120, 72, 0.15)', color: '#e07848' }}
                                                                >
                                                                    <Settings2 className="w-3 h-3" />
                                                                    Add Another with Different Options
                                                                </button>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleItemClick(item)}
                                                            className="w-full py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                                            style={{ background: '#e07848', color: 'white' }}
                                                            onMouseOver={(e) => e.currentTarget.style.background = '#c96a3d'}
                                                            onMouseOut={(e) => e.currentTarget.style.background = '#e07848'}
                                                        >
                                                            {hasModifiers && <Settings2 className="w-4 h-4" />}
                                                            Add to Cart
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modifier Modal */}
            {showModifierModal && selectedItem && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.8)' }}
                    onClick={() => setShowModifierModal(false)}
                >
                    <div
                        className="w-full max-w-md rounded-xl p-6 max-h-[80vh] overflow-y-auto"
                        style={{ background: '#1e252d', border: '1px solid rgba(255,255,255,0.08)' }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">{selectedItem.name}</h3>
                            <button
                                onClick={() => setShowModifierModal(false)}
                                className="p-1 rounded-lg"
                                style={{ color: '#6b7785' }}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <p className="text-sm mb-4" style={{ color: '#6b7785' }}>
                            Base price: ${(selectedItem.price_cents / 100).toFixed(2)}
                        </p>

                        {(selectedItem.modifier_group_ids || []).map(groupId => {
                            const group = modifierGroups.find(g => g.id === groupId);
                            if (!group) return null;
                            return (
                                <div key={group.id} className="mb-6">
                                    <div className="flex items-center gap-2 mb-3">
                                        <h4 className="font-medium">{group.name}</h4>
                                        {group.is_required && (
                                            <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(224, 120, 72, 0.2)', color: '#e07848' }}>
                                                Required
                                            </span>
                                        )}
                                        <span className="text-xs" style={{ color: '#6b7785' }}>
                                            ({group.selection_type === 'single' ? 'Pick one' : 'Pick any'})
                                        </span>
                                    </div>
                                    <div className="space-y-2">
                                        {group.modifiers.map(mod => {
                                            const isSelected = tempModifiers.some(m => m.id === mod.id);
                                            return (
                                                <button
                                                    key={mod.id}
                                                    onClick={() => toggleModifier(group, mod.id)}
                                                    className="w-full flex items-center justify-between p-3 rounded-lg transition-colors"
                                                    style={{
                                                        background: isSelected ? 'rgba(90, 154, 110, 0.15)' : 'rgba(255,255,255,0.03)',
                                                        border: isSelected ? '1px solid rgba(90, 154, 110, 0.3)' : '1px solid rgba(255,255,255,0.06)'
                                                    }}
                                                >
                                                    <span style={{ color: isSelected ? '#7ac090' : '#e2e8f0' }}>{mod.name}</span>
                                                    {mod.price_cents > 0 && (
                                                        <span className="text-sm" style={{ color: '#7ac090' }}>
                                                            +${(mod.price_cents / 100).toFixed(2)}
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}

                        <div className="pt-4 mt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                            <div className="flex justify-between items-center mb-4">
                                <span style={{ color: '#6b7785' }}>Total:</span>
                                <span className="text-xl font-semibold" style={{ color: '#7ac090' }}>
                                    ${((selectedItem.price_cents + tempModifiers.reduce((s, m) => s + m.price_cents, 0)) / 100).toFixed(2)}
                                </span>
                            </div>
                            <button
                                onClick={handleAddWithModifiers}
                                className="w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2"
                                style={{ background: '#5a9a6e', color: 'white' }}
                            >
                                <Plus className="w-4 h-4" />
                                Add to Cart
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cart Footer */}
            {cart.length > 0 && (
                <div
                    className="fixed bottom-0 left-0 right-0 p-4"
                    style={{
                        background: 'rgba(15, 20, 25, 0.95)',
                        borderTop: '1px solid rgba(255,255,255,0.06)',
                        backdropFilter: 'blur(12px)'
                    }}
                >
                    <div className="container mx-auto max-w-lg mb-4 flex gap-2">
                        <div className="flex-1">
                            <input
                                type="tel"
                                placeholder="Phone for Points"
                                value={loyaltyPhone}
                                onChange={e => setLoyaltyPhone(e.target.value)}
                                onBlur={checkLoyalty}
                                className="w-full px-3 py-2 rounded-lg text-sm"
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    color: '#e2e8f0'
                                }}
                            />
                            {customerInfo && (
                                <p className="text-xs text-green-400 mt-1">Hello, {customerInfo.name}!</p>
                            )}
                        </div>
                        <div className="flex-1 flex gap-2">
                            <input
                                type="text"
                                placeholder="Promo Code"
                                value={promoCode}
                                onChange={e => setPromoCode(e.target.value.toUpperCase())}
                                className="w-full px-3 py-2 rounded-lg text-sm"
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    color: '#e2e8f0'
                                }}
                            />
                            <button
                                onClick={checkPromoCode}
                                className="px-3 rounded-lg text-sm font-medium"
                                style={{ background: '#8aa8c8', color: '#1e252d' }}
                            >
                                Apply
                            </button>
                        </div>
                    </div>
                    {promoError && (
                        <div className="container mx-auto max-w-lg mb-2 text-xs text-red-400">
                            {promoError}
                        </div>
                    )}
                    {appliedPromo && (
                        <div className="container mx-auto max-w-lg mb-2 text-xs text-green-400">
                            Promo applied: {appliedPromo.name}
                        </div>
                    )}

                    <div className="container mx-auto flex justify-between items-center">
                        <div>
                            <p className="font-medium text-lg">{cart.reduce((acc, i) => acc + i.quantity, 0)} items</p>
                            <div className="flex flex-col">
                                {appliedPromo && (
                                    <span className="text-sm line-through" style={{ color: '#6b7785' }}>
                                        ${(getCartTotal() / 100).toFixed(2)}
                                    </span>
                                )}
                                <span className="text-xl font-semibold" style={{ color: '#7ac090' }}>
                                    ${((getCartTotal() - (appliedPromo ? appliedPromo.discount_cents : 0)) / 100).toFixed(2)}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={placeOrder}
                            className="px-6 py-3.5 rounded-lg font-medium flex items-center gap-2 transition-colors"
                            style={{ background: '#5a9a6e', color: 'white' }}
                            onMouseOver={(e) => e.currentTarget.style.background = '#4a8a5e'}
                            onMouseOut={(e) => e.currentTarget.style.background = '#5a9a6e'}
                        >
                            <Send className="w-4 h-4" strokeWidth={2} />
                            Place Order
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
