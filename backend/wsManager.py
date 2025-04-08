from fastapi import WebSocket, WebSocketDisconnect
from asyncio import Queue

class WebSocketManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self.message_queue: Queue = Queue()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_message(self, message: str):
        if not self.active_connections:
            raise ValueError("Kein WebSocket-Client verbunden")
        # Nachricht an den ersten verbundenen Client senden
        await self.active_connections[0].send_text(message)

    async def receive_message(self) -> str:
        # Nachricht aus der Queue lesen (wartet, bis eine Nachricht eintrifft)
        return await self.message_queue.get()

    async def listen_to_client(self, websocket: WebSocket):
        """Liest Nachrichten vom WebSocket-Client und speichert sie in der Queue."""
        try:
            while True:
                data = await websocket.receive_text()
                await self.message_queue.put(data)
        except WebSocketDisconnect:
            self.disconnect(websocket)
            print("WebSocket-Client getrennt")