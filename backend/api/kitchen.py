from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from backend.db import get_session
from backend.models import Order, OrderStatus, UserRole, OrderItem, MenuItem
from .auth import get_current_user
from backend.socket_manager import sio
from pydantic import BaseModel

router = APIRouter(prefix="/api/kitchen", tags=["kitchen"])

# Response schemas
class KitchenOrderItemResponse(BaseModel):
    id: int
    menu_item_id: int
    name: str
    quantity: int
    unit_price_cents: int
    instructions: Optional[str] = None

class KitchenOrderResponse(BaseModel):
    id: int
    order_number: str
    table_id: Optional[int]
    customer_name: Optional[str]
    status: str
    total_cents: int
    created_at: str
    updated_at: str
    items: List[KitchenOrderItemResponse]

async def get_kitchen_user(current_user = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.KITCHEN, UserRole.STAFF]:
        raise HTTPException(status_code=400, detail="Not authorized")
    return current_user

# Public endpoint for development/demo - get kitchen queue without auth
@router.get("/queue", response_model=List[KitchenOrderResponse])
async def get_kitchen_queue(session: AsyncSession = Depends(get_session)):
    """Get all active orders for kitchen display (public for demo)"""
    active_statuses = [OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.PREPARING, OrderStatus.READY]
    statement = select(Order).where(Order.status.in_(active_statuses)).options(selectinload(Order.items)).order_by(Order.created_at)
    result = await session.execute(statement)
    orders = result.scalars().all()
    
    # Enhance orders with menu item names
    response_orders = []
    for order in orders:
        items_response = []
        for item in order.items:
            menu_item = await session.get(MenuItem, item.menu_item_id)
            items_response.append(KitchenOrderItemResponse(
                id=item.id,
                menu_item_id=item.menu_item_id,
                name=menu_item.name if menu_item else f"Item #{item.menu_item_id}",
                quantity=item.quantity,
                unit_price_cents=item.unit_price_cents,
                instructions=item.instructions
            ))
        
        response_orders.append(KitchenOrderResponse(
            id=order.id,
            order_number=order.order_number,
            table_id=order.table_id,
            customer_name=order.customer_name,
            status=order.status.value,
            total_cents=order.total_cents,
            created_at=order.created_at.isoformat(),
            updated_at=order.updated_at.isoformat(),
            items=items_response
        ))
    
    return response_orders

@router.put("/orders/{order_id}/status")
async def update_order_status(order_id: int, status: OrderStatus, session: AsyncSession = Depends(get_session)):
    """Update order status (public for demo)"""
    statement = select(Order).where(Order.id == order_id).options(selectinload(Order.items))
    result = await session.execute(statement)
    order = result.scalar_one_or_none()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order.status = status
    order.updated_at = datetime.utcnow()
    
    session.add(order)
    await session.commit()
    await session.refresh(order)
    
    # Emit WebSocket event for real-time updates
    await sio.emit("order_updated", {"id": order.id, "status": order.status.value})
    
    return {"id": order.id, "status": order.status.value, "updated_at": order.updated_at.isoformat()}
