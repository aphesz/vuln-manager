type Listener<T> = (data: T) => void;

class WebSocketService {
  private static instance: WebSocketService;
  private static instances: Map<number, WebSocketService> = new Map();
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<Listener<any>>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout = 1000;
  private projectId: number | null = null;

  private constructor(projectId?: number) {
    this.projectId = projectId || null;
    if (projectId) {
      this.connect();
    }
  }

  static getInstance(projectId?: number): WebSocketService {
    // If no projectId provided, return shared instance (used for global events)
    if (!projectId) {
      if (!WebSocketService.instance) {
        WebSocketService.instance = new WebSocketService();
      }
      return WebSocketService.instance;
    }

    // For project-specific connections, maintain separate instances
    if (!WebSocketService.instances.has(projectId)) {
      WebSocketService.instances.set(projectId, new WebSocketService(projectId));
    }
    return WebSocketService.instances.get(projectId)!;
  }

  private connect() {
    if (!this.projectId) {
      console.warn('WebSocketService: Cannot connect without projectId');
      return;
    }

    // Build WebSocket URL - use relative path to go through nginx proxy
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = window.location.host; // Use .host instead of .hostname to include port
    const wsUrl = `${protocol}://${host}/ws/${this.projectId}`;
    
    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit(data.type, data.payload);
        } catch (error) {
          console.error('WebSocket message parsing error:', error);
        }
      };

      this.ws.onclose = () => {
        console.log(`WebSocket connection closed for project ${this.projectId}`);
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          setTimeout(() => {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            this.connect();
          }, this.reconnectTimeout * Math.pow(2, this.reconnectAttempts));
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        console.log(`Failed to connect to ${wsUrl}`);
      };

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        console.log(`WebSocket connection established for project ${this.projectId}`);
      };
    } catch (error) {
      console.error('Failed to establish WebSocket connection:', error);
    }
  }

  /**
   * Gracefully close the WebSocket connection
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private emit<T>(event: string, data: T) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  subscribe<T>(event: string, callback: Listener<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    const listeners = this.listeners.get(event)!;
    listeners.add(callback);

    // Return unsubscribe function
    return () => {
      listeners.delete(callback);
    };
  }

  send(type: string, payload: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    } else {
      console.warn('WebSocket is not open. Current state:', this.ws?.readyState);
    }
  }

  /**
   * Check if WebSocket is currently connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export default WebSocketService;