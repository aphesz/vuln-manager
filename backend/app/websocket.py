from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List
import json
import logging

logger = logging.getLogger(__name__)

class WebSocketManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, project_id: int):
        await websocket.accept()
        if project_id not in self.active_connections:
            self.active_connections[project_id] = []
        self.active_connections[project_id].append(websocket)
        logger.info(f"Client connected to project {project_id}. Total connections: {len(self.active_connections[project_id])}")

    def disconnect(self, websocket: WebSocket, project_id: int):
        if project_id in self.active_connections:
            self.active_connections[project_id].remove(websocket)
            if not self.active_connections[project_id]:
                del self.active_connections[project_id]
            logger.info(f"Client disconnected from project {project_id}")

    async def broadcast_to_project(self, project_id: int, message: dict):
        if project_id in self.active_connections:
            dead_connections = []
            for connection in self.active_connections[project_id]:
                try:
                    await connection.send_text(json.dumps(message))
                except WebSocketDisconnect:
                    dead_connections.append(connection)
                except Exception as e:
                    logger.error(f"Error sending message: {e}")
                    dead_connections.append(connection)
            
            # Clean up dead connections
            for dead in dead_connections:
                self.active_connections[project_id].remove(dead)

    async def broadcast_finding_update(self, project_id: int, finding_id: int, action: str):
        message = {
            "type": "finding_update",
            "payload": {
                "project_id": project_id,
                "finding_id": finding_id,
                "action": action
            }
        }
        await self.broadcast_to_project(project_id, message)