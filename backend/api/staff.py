from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.db import get_session
from backend.models import User, UserRole, Shift
from datetime import datetime
from pydantic import BaseModel

router = APIRouter(prefix="/api/staff", tags=["staff"])


class StaffLogin(BaseModel):
    username: str
    password: str


class StaffPinLogin(BaseModel):
    pin_code: str


class StaffCreate(BaseModel):
    username: str
    password: str
    role: str = "staff"
    pin_code: Optional[str] = None


class StaffResponse(BaseModel):
    id: int
    username: str
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class ShiftResponse(BaseModel):
    id: int
    user_id: int
    clock_in: datetime
    clock_out: Optional[datetime] = None
    notes: Optional[str] = None

    class Config:
        from_attributes = True


# ================== AUTHENTICATION ==================

@router.post("/login")
async def staff_login(data: StaffLogin, session: AsyncSession = Depends(get_session)):
    """Login with username and password"""
    statement = select(User).where(User.username == data.username)
    result = await session.execute(statement)
    user = result.scalar_one_or_none()
    
    if not user or user.password_hash != data.password:  # In production, use proper password hashing!
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")
    
    return {
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "message": "Login successful"
    }


@router.post("/login/pin")
async def staff_pin_login(data: StaffPinLogin, session: AsyncSession = Depends(get_session)):
    """Quick login with PIN code"""
    statement = select(User).where(User.pin_code == data.pin_code)
    result = await session.execute(statement)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid PIN")
    
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")
    
    return {
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "message": "Login successful"
    }


# ================== STAFF MANAGEMENT ==================

@router.get("/", response_model=List[StaffResponse])
async def get_all_staff(session: AsyncSession = Depends(get_session)):
    """Get all staff members"""
    statement = select(User).where(User.role != UserRole.CUSTOMER)
    result = await session.execute(statement)
    return result.scalars().all()


@router.post("/", response_model=StaffResponse)
async def create_staff(data: StaffCreate, session: AsyncSession = Depends(get_session)):
    """Create a new staff member"""
    # Check if username exists
    statement = select(User).where(User.username == data.username)
    result = await session.execute(statement)
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already exists")
    
    user = User(
        username=data.username,
        password_hash=data.password,  # In production, hash this!
        role=data.role,
        pin_code=data.pin_code,
        is_active=True
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)
    return user


@router.put("/{user_id}", response_model=StaffResponse)
async def update_staff(user_id: int, data: StaffCreate, session: AsyncSession = Depends(get_session)):
    """Update a staff member"""
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    user.username = data.username
    if data.password:
        user.password_hash = data.password
    user.role = data.role
    user.pin_code = data.pin_code
    
    await session.commit()
    await session.refresh(user)
    return user


@router.delete("/{user_id}")
async def delete_staff(user_id: int, session: AsyncSession = Depends(get_session)):
    """Deactivate a staff member"""
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    user.is_active = False
    await session.commit()
    return {"message": "Staff deactivated"}


# ================== SHIFT MANAGEMENT ==================

@router.post("/{user_id}/clock-in", response_model=ShiftResponse)
async def clock_in(user_id: int, session: AsyncSession = Depends(get_session)):
    """Clock in for a shift"""
    user = await session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    # Check if already clocked in
    statement = select(Shift).where(
        Shift.user_id == user_id,
        Shift.clock_out == None
    )
    result = await session.execute(statement)
    active_shift = result.scalar_one_or_none()
    
    if active_shift:
        raise HTTPException(status_code=400, detail="Already clocked in")
    
    shift = Shift(user_id=user_id)
    session.add(shift)
    await session.commit()
    await session.refresh(shift)
    return shift


@router.post("/{user_id}/clock-out", response_model=ShiftResponse)
async def clock_out(user_id: int, notes: str = "", session: AsyncSession = Depends(get_session)):
    """Clock out from current shift"""
    statement = select(Shift).where(
        Shift.user_id == user_id,
        Shift.clock_out == None
    )
    result = await session.execute(statement)
    shift = result.scalar_one_or_none()
    
    if not shift:
        raise HTTPException(status_code=400, detail="No active shift found")
    
    shift.clock_out = datetime.utcnow()
    shift.notes = notes
    await session.commit()
    await session.refresh(shift)
    return shift


@router.get("/{user_id}/shifts", response_model=List[ShiftResponse])
async def get_user_shifts(user_id: int, session: AsyncSession = Depends(get_session)):
    """Get all shifts for a user"""
    statement = select(Shift).where(Shift.user_id == user_id).order_by(Shift.clock_in.desc())
    result = await session.execute(statement)
    return result.scalars().all()


@router.get("/{user_id}/current-shift")
async def get_current_shift(user_id: int, session: AsyncSession = Depends(get_session)):
    """Get current active shift"""
    statement = select(Shift).where(
        Shift.user_id == user_id,
        Shift.clock_out == None
    )
    result = await session.execute(statement)
    shift = result.scalar_one_or_none()
    
    if not shift:
        return {"active": False}
    
    duration = datetime.utcnow() - shift.clock_in
    hours = duration.total_seconds() / 3600
    
    return {
        "active": True,
        "shift_id": shift.id,
        "clock_in": shift.clock_in.isoformat(),
        "hours_worked": round(hours, 2)
    }


@router.get("/shifts/all", response_model=List[dict])
async def get_all_shifts(
    from_date: str = None,
    to_date: str = None,
    session: AsyncSession = Depends(get_session)
):
    """Get all shifts with optional date filter"""
    statement = select(Shift).order_by(Shift.clock_in.desc())
    result = await session.execute(statement)
    shifts = result.scalars().all()
    
    # Get user info for each shift
    shift_data = []
    for shift in shifts:
        user = await session.get(User, shift.user_id)
        hours = 0
        if shift.clock_out:
            duration = shift.clock_out - shift.clock_in
            hours = round(duration.total_seconds() / 3600, 2)
        else:
            duration = datetime.utcnow() - shift.clock_in
            hours = round(duration.total_seconds() / 3600, 2)
        
        shift_data.append({
            "id": shift.id,
            "user_id": shift.user_id,
            "username": user.username if user else "Unknown",
            "clock_in": shift.clock_in.isoformat(),
            "clock_out": shift.clock_out.isoformat() if shift.clock_out else None,
            "hours_worked": hours,
            "notes": shift.notes
        })
    
    return shift_data
