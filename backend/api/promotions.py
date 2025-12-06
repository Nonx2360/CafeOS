from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.db import get_session
from backend.models import Promotion, PromotionType, Customer, LoyaltyTransaction, Order
from datetime import datetime
from pydantic import BaseModel

router = APIRouter(prefix="/api/promotions", tags=["promotions"])


class PromotionCreate(BaseModel):
    code: str
    name: str
    type: str = "percentage"
    value: int = 0
    min_order_cents: int = 0
    max_discount_cents: Optional[int] = None
    valid_from: Optional[str] = None
    valid_to: Optional[str] = None
    usage_limit: Optional[int] = None


class PromotionResponse(BaseModel):
    id: int
    code: str
    name: str
    type: str
    value: int
    min_order_cents: int
    max_discount_cents: Optional[int] = None
    valid_from: Optional[datetime] = None
    valid_to: Optional[datetime] = None
    usage_limit: Optional[int] = None
    times_used: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ================== PROMOTIONS ==================

@router.get("/", response_model=List[PromotionResponse])
async def get_promotions(session: AsyncSession = Depends(get_session)):
    """Get all promotions"""
    statement = select(Promotion).order_by(Promotion.created_at.desc())
    result = await session.execute(statement)
    return result.scalars().all()


@router.post("/", response_model=PromotionResponse)
async def create_promotion(data: PromotionCreate, session: AsyncSession = Depends(get_session)):
    """Create a new promotion"""
    # Check if code exists
    statement = select(Promotion).where(Promotion.code == data.code.upper())
    result = await session.execute(statement)
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Promo code already exists")
    
    promo = Promotion(
        code=data.code.upper(),
        name=data.name,
        type=data.type,
        value=data.value,
        min_order_cents=data.min_order_cents,
        max_discount_cents=data.max_discount_cents,
        valid_from=datetime.fromisoformat(data.valid_from) if data.valid_from else None,
        valid_to=datetime.fromisoformat(data.valid_to) if data.valid_to else None,
        usage_limit=data.usage_limit,
        is_active=True
    )
    session.add(promo)
    await session.commit()
    await session.refresh(promo)
    return promo


@router.put("/{promo_id}", response_model=PromotionResponse)
async def update_promotion(promo_id: int, data: PromotionCreate, session: AsyncSession = Depends(get_session)):
    """Update a promotion"""
    promo = await session.get(Promotion, promo_id)
    if not promo:
        raise HTTPException(status_code=404, detail="Promotion not found")
    
    promo.code = data.code.upper()
    promo.name = data.name
    promo.type = data.type
    promo.value = data.value
    promo.min_order_cents = data.min_order_cents
    promo.max_discount_cents = data.max_discount_cents
    promo.valid_from = datetime.fromisoformat(data.valid_from) if data.valid_from else None
    promo.valid_to = datetime.fromisoformat(data.valid_to) if data.valid_to else None
    promo.usage_limit = data.usage_limit
    
    await session.commit()
    await session.refresh(promo)
    return promo


@router.delete("/{promo_id}")
async def delete_promotion(promo_id: int, session: AsyncSession = Depends(get_session)):
    """Deactivate a promotion"""
    promo = await session.get(Promotion, promo_id)
    if not promo:
        raise HTTPException(status_code=404, detail="Promotion not found")
    
    promo.is_active = False
    await session.commit()
    return {"message": "Promotion deactivated"}


@router.post("/validate")
async def validate_promo_code(
    code: str,
    order_total_cents: int,
    session: AsyncSession = Depends(get_session)
):
    """Validate a promo code and calculate discount"""
    statement = select(Promotion).where(
        Promotion.code == code.upper(),
        Promotion.is_active == True
    )
    result = await session.execute(statement)
    promo = result.scalar_one_or_none()
    
    if not promo:
        raise HTTPException(status_code=404, detail="Invalid promo code")
    
    # Check validity dates
    now = datetime.utcnow()
    if promo.valid_from and now < promo.valid_from:
        raise HTTPException(status_code=400, detail="Promo code not yet active")
    if promo.valid_to and now > promo.valid_to:
        raise HTTPException(status_code=400, detail="Promo code expired")
    
    # Check usage limit
    if promo.usage_limit and promo.times_used >= promo.usage_limit:
        raise HTTPException(status_code=400, detail="Promo code usage limit reached")
    
    # Check minimum order
    if order_total_cents < promo.min_order_cents:
        raise HTTPException(
            status_code=400, 
            detail=f"Minimum order of ${promo.min_order_cents / 100:.2f} required"
        )
    
    # Calculate discount
    if promo.type == "percentage":
        discount = int(order_total_cents * promo.value / 100)
    else:  # fixed
        discount = promo.value
    
    # Apply max discount cap
    if promo.max_discount_cents and discount > promo.max_discount_cents:
        discount = promo.max_discount_cents
    
    return {
        "valid": True,
        "code": promo.code,
        "name": promo.name,
        "discount_cents": discount,
        "new_total_cents": order_total_cents - discount
    }


# ================== LOYALTY ==================

class CustomerCreate(BaseModel):
    phone: str
    name: Optional[str] = None


@router.get("/loyalty/{phone}")
async def get_customer_loyalty(phone: str, session: AsyncSession = Depends(get_session)):
    """Get customer loyalty info by phone"""
    statement = select(Customer).where(Customer.phone == phone)
    result = await session.execute(statement)
    customer = result.scalar_one_or_none()
    
    if not customer:
        return {"found": False}
    
    return {
        "found": True,
        "id": customer.id,
        "phone": customer.phone,
        "name": customer.name,
        "points": customer.points,
        "stamps": customer.stamps,
        "tier": customer.tier
    }


@router.post("/loyalty/register")
async def register_customer(data: CustomerCreate, session: AsyncSession = Depends(get_session)):
    """Register a new customer for loyalty program"""
    # Check if phone exists
    statement = select(Customer).where(Customer.phone == data.phone)
    result = await session.execute(statement)
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Phone already registered")
    
    customer = Customer(phone=data.phone, name=data.name)
    session.add(customer)
    await session.commit()
    await session.refresh(customer)
    
    return {
        "id": customer.id,
        "phone": customer.phone,
        "name": customer.name,
        "points": customer.points,
        "stamps": customer.stamps
    }


@router.post("/loyalty/{customer_id}/earn")
async def earn_points(
    customer_id: int,
    order_id: int,
    amount_cents: int,
    session: AsyncSession = Depends(get_session)
):
    """Earn points from an order (1 point per $1)"""
    customer = await session.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    points_earned = amount_cents // 100  # 1 point per $1
    stamps_earned = 1  # 1 stamp per order
    
    customer.points += points_earned
    customer.stamps += stamps_earned
    
    # Update tier
    if customer.points >= 500:
        customer.tier = "gold"
    elif customer.points >= 200:
        customer.tier = "silver"
    
    # Record transaction
    transaction = LoyaltyTransaction(
        customer_id=customer_id,
        order_id=order_id,
        points_earned=points_earned,
        stamps_earned=stamps_earned
    )
    session.add(transaction)
    
    await session.commit()
    await session.refresh(customer)
    
    return {
        "points_earned": points_earned,
        "stamps_earned": stamps_earned,
        "total_points": customer.points,
        "total_stamps": customer.stamps,
        "tier": customer.tier
    }


@router.post("/loyalty/{customer_id}/redeem")
async def redeem_points(
    customer_id: int,
    points_to_redeem: int,
    session: AsyncSession = Depends(get_session)
):
    """Redeem points for discount (100 points = $1)"""
    customer = await session.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    if customer.points < points_to_redeem:
        raise HTTPException(status_code=400, detail="Not enough points")
    
    discount_cents = points_to_redeem  # 100 points = $1 = 100 cents
    customer.points -= points_to_redeem
    
    transaction = LoyaltyTransaction(
        customer_id=customer_id,
        points_redeemed=points_to_redeem
    )
    session.add(transaction)
    
    await session.commit()
    await session.refresh(customer)
    
    return {
        "points_redeemed": points_to_redeem,
        "discount_cents": discount_cents,
        "remaining_points": customer.points
    }
