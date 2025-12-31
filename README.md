# CafeOS

A complete point-of-sale and operations management system designed for modern cafes and coffee shops. Built with React and FastAPI, featuring real-time order updates, kitchen display integration, staff management, and comprehensive reporting.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage Guide](#usage-guide)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Troubleshooting](#troubleshooting)

---

## Overview

CafeOS addresses the common pain points of running a cafe:

- **Paper-based ordering** is replaced with digital tablets at each table
- **Kitchen miscommunication** is eliminated with real-time order displays
- **Manual sales tracking** becomes automated with built-in reporting
- **Staff scheduling chaos** is solved with integrated shift management

The system is designed to work on tablets for customers, desktop screens for kitchen staff, and any device for managers accessing the admin panel.

---

## Features

### Customer Ordering System

The ordering interface is designed for simplicity. Customers can:

- Browse a categorized menu (Hot Drinks, Cold Drinks, Food, etc.)
- View item descriptions and prices
- Select size options (Small, Medium, Large) with automatic price adjustments
- Add modifiers like milk alternatives, extra shots, or toppings
- Enter special instructions for each item (e.g., "less ice", "extra hot")
- Apply promotional codes before checkout
- Link their phone number to earn loyalty points
- Track their order status in real-time without refreshing
- **Search and filter menu items** with quick category navigation
- **Place multiple orders** on the same QR session

### Kitchen Display System

The kitchen view provides staff with:

- Live feed of incoming orders (updates instantly via WebSocket)
- Clear distinction between order states using color coding
- One-tap buttons to move orders through the pipeline
- Order age indicators to identify delays
- Customer name and table number for each order
- Full modifier and instruction details for accurate preparation
- **Fullscreen mode** for dedicated kitchen screens
- **Audio notifications** for new incoming orders
- **Time elapsed warnings** (red highlight for orders over 10 minutes)
- **Large, touch-friendly action buttons**

### Admin Dashboard

The management interface includes:

**Sales Overview**
- Today's revenue with comparison to yesterday
- Number of orders processed
- Average order value
- Revenue trend chart (daily/weekly/monthly views)

**Order Management**
- Complete order history with search functionality
- Filter by status, date range, or customer name
- View full order details including itemized breakdown
- Reprint receipts for any past order

**Menu Management**
- Add, edit, or remove menu items
- Organize items into categories
- Set prices and upload images
- Create modifier groups (sizes, milk options, toppings)
- Assign modifiers to specific items

**Table Management**
- Configure table numbers and seating capacity
- Generate unique session tokens for each table
- Generate printable QR codes with cafe branding
- **Session-based ordering**: All orders from one QR session are grouped together
- **Close session at checkout**: Shows total bill and invalidates QR code
- **Print QR cards**: Professional QR cards with cafe name and table number
- Monitor table status (available, occupied, needs cleaning)

**Staff Management**
- Create accounts with role-based permissions
- Roles include: Admin (full access), Manager (reports + staff), Staff (orders only), Kitchen (KDS only)
- Each staff member gets a unique PIN for quick login
- View who is currently clocked in

**Shift Tracking**
- Staff clock in/out with timestamps
- View shift history per employee
- Calculate hours worked automatically

**Promotions**
- Create percentage-based discounts (e.g., 10% off)
- Create fixed-amount discounts (e.g., $5 off)
- Set minimum order requirements
- Limit usage count per promo code
- Set validity date ranges

**Loyalty Program**
- Automatic customer registration via phone number
- Points accumulate at 1 point per dollar spent
- Backend support for point redemption (100 points = $1)

**Reporting**
- Daily breakdown table with orders and revenue
- Top-selling items list with quantities
- Export all data to CSV for external analysis

---

## Architecture

### System Design

```
                                    ┌─────────────────┐
                                    │  Table QR Code  │
                                    │  with Session   │
                                    └────────┬────────┘
                                             │ Scan
                                             ▼
┌─────────────┐     WebSocket      ┌─────────────────┐
│   Customer  │◄──────────────────►│                 │
│   Tablet    │   (order status)   │                 │
└─────────────┘                    │                 │
       │                           │    FastAPI      │
       │ POST /orders              │    Backend      │
       │ (with session_token)      │                 │
       └──────────────────────────►│                 │
                                   │                 │
┌─────────────┐     WebSocket      │                 │
│   Kitchen   │◄──────────────────►│                 │
│   Display   │   (new orders)     │                 │
└─────────────┘                    │                 │
                                   │                 │
┌─────────────┐     REST API       │                 │
│   Admin     │◄──────────────────►│                 │
│   Panel     │  (generate/close   └────────┬────────┘
└─────────────┘     sessions)               │
       │                                    │
       │ Print QR                    ┌──────▼──────┐
       ▼                             │   SQLite    │
 🖨️ Printer                         │   Database  │
                                     └─────────────┘
```

### Session Flow

```
┌──────────────────────────────────────────────────────────────┐
│                     TABLE SESSION LIFECYCLE                   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  1. GENERATE          2. ORDER             3. CLOSE          │
│  ┌─────────┐         ┌─────────┐         ┌─────────┐        │
│  │  Admin  │         │Customer │         │  Admin  │        │
│  │generates│────────►│ orders  │────────►│ closes  │        │
│  │ session │         │multiple │         │ session │        │
│  └─────────┘         │  times  │         └─────────┘        │
│       │              └─────────┘              │              │
│       ▼                   │                   ▼              │
│  QR Code Active      Orders linked      Combined Bill        │
│  URL: ?session=xyz   to session_id      QR Invalidated       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Technology Choices

**Frontend (React + TypeScript)**
- Vite for fast development builds
- React Router for client-side navigation
- Socket.IO client for real-time updates
- Lucide React for consistent iconography
- Custom CSS with CSS variables for theming

**Backend (Python + FastAPI)**
- FastAPI for high-performance async endpoints
- SQLAlchemy ORM for database operations
- Python-SocketIO for WebSocket handling
- FPDF2 for receipt PDF generation
- Uvicorn ASGI server

**Database (SQLite)**
- Chosen for zero-configuration deployment
- Single file storage (cafe.db)
- Suitable for single-location cafes
- Can be migrated to PostgreSQL for multi-location setups

---

## Installation

### Prerequisites

Ensure you have installed:
- Node.js version 16 or higher
- Python version 3.9 or higher
- Git (for cloning the repository)

### Step 1: Clone the Repository

```bash
git clone https://github.com/Nonx2360/CafeOS.git
cd CafeOS
```

### Step 2: Backend Setup

Create and activate a Python virtual environment:

```bash
# Windows
python -m venv venv
.\venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

Install Python dependencies:

```bash
pip install fastapi uvicorn sqlalchemy python-socketio fpdf2 aiosqlite
```

Start the backend server:

```bash
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

The backend will be available at `http://localhost:8000`

### Step 3: Frontend Setup

Open a new terminal window and navigate to the frontend directory:

```bash
cd frontend
npm install
```

Start the development server:

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

### Step 4: Verify Installation

1. Open `http://localhost:5173` in your browser
2. You should see the CafeOS home page
3. Navigate to `/admin` to access the dashboard
4. Navigate to `/kitchen` to view the kitchen display

---

## Configuration

### Environment Variables

Create a `.env` file in the `frontend` directory:

```env
VITE_API_URL=http://localhost:8000
```

For production, update this to your backend server URL.

### Database Seeding

On first run, the database automatically seeds with:
- 5 sample tables
- Menu categories (Hot Drinks, Cold Drinks, Food, Desserts)
- Sample menu items with prices
- Modifier groups (Size, Milk Type, Toppings)
- 5 staff accounts with different roles
- 3 sample promotional codes

To reset the database, delete `cafe.db` and restart the backend.

### Network Access

To allow tablets on the same network to access the system:

1. Find your computer's local IP address (e.g., `192.168.1.100`)
2. Start the backend with: `uvicorn backend.main:app --host 0.0.0.0`
3. Update the frontend `.env` to use the IP: `VITE_API_URL=http://192.168.1.100:8000`
4. Access the frontend from tablets using `http://192.168.1.100:5173`

---

## Usage Guide

### Customer Ordering Flow

1. Staff generates a session token for the table (Admin > Table Management > Generate)
2. Customer scans QR code at their table
3. Browse menu categories and tap items to add to cart
4. For items with options, a modal appears to select size/modifiers
5. Enter special instructions if needed
6. Review cart in the bottom bar
7. Optionally enter phone number for loyalty points
8. Optionally enter promo code and tap "Apply"
9. Tap "Place Order" to submit
10. Order status screen appears with real-time updates
11. Customer can place additional orders using the same QR code
12. When ready to leave, staff closes the session (shows combined bill)
13. QR code becomes invalid; staff generates new session for next customer

### Kitchen Staff Workflow

1. Open `/kitchen` on the kitchen display screen
2. New orders appear automatically in the "Pending" column
3. Tap "Start Preparing" when beginning an order
4. Order moves to "Preparing" column
5. Tap "Ready" when order is complete
6. Order moves to "Ready" column
7. Front staff marks as "Served" when handed to customer

### Manager Daily Tasks

**Start of Day**
1. Check yesterday's sales summary in Reports
2. Review any pending orders from previous day
3. Verify staff schedule for the day

**During Service**
1. Monitor live orders on Dashboard
2. Handle any order issues (view details, reprint receipts)
3. Track staff clock-in status

**End of Day**
1. Export daily sales report to CSV
2. Review top-selling items
3. Check shift hours for payroll

### Creating a New Promotion

1. Navigate to Admin > Promotions
2. Click "Add Promotion"
3. Enter a unique code (e.g., "SUMMER20")
4. Choose type: Percentage or Fixed Amount
5. Enter the discount value
6. Set minimum order amount (optional)
7. Set maximum discount cap (optional)
8. Choose validity dates
9. Set usage limit (optional)
10. Click "Create"

---

## API Reference

### Orders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/orders/menu` | Get full menu with categories |
| POST | `/api/orders/` | Create new order |
| GET | `/api/orders/{id}` | Get order by ID |
| PATCH | `/api/orders/{id}/status` | Update order status |
| GET | `/api/admin/orders` | Get all orders (admin) |

### Staff

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/staff/login` | Login with username/password |
| POST | `/api/staff/pin-login` | Quick login with PIN |
| GET | `/api/staff/` | List all staff |
| POST | `/api/staff/` | Create staff member |
| PUT | `/api/staff/{id}` | Update staff member |
| POST | `/api/staff/{id}/clock-in` | Clock in |
| POST | `/api/staff/{id}/clock-out` | Clock out |
| GET | `/api/staff/shifts` | Get shift history |

### Promotions

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/promotions/` | List all promotions |
| POST | `/api/promotions/` | Create promotion |
| POST | `/api/promotions/validate` | Validate promo code |
| GET | `/api/promotions/loyalty/{phone}` | Get customer loyalty info |
| POST | `/api/promotions/loyalty/register` | Register new customer |
| POST | `/api/promotions/loyalty/{id}/earn` | Add points |

### Modifiers

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/modifiers/groups` | Get all modifier groups |
| POST | `/api/modifiers/groups` | Create modifier group |
| POST | `/api/modifiers/` | Add modifier to group |

---

## Database Schema

### Core Tables

**menu_items**
- id, name, description, price_cents, category, image_url, is_available

**orders**
- id, order_number, table_id, session_id, customer_name, status, total_cents, created_at

**order_items**
- id, order_id, menu_item_id, quantity, unit_price_cents, modifier_price_cents, instructions

**order_item_modifiers**
- id, order_item_id, modifier_id, modifier_name, price_cents

### Staff Tables

**users**
- id, username, password_hash, role, pin_code, is_active

**shifts**
- id, user_id, clock_in, clock_out

### Promotion Tables

**promotions**
- id, code, name, type, value, min_order_cents, max_discount_cents, valid_from, valid_to, usage_limit, usage_count, is_active

**customers**
- id, phone, name, points, stamps, total_spent_cents, created_at

### Configuration Tables

**tables**
- id, number, capacity, status

**table_sessions**
- id, table_id, session_token, is_active, created_at, used_at

**modifier_groups**
- id, name, selection_type, is_required

**modifiers**
- id, group_id, name, price_cents, is_default

---

## Troubleshooting

### Backend won't start

**Error: "Address already in use"**
Another process is using port 8000. Either stop that process or use a different port:
```bash
uvicorn backend.main:app --port 8001
```

**Error: "Module not found"**
Ensure virtual environment is activated and dependencies are installed:
```bash
.\venv\Scripts\activate
pip install -r requirements.txt
```

### Frontend won't connect to backend

**Orders not appearing / WebSocket errors**
1. Verify backend is running
2. Check browser console for CORS errors
3. Ensure `VITE_API_URL` matches backend address
4. If using different ports, restart frontend after changing `.env`

### Database issues

**Error: "database is locked"**
SQLite allows only one write at a time. Close any database browsers or wait for long operations to complete.

**Corrupted database**
Delete `cafe.db` and restart backend to regenerate with seed data.

### Kitchen display not updating

WebSocket connection may have dropped. Refresh the page to reconnect.

---

## License

MIT License. See LICENSE file for details.
