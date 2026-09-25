type WebSocketMessageHandler = (type: string, data: any) => void;

class WebSocketClient {
  private ws: WebSocket | null = null;
  private handlers: Set<WebSocketMessageHandler> = new Set();
  private reconnectInterval = 3000;
  private url: string;
  public isConnected = false;

  constructor() {
    const loc = window.location;
    const protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
    // Point to backend port 1607 or proxy /ws
    this.url = import.meta.env.VITE_WS_URL || `${protocol}//${loc.hostname}:1607`;
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.notifyHandlers('CONNECTION_STATUS', { connected: true });
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          this.notifyHandlers(payload.type, payload.data);
        } catch (e) {
          console.error('[WS] Error parsing message:', e);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.notifyHandlers('CONNECTION_STATUS', { connected: false });
        setTimeout(() => this.connect(), this.reconnectInterval);
      };

      this.ws.onerror = () => {
        this.isConnected = false;
        if (this.ws) this.ws.close();
      };
    } catch (err) {
      console.warn('[WS] Connection exception:', err);
      setTimeout(() => this.connect(), this.reconnectInterval);
    }
  }

  subscribe(handler: WebSocketMessageHandler) {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  private notifyHandlers(type: string, data: any) {
    this.handlers.forEach(h => h(type, data));
  }
}

export const wsClient = new WebSocketClient();
