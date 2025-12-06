import socketio

# Create a Socket.IO server
# async_mode='asgi' is important for FastAPI integration
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
