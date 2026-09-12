"""
Real-Time WebSocket Connection Hub
Implements Section 24 ("Real-Time Event Architecture") requirements:
- Manages active client WebSockets for Command Center and Mobile Citizen apps
- Broadcasts real-time events:
    - NEW_SOS_TRIGGERED
    - SOS_STATUS_UPDATED
    - CITIZEN_REPORT_SUBMITTED
    - RISK_THRESHOLD_EXCEEDED
    - ROAD_STATUS_CHANGED
"""

import json
from typing import List, Dict, Any
from fastapi import WebSocket

class WebSocketHub:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, event_type: str, data: Dict[str, Any]):
        message = {
            "type": event_type,
            "timestamp": data.get("timestamp") or time.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "payload": data
        }
        text_payload = json.dumps(message)
        dead_sockets = []
        for connection in self.active_connections:
            try:
                await connection.send_text(text_payload)
            except Exception:
                dead_sockets.append(connection)

        for dead in dead_sockets:
            self.disconnect(dead)

import time
ws_hub = WebSocketHub()
