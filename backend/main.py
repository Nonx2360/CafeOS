from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.socket_manager import sio
import socketio
from backend.db import init_db, seed_data
from backend.api import auth, admin, orders, kitchen, receipts, modifiers, staff, promotions

app = FastAPI(title="CafeOS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def on_startup():
    await init_db()
    await seed_data()

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(orders.router)
app.include_router(kitchen.router)
app.include_router(receipts.router)
app.include_router(modifiers.router)
app.include_router(staff.router)
app.include_router(promotions.router)

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

# Socket.IO event handlers
@sio.event
async def connect(sid, environ):
    print(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    print(f"Client disconnected: {sid}")

@sio.event
async def join_room(sid, room):
    await sio.enter_room(sid, room)

@sio.event
async def leave_room(sid, room):
    await sio.leave_room(sid, room)

# Wrap the FastAPI app with Socket.IO
# This must be the final 'app' that uvicorn runs
app = socketio.ASGIApp(sio, other_asgi_app=app, socketio_path='/ws/socket.io')
