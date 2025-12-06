from typing import List
from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from backend.db import get_session
from backend.models import MenuCategory, MenuItem, Table, User, Order, OrderStatus
from .auth import get_current_admin_user

router = APIRouter(prefix="/api/admin", tags=["admin"])

# ================== PUBLIC STATS (for demo) ==================

@router.get("/stats")
async def get_stats(session: AsyncSession = Depends(get_session)):
    """Get dashboard statistics - public for demo"""
    # Total orders today
    today_start = datetime.combine(date.today(), datetime.min.time())
    
    # All orders
    orders_result = await session.execute(select(Order))
    all_orders = orders_result.scalars().all()
    
    # Today's orders
    today_orders = [o for o in all_orders if o.created_at >= today_start]
    
    # Calculate stats
    total_sales_today = sum(o.total_cents for o in today_orders)
    total_orders_today = len(today_orders)
    pending_orders = len([o for o in all_orders if o.status in [OrderStatus.PENDING, OrderStatus.PREPARING]])
    
    # Top selling items (simplified)
    top_items = []
    
    return {
        "totalSales": total_sales_today,
        "totalOrders": total_orders_today,
        "pendingOrders": pending_orders,
        "topItems": top_items
    }

# ================== MENU CATEGORIES ==================

@router.get("/categories", response_model=List[MenuCategory])
async def get_categories(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(MenuCategory).order_by(MenuCategory.order_index))
    return result.scalars().all()

@router.post("/categories", response_model=MenuCategory)
async def create_category(category: MenuCategory, session: AsyncSession = Depends(get_session)):
    session.add(category)
    await session.commit()
    await session.refresh(category)
    return category

@router.put("/categories/{category_id}", response_model=MenuCategory)
async def update_category(category_id: int, category_update: MenuCategory, session: AsyncSession = Depends(get_session)):
    db_category = await session.get(MenuCategory, category_id)
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    db_category.name = category_update.name
    db_category.order_index = category_update.order_index
    
    session.add(db_category)
    await session.commit()
    await session.refresh(db_category)
    return db_category

@router.delete("/categories/{category_id}")
async def delete_category(category_id: int, session: AsyncSession = Depends(get_session)):
    db_category = await session.get(MenuCategory, category_id)
    if not db_category:
        raise HTTPException(status_code=404, detail="Category not found")
    
    await session.delete(db_category)
    await session.commit()
    return {"deleted": True}

# ================== MENU ITEMS ==================

@router.get("/menu", response_model=List[MenuItem])
async def get_menu_items(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(MenuItem).options(selectinload(MenuItem.category)))
    return result.scalars().all()

@router.post("/menu", response_model=MenuItem)
async def create_menu_item(item: MenuItem, session: AsyncSession = Depends(get_session)):
    session.add(item)
    await session.commit()
    await session.refresh(item)
    return item

@router.put("/menu/{item_id}", response_model=MenuItem)
async def update_menu_item(item_id: int, item_update: MenuItem, session: AsyncSession = Depends(get_session)):
    db_item = await session.get(MenuItem, item_id)
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    db_item.name = item_update.name
    db_item.description = item_update.description
    db_item.price_cents = item_update.price_cents
    db_item.category_id = item_update.category_id
    db_item.is_available = item_update.is_available
    db_item.tags = item_update.tags
        
    session.add(db_item)
    await session.commit()
    await session.refresh(db_item)
    return db_item

@router.delete("/menu/{item_id}")
async def delete_menu_item(item_id: int, session: AsyncSession = Depends(get_session)):
    db_item = await session.get(MenuItem, item_id)
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    await session.delete(db_item)
    await session.commit()
    return {"deleted": True}

# ================== TABLES ==================

@router.get("/tables", response_model=List[Table])
async def get_tables(session: AsyncSession = Depends(get_session)):
    result = await session.execute(select(Table).order_by(Table.number))
    return result.scalars().all()

@router.post("/tables", response_model=Table)
async def create_table(table: Table, session: AsyncSession = Depends(get_session)):
    session.add(table)
    await session.commit()
    await session.refresh(table)
    return table

@router.put("/tables/{table_id}", response_model=Table)
async def update_table(table_id: int, table_update: Table, session: AsyncSession = Depends(get_session)):
    db_table = await session.get(Table, table_id)
    if not db_table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    db_table.number = table_update.number
    db_table.capacity = table_update.capacity
    db_table.is_active = table_update.is_active
    
    session.add(db_table)
    await session.commit()
    await session.refresh(db_table)
    return db_table

@router.delete("/tables/{table_id}")
async def delete_table(table_id: int, session: AsyncSession = Depends(get_session)):
    db_table = await session.get(Table, table_id)
    if not db_table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    await session.delete(db_table)
    await session.commit()
    return {"deleted": True}

# ================== ORDERS ==================

@router.get("/orders", response_model=List[Order])
async def get_all_orders(status: OrderStatus = None, session: AsyncSession = Depends(get_session)):
    if status:
        statement = select(Order).where(Order.status == status).options(selectinload(Order.items)).order_by(Order.created_at.desc())
    else:
        statement = select(Order).options(selectinload(Order.items)).order_by(Order.created_at.desc())
    result = await session.execute(statement)
    return result.scalars().all()
