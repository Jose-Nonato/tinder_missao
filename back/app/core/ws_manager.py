from fastapi import WebSocket


class ConnectionManager:
    """Conexões WebSocket abertas por usuário (uma pessoa pode ter várias abas).

    Fica em memória: vale para um único processo do servidor. Com vários processos
    seria preciso um barramento externo (por exemplo, Redis pub/sub).
    """

    def __init__(self) -> None:
        # user_id -> {conexão: id da sessão (sid) que a abriu}
        self._sockets: dict[str, dict[WebSocket, str]] = {}

    def add(self, user_id: str, ws: WebSocket, sid: str) -> None:
        self._sockets.setdefault(user_id, {})[ws] = sid

    def remove(self, user_id: str, ws: WebSocket) -> None:
        sockets = self._sockets.get(user_id)
        if sockets:
            sockets.pop(ws, None)
            if not sockets:
                del self._sockets[user_id]

    async def close(self, user_id: str, sid: str | None = None, code: int = 4401) -> None:
        """Fecha as conexões do usuário (só as de uma sessão, se `sid` for informado)."""
        for ws, ws_sid in list(self._sockets.get(user_id, {}).items()):
            if sid is None or ws_sid == sid:
                try:
                    await ws.close(code=code)
                except Exception:  # já estava fechada
                    pass

    def is_online(self, user_id: str) -> bool:
        return user_id in self._sockets

    async def send_to_user(self, user_id: str, payload: dict) -> None:
        for ws in list(self._sockets.get(user_id, {})):
            try:
                await ws.send_json(payload)
            except Exception:  # conexão já caiu; o handler dela faz a limpeza
                self.remove(user_id, ws)


manager = ConnectionManager()
