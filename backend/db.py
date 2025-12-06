from sqlmodel import SQLModel, create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
import os

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite+aiosqlite:///./cafe.db")

engine = create_async_engine(DATABASE_URL, echo=True, future=True)

async def init_db():
    async with engine.begin() as conn:
        # await conn.run_sync(SQLModel.metadata.drop_all)
        await conn.run_sync(SQLModel.metadata.create_all)

async def get_session() -> AsyncSession:
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    async with async_session() as session:
        yield session

async def seed_data():
    """Seed initial menu data if empty"""
    from .models import MenuCategory, MenuItem, Table, ModifierGroup, Modifier, SelectionType
    
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as session:
        # Check if data already exists
        from sqlmodel import select
        result = await session.execute(select(MenuCategory))
        if result.scalars().first():
            return  # Data already seeded
        
        # Create modifier groups
        size_group = ModifierGroup(name="Size", selection_type=SelectionType.SINGLE, is_required=True)
        sweetness_group = ModifierGroup(name="Sweetness", selection_type=SelectionType.SINGLE, is_required=False)
        toppings_group = ModifierGroup(name="Toppings", selection_type=SelectionType.MULTIPLE, is_required=False)
        
        session.add_all([size_group, sweetness_group, toppings_group])
        await session.flush()
        
        # Add size modifiers
        size_modifiers = [
            Modifier(group_id=size_group.id, name="Small", price_cents=0, is_default=True, order_index=0),
            Modifier(group_id=size_group.id, name="Medium", price_cents=50, order_index=1),
            Modifier(group_id=size_group.id, name="Large", price_cents=100, order_index=2),
        ]
        
        # Add sweetness modifiers
        sweetness_modifiers = [
            Modifier(group_id=sweetness_group.id, name="0% (No Sugar)", price_cents=0, order_index=0),
            Modifier(group_id=sweetness_group.id, name="25%", price_cents=0, order_index=1),
            Modifier(group_id=sweetness_group.id, name="50%", price_cents=0, order_index=2),
            Modifier(group_id=sweetness_group.id, name="75%", price_cents=0, order_index=3),
            Modifier(group_id=sweetness_group.id, name="100% (Normal)", price_cents=0, is_default=True, order_index=4),
        ]
        
        # Add toppings modifiers
        toppings_modifiers = [
            Modifier(group_id=toppings_group.id, name="Boba Pearls", price_cents=50, order_index=0),
            Modifier(group_id=toppings_group.id, name="Whipped Cream", price_cents=30, order_index=1),
            Modifier(group_id=toppings_group.id, name="Extra Shot", price_cents=70, order_index=2),
            Modifier(group_id=toppings_group.id, name="Oat Milk", price_cents=50, order_index=3),
            Modifier(group_id=toppings_group.id, name="Caramel Drizzle", price_cents=30, order_index=4),
        ]
        
        session.add_all(size_modifiers + sweetness_modifiers + toppings_modifiers)
        await session.flush()
        
        # Create categories
        beverages = MenuCategory(name="Beverages", order_index=1)
        coffee = MenuCategory(name="Coffee", order_index=2)
        pastries = MenuCategory(name="Pastries", order_index=3)
        breakfast = MenuCategory(name="Breakfast", order_index=4)
        
        session.add_all([beverages, coffee, pastries, breakfast])
        await session.commit()
        await session.refresh(beverages)
        await session.refresh(coffee)
        await session.refresh(pastries)
        await session.refresh(breakfast)
        await session.refresh(size_group)
        await session.refresh(sweetness_group)
        await session.refresh(toppings_group)
        
        # Create menu items with modifier groups
        # Coffee items get size, sweetness, and toppings
        coffee_modifier_ids = [size_group.id, sweetness_group.id, toppings_group.id]
        # Beverages get size and sweetness
        beverage_modifier_ids = [size_group.id, sweetness_group.id]
        
        items = [
            # Beverages (with size and sweetness options)
            MenuItem(name="Fresh Orange Juice", description="Freshly squeezed orange juice", price_cents=450, category_id=beverages.id, tags=["fresh", "healthy"], modifier_group_ids=beverage_modifier_ids),
            MenuItem(name="Iced Tea", description="Refreshing iced tea with lemon", price_cents=350, category_id=beverages.id, tags=["cold", "refreshing"], modifier_group_ids=beverage_modifier_ids),
            MenuItem(name="Sparkling Water", description="San Pellegrino sparkling water", price_cents=300, category_id=beverages.id, tags=["water"]),
            
            # Coffee (with size, sweetness, and toppings)
            MenuItem(name="Espresso", description="Rich Italian espresso shot", price_cents=300, category_id=coffee.id, tags=["hot", "strong"], modifier_group_ids=coffee_modifier_ids),
            MenuItem(name="Latte", description="Smooth espresso with steamed milk", price_cents=450, category_id=coffee.id, tags=["hot", "milk"], modifier_group_ids=coffee_modifier_ids),
            MenuItem(name="Cappuccino", description="Espresso with foamed milk and cocoa", price_cents=450, category_id=coffee.id, tags=["hot", "milk"], modifier_group_ids=coffee_modifier_ids),
            MenuItem(name="Iced Americano", description="Espresso over ice with cold water", price_cents=400, category_id=coffee.id, tags=["cold", "strong"], modifier_group_ids=coffee_modifier_ids),
            MenuItem(name="Mocha", description="Espresso with chocolate and steamed milk", price_cents=500, category_id=coffee.id, tags=["hot", "chocolate"], modifier_group_ids=coffee_modifier_ids),
            
            # Pastries (no modifiers)
            MenuItem(name="Blueberry Muffin", description="Fresh baked muffin with blueberries", price_cents=350, category_id=pastries.id, tags=["sweet", "fresh"]),
            MenuItem(name="Croissant", description="Buttery French croissant", price_cents=300, category_id=pastries.id, tags=["butter", "french"]),
            MenuItem(name="Chocolate Chip Cookie", description="Warm chocolate chip cookie", price_cents=250, category_id=pastries.id, tags=["sweet", "chocolate"]),
            MenuItem(name="Cinnamon Roll", description="Warm cinnamon roll with icing", price_cents=400, category_id=pastries.id, tags=["sweet", "warm"]),
            
            # Breakfast (no modifiers)
            MenuItem(name="Avocado Toast", description="Smashed avocado on sourdough with eggs", price_cents=850, category_id=breakfast.id, tags=["healthy", "vegan-option"]),
            MenuItem(name="Pancake Stack", description="Fluffy pancakes with maple syrup", price_cents=750, category_id=breakfast.id, tags=["sweet", "filling"]),
            MenuItem(name="Eggs Benedict", description="Poached eggs on English muffin with hollandaise", price_cents=950, category_id=breakfast.id, tags=["classic", "filling"]),
            MenuItem(name="Breakfast Burrito", description="Scrambled eggs, cheese, and salsa in a tortilla", price_cents=800, category_id=breakfast.id, tags=["filling", "spicy"]),
        ]
        
        session.add_all(items)
        
        # Create sample tables
        tables = [
            Table(number="1", capacity=2),
            Table(number="2", capacity=4),
            Table(number="3", capacity=4),
            Table(number="4", capacity=6),
            Table(number="5", capacity=2),
        ]
        session.add_all(tables)
        
        # Create sample staff
        from backend.models import User, Promotion
        
        staff_members = [
            User(username="admin", password_hash="admin123", role="admin", pin_code="1234"),
            User(username="manager", password_hash="manager123", role="manager", pin_code="5678"),
            User(username="john", password_hash="staff123", role="staff", pin_code="1111"),
            User(username="sarah", password_hash="staff123", role="staff", pin_code="2222"),
            User(username="kitchen_mike", password_hash="kitchen123", role="kitchen", pin_code="3333"),
        ]
        session.add_all(staff_members)
        
        # Create sample promotions
        promos = [
            Promotion(code="WELCOME10", name="Welcome Discount", type="percentage", value=10, min_order_cents=500),
            Promotion(code="COFFEE15", name="Coffee Lovers", type="percentage", value=15, min_order_cents=800, max_discount_cents=300),
            Promotion(code="FLAT5", name="$5 Off", type="fixed", value=500, min_order_cents=1500),
        ]
        session.add_all(promos)
        
        await session.commit()
        print("✅ Seed data created successfully with modifiers, staff, and promotions!")

