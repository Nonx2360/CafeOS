export interface Modifier {
    id: number;
    name: string;
    price_cents: number;
    is_default: boolean;
    order_index: number;
}

export interface ModifierGroup {
    id: number;
    name: string;
    selection_type: 'single' | 'multiple';
    is_required: boolean;
    modifiers: Modifier[];
}

export interface MenuItem {
    id: number;
    name: string;
    description?: string;
    price_cents: number;
    category_id?: number;
    is_available: boolean;
    tags: string[];
    modifier_group_ids: number[];
}

export interface MenuCategory {
    id: number;
    name: string;
    items: MenuItem[];
}

export interface SelectedModifier {
    id: number;
    name: string;
    price_cents: number;
}

export interface OrderItem {
    id?: number;
    menu_item_id: number;
    name?: string; // For display
    quantity: number;
    unit_price_cents: number;
    modifier_price_cents?: number;
    instructions?: string;
    selected_modifiers?: SelectedModifier[];
}

export interface Order {
    id: number;
    order_number: string;
    table_id?: number;
    customer_name?: string;
    status: 'pending' | 'accepted' | 'preparing' | 'ready' | 'served' | 'cancelled' | 'paid';
    total_cents: number;
    discount_cents?: number;
    created_at: string;
    items: OrderItem[];
}

