from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime
from enum import Enum
from sqlalchemy import Column, String, JSON

class UserRole(str, Enum):
    ADMIN = "admin"
    MANAGER = "manager"
    STAFF = "staff"
    KITCHEN = "kitchen"
    CUSTOMER = "customer"

class OrderStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    PREPARING = "preparing"
    READY = "ready"
    SERVED = "served"
    CANCELLED = "cancelled"
    PAID = "paid"

class SelectionType(str, Enum):
    SINGLE = "single"      # Radio buttons - pick one
    MULTIPLE = "multiple"  # Checkboxes - pick multiple

class User(SQLModel, table=True):
    __tablename__ = "users"
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(unique=True, index=True)
    password_hash: str
    role: UserRole = Field(default=UserRole.STAFF)
    is_active: bool = Field(default=True)
    pin_code: Optional[str] = None  # For quick staff login
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Table(SQLModel, table=True):
    __tablename__ = "tables"
    id: Optional[int] = Field(default=None, primary_key=True)
    number: str = Field(unique=True)
    capacity: int = Field(default=4)
    is_active: bool = Field(default=True)

class MenuCategory(SQLModel, table=True):
    __tablename__ = "menu_categories"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    order_index: int = Field(default=0)
    items: List["MenuItem"] = Relationship(back_populates="category")

# Link table for MenuItem <-> ModifierGroup many-to-many
class MenuItemModifierGroupLink(SQLModel, table=True):
    __tablename__ = "menu_item_modifier_group_links"
    menu_item_id: Optional[int] = Field(default=None, foreign_key="menu_items.id", primary_key=True)
    modifier_group_id: Optional[int] = Field(default=None, foreign_key="modifier_groups.id", primary_key=True)

class ModifierGroup(SQLModel, table=True):
    """Groups of modifiers like 'Size', 'Sweetness', 'Toppings'"""
    __tablename__ = "modifier_groups"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str  # e.g., "Size", "Sweetness Level", "Add-ons"
    selection_type: SelectionType = Field(default=SelectionType.SINGLE)
    is_required: bool = Field(default=False)
    modifiers: List["Modifier"] = Relationship(back_populates="group")

class Modifier(SQLModel, table=True):
    """Individual modifier options like 'Large +$1', '50% Sweet'"""
    __tablename__ = "modifiers"
    id: Optional[int] = Field(default=None, primary_key=True)
    group_id: Optional[int] = Field(default=None, foreign_key="modifier_groups.id")
    group: Optional[ModifierGroup] = Relationship(back_populates="modifiers")
    name: str  # e.g., "Large", "50% Sweet", "Boba"
    price_cents: int = Field(default=0)  # Additional price
    is_default: bool = Field(default=False)  # Pre-selected option
    order_index: int = Field(default=0)

class MenuItem(SQLModel, table=True):
    __tablename__ = "menu_items"
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    description: Optional[str] = None
    price_cents: int
    category_id: Optional[int] = Field(default=None, foreign_key="menu_categories.id")
    category: Optional[MenuCategory] = Relationship(back_populates="items")
    is_available: bool = Field(default=True)
    tags: List[str] = Field(default=[], sa_column=Column(JSON))
    # Store modifier group IDs as JSON for simplicity
    modifier_group_ids: List[int] = Field(default=[], sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Order(SQLModel, table=True):
    __tablename__ = "orders"
    id: Optional[int] = Field(default=None, primary_key=True)
    order_number: str = Field(unique=True, index=True)
    table_id: Optional[int] = Field(default=None, foreign_key="tables.id")
    customer_name: Optional[str] = None
    status: OrderStatus = Field(default=OrderStatus.PENDING)
    total_cents: int = Field(default=0)
    discount_cents: int = Field(default=0)  # For promotions
    promo_code: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    items: List["OrderItem"] = Relationship(back_populates="order")

class OrderItem(SQLModel, table=True):
    __tablename__ = "order_items"
    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: Optional[int] = Field(default=None, foreign_key="orders.id")
    order: Optional[Order] = Relationship(back_populates="items")
    menu_item_id: Optional[int] = Field(default=None, foreign_key="menu_items.id")
    quantity: int = Field(default=1)
    unit_price_cents: int  # Base price
    modifier_price_cents: int = Field(default=0)  # Additional modifier price
    instructions: Optional[str] = None
    # Store selected modifiers as JSON: [{"id": 1, "name": "Large", "price": 100}, ...]
    selected_modifiers: List[dict] = Field(default=[], sa_column=Column(JSON))

class Receipt(SQLModel, table=True):
    __tablename__ = "receipts"
    id: Optional[int] = Field(default=None, primary_key=True)
    order_id: Optional[int] = Field(default=None, foreign_key="orders.id")
    receipt_pdf: Optional[bytes] = None
    printed: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Shift Management
class Shift(SQLModel, table=True):
    __tablename__ = "shifts"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: Optional[int] = Field(default=None, foreign_key="users.id")
    clock_in: datetime = Field(default_factory=datetime.utcnow)
    clock_out: Optional[datetime] = None
    notes: Optional[str] = None

# Customer & Loyalty
class Customer(SQLModel, table=True):
    __tablename__ = "customers"
    id: Optional[int] = Field(default=None, primary_key=True)
    phone: str = Field(unique=True, index=True)
    name: Optional[str] = None
    points: int = Field(default=0)
    stamps: int = Field(default=0)
    tier: str = Field(default="bronze")  # bronze, silver, gold
    created_at: datetime = Field(default_factory=datetime.utcnow)

class LoyaltyTransaction(SQLModel, table=True):
    __tablename__ = "loyalty_transactions"
    id: Optional[int] = Field(default=None, primary_key=True)
    customer_id: Optional[int] = Field(default=None, foreign_key="customers.id")
    order_id: Optional[int] = Field(default=None, foreign_key="orders.id")
    points_earned: int = Field(default=0)
    points_redeemed: int = Field(default=0)
    stamps_earned: int = Field(default=0)
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Promotions
class PromotionType(str, Enum):
    PERCENTAGE = "percentage"  # 10% off
    FIXED = "fixed"           # $5 off
    BOGO = "bogo"             # Buy one get one

class Promotion(SQLModel, table=True):
    __tablename__ = "promotions"
    id: Optional[int] = Field(default=None, primary_key=True)
    code: str = Field(unique=True, index=True)
    name: str
    type: PromotionType = Field(default=PromotionType.PERCENTAGE)
    value: int = Field(default=0)  # Percentage or cents
    min_order_cents: int = Field(default=0)
    max_discount_cents: Optional[int] = None
    valid_from: Optional[datetime] = None
    valid_to: Optional[datetime] = None
    usage_limit: Optional[int] = None
    times_used: int = Field(default=0)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

