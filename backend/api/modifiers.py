from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from backend.db import get_session
from backend.models import ModifierGroup, Modifier
from pydantic import BaseModel

router = APIRouter(prefix="/api/modifiers", tags=["modifiers"])


# Response schemas
class ModifierResponse(BaseModel):
    id: int
    name: str
    price_cents: int
    is_default: bool
    order_index: int

    class Config:
        from_attributes = True


class ModifierGroupResponse(BaseModel):
    id: int
    name: str
    selection_type: str
    is_required: bool
    modifiers: List[ModifierResponse] = []

    class Config:
        from_attributes = True


# Create schemas
class ModifierCreate(BaseModel):
    name: str
    price_cents: int = 0
    is_default: bool = False
    order_index: int = 0


class ModifierGroupCreate(BaseModel):
    name: str
    selection_type: str = "single"
    is_required: bool = False
    modifiers: List[ModifierCreate] = []


# ================== MODIFIER GROUPS ==================

@router.get("/groups", response_model=List[ModifierGroupResponse])
async def get_modifier_groups(session: AsyncSession = Depends(get_session)):
    """Get all modifier groups with their modifiers"""
    statement = select(ModifierGroup).options(selectinload(ModifierGroup.modifiers))
    result = await session.execute(statement)
    groups = result.unique().scalars().all()
    return groups


@router.get("/groups/{group_id}", response_model=ModifierGroupResponse)
async def get_modifier_group(group_id: int, session: AsyncSession = Depends(get_session)):
    """Get a specific modifier group"""
    statement = select(ModifierGroup).where(ModifierGroup.id == group_id).options(selectinload(ModifierGroup.modifiers))
    result = await session.execute(statement)
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Modifier group not found")
    return group


@router.post("/groups", response_model=ModifierGroupResponse)
async def create_modifier_group(data: ModifierGroupCreate, session: AsyncSession = Depends(get_session)):
    """Create a new modifier group with modifiers"""
    group = ModifierGroup(
        name=data.name,
        selection_type=data.selection_type,
        is_required=data.is_required
    )
    session.add(group)
    await session.flush()  # Get the group ID
    
    # Add modifiers
    for mod_data in data.modifiers:
        modifier = Modifier(
            group_id=group.id,
            name=mod_data.name,
            price_cents=mod_data.price_cents,
            is_default=mod_data.is_default,
            order_index=mod_data.order_index
        )
        session.add(modifier)
    
    await session.commit()
    await session.refresh(group)
    
    # Reload with modifiers
    statement = select(ModifierGroup).where(ModifierGroup.id == group.id).options(selectinload(ModifierGroup.modifiers))
    result = await session.execute(statement)
    return result.scalar_one()


@router.put("/groups/{group_id}", response_model=ModifierGroupResponse)
async def update_modifier_group(group_id: int, data: ModifierGroupCreate, session: AsyncSession = Depends(get_session)):
    """Update a modifier group"""
    group = await session.get(ModifierGroup, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Modifier group not found")
    
    group.name = data.name
    group.selection_type = data.selection_type
    group.is_required = data.is_required
    
    await session.commit()
    await session.refresh(group)
    
    statement = select(ModifierGroup).where(ModifierGroup.id == group_id).options(selectinload(ModifierGroup.modifiers))
    result = await session.execute(statement)
    return result.scalar_one()


@router.delete("/groups/{group_id}")
async def delete_modifier_group(group_id: int, session: AsyncSession = Depends(get_session)):
    """Delete a modifier group and its modifiers"""
    group = await session.get(ModifierGroup, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Modifier group not found")
    
    # Delete modifiers first
    statement = select(Modifier).where(Modifier.group_id == group_id)
    result = await session.execute(statement)
    for modifier in result.scalars().all():
        await session.delete(modifier)
    
    await session.delete(group)
    await session.commit()
    return {"deleted": True}


# ================== MODIFIERS ==================

@router.post("/groups/{group_id}/modifiers", response_model=ModifierResponse)
async def add_modifier(group_id: int, data: ModifierCreate, session: AsyncSession = Depends(get_session)):
    """Add a modifier to a group"""
    group = await session.get(ModifierGroup, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Modifier group not found")
    
    modifier = Modifier(
        group_id=group_id,
        name=data.name,
        price_cents=data.price_cents,
        is_default=data.is_default,
        order_index=data.order_index
    )
    session.add(modifier)
    await session.commit()
    await session.refresh(modifier)
    return modifier


@router.put("/modifiers/{modifier_id}", response_model=ModifierResponse)
async def update_modifier(modifier_id: int, data: ModifierCreate, session: AsyncSession = Depends(get_session)):
    """Update a modifier"""
    modifier = await session.get(Modifier, modifier_id)
    if not modifier:
        raise HTTPException(status_code=404, detail="Modifier not found")
    
    modifier.name = data.name
    modifier.price_cents = data.price_cents
    modifier.is_default = data.is_default
    modifier.order_index = data.order_index
    
    await session.commit()
    await session.refresh(modifier)
    return modifier


@router.delete("/modifiers/{modifier_id}")
async def delete_modifier(modifier_id: int, session: AsyncSession = Depends(get_session)):
    """Delete a modifier"""
    modifier = await session.get(Modifier, modifier_id)
    if not modifier:
        raise HTTPException(status_code=404, detail="Modifier not found")
    
    await session.delete(modifier)
    await session.commit()
    return {"deleted": True}
