from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select, SQLModel
from sqlalchemy.ext.asyncio import AsyncSession
from backend.db import get_session
from backend.models import MenuCategory, MenuItem, Order, OrderItem, OrderStatus, ModifierGroup, Modifier
from datetime import datetime
import socketio
from pydantic import BaseModel

router = APIRouter(prefix="/api/orders", tags=["orders"])

from backend.socket_manager import sio

# Response schemas for proper serialization
class MenuItemResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    price_cents: int
    is_available: bool
    tags: List[str] = []
    modifier_group_ids: List[int] = []

    class Config:
        from_attributes = True

class MenuCategoryResponse(BaseModel):
    id: int
    name: str
    order_index: int
    items: List[MenuItemResponse] = []

    class Config:
        from_attributes = True

class OrderItemResponse(BaseModel):
    id: int
    order_id: int
    menu_item_id: int
    quantity: int
    unit_price_cents: int
    modifier_price_cents: int = 0
    instructions: Optional[str] = None
    selected_modifiers: List[dict] = []

    class Config:
        from_attributes = True

class OrderResponse(BaseModel):
    id: int
    order_number: str
    table_id: Optional[int] = None
    customer_name: Optional[str] = None
    status: str
    total_cents: int
    discount_cents: int = 0
    created_at: datetime
    updated_at: datetime
    items: List[OrderItemResponse] = []

    class Config:
        from_attributes = True

async def emit_order_created(order: Order):
    # Convert order to dict or JSON-compatible format
    # For simplicity, we'll send a basic payload. 
    # In a real app, use Pydantic's .dict() or similar.
    payload = {
        "id": order.id,
        "order_number": order.order_number,
        "status": order.status,
        "total_cents": order.total_cents,
        "table_id": order.table_id
    }
    await sio.emit("order_created", payload)

@router.get("/menu", response_model=List[MenuCategoryResponse])
async def get_public_menu(session: AsyncSession = Depends(get_session)):
    from sqlalchemy.orm import selectinload
    statement = select(MenuCategory).options(selectinload(MenuCategory.items)).order_by(MenuCategory.order_index)
    result = await session.execute(statement)
    categories = result.unique().scalars().all()
    
    # Convert to response format
    response = []
    for category in categories:
        items_data = [
            MenuItemResponse(
                id=item.id,
                name=item.name,
                description=item.description,
                price_cents=item.price_cents,
                is_available=item.is_available,
                tags=item.tags or [],
                modifier_group_ids=item.modifier_group_ids or []
            )
            for item in category.items
        ]
        response.append(MenuCategoryResponse(
            id=category.id,
            name=category.name,
            order_index=category.order_index,
            items=items_data
        ))
    return response

class SelectedModifier(BaseModel):
    id: int
    name: str
    price_cents: int = 0

class OrderCreateItem(SQLModel):
    menu_item_id: int
    quantity: int
    instructions: str = None
    selected_modifiers: List[dict] = []  # [{"id": 1, "name": "Large", "price_cents": 100}]

class OrderCreate(SQLModel):
    table_id: int
    items: List[OrderCreateItem]
    customer_name: str = "Guest"

@router.post("/", response_model=Order)
async def create_order(order_data: OrderCreate, session: AsyncSession = Depends(get_session)):
    # Calculate total and verify items
    total_cents = 0
    new_order_items = []
    
    for item_data in order_data.items:
        menu_item = await session.get(MenuItem, item_data.menu_item_id)
        if not menu_item:
            raise HTTPException(status_code=404, detail=f"Menu item {item_data.menu_item_id} not found")
        
        # Calculate modifier price
        modifier_price = 0
        if item_data.selected_modifiers:
            for mod in item_data.selected_modifiers:
                modifier_price += mod.get('price_cents', 0)
        
        # Total for this item: (base price + modifier price) * quantity
        item_total = (menu_item.price_cents + modifier_price) * item_data.quantity
        total_cents += item_total
        
        new_order_item = OrderItem(
            menu_item_id=menu_item.id,
            quantity=item_data.quantity,
            unit_price_cents=menu_item.price_cents,
            modifier_price_cents=modifier_price,
            instructions=item_data.instructions,
            selected_modifiers=item_data.selected_modifiers
        )
        new_order_items.append(new_order_item)

    # Generate Order Number (simplistic)
    order_number = f"ORD-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{order_data.table_id}"
    
    new_order = Order(
        order_number=order_number,
        table_id=order_data.table_id,
        customer_name=order_data.customer_name,
        status=OrderStatus.PENDING,
        total_cents=total_cents,
        items=new_order_items
    )
    
    session.add(new_order)
    await session.commit()
    await session.refresh(new_order)
    
    await emit_order_created(new_order)
    
    return new_order

@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(order_id: int, session: AsyncSession = Depends(get_session)):
    from sqlalchemy.orm import selectinload
    statement = select(Order).where(Order.id == order_id).options(selectinload(Order.items))
    result = await session.execute(statement)
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order
