import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface RealtimeEvent {
  type: string;
  data: any;
  timestamp: string;
}

interface WebSocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  lastEvent: RealtimeEvent | null;
}

const initialState: WebSocketState = {
  connected: false,
  connecting: false,
  error: null,
  lastEvent: null,
};

type EventHandler = (event: RealtimeEvent) => void;

function createWebSocketStore() {
  const { subscribe, set, update } = writable<WebSocketState>(initialState);

  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  const eventHandlers = new Map<string, Set<EventHandler>>();

  /**
   * Connect to WebSocket server
   */
  function connect(sessionId: string) {
    if (!browser) return;
    if (ws?.readyState === WebSocket.OPEN) return;

    update((state) => ({ ...state, connecting: true, error: null }));

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws?sessionId=${sessionId}`;

    try {
      ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        reconnectAttempts = 0;
        update((state) => ({ ...state, connected: true, connecting: false, error: null }));
      };

      ws.onmessage = (event) => {
        try {
          const message: RealtimeEvent = JSON.parse(event.data);
          console.log('WebSocket message:', message);

          // Update store with last event
          update((state) => ({ ...state, lastEvent: message }));

          // Notify event-specific handlers
          const handlers = eventHandlers.get(message.type);
          if (handlers) {
            handlers.forEach((handler) => handler(message));
          }

          // Notify wildcard handlers
          const wildcardHandlers = eventHandlers.get('*');
          if (wildcardHandlers) {
            wildcardHandlers.forEach((handler) => handler(message));
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        update((state) => ({
          ...state,
          error: 'WebSocket connection error',
          connecting: false,
        }));
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        update((state) => ({ ...state, connected: false, connecting: false }));

        // Attempt to reconnect
        if (reconnectAttempts < maxReconnectAttempts) {
          reconnectAttempts++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000); // Exponential backoff
          console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);

          reconnectTimer = setTimeout(() => {
            connect(sessionId);
          }, delay);
        } else {
          update((state) => ({
            ...state,
            error: 'Failed to reconnect after multiple attempts',
          }));
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      update((state) => ({
        ...state,
        error: 'Failed to create WebSocket connection',
        connecting: false,
      }));
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  function disconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }

    if (ws) {
      ws.close();
      ws = null;
    }

    set(initialState);
  }

  /**
   * Subscribe to specific event type
   */
  function on(eventType: string, handler: EventHandler) {
    if (!eventHandlers.has(eventType)) {
      eventHandlers.set(eventType, new Set());
    }
    eventHandlers.get(eventType)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = eventHandlers.get(eventType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          eventHandlers.delete(eventType);
        }
      }
    };
  }

  /**
   * Send message to server
   */
  function send(message: any) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }

  /**
   * Send ping to keep connection alive
   */
  function ping() {
    send({ type: 'ping' });
  }

  return {
    subscribe,
    connect,
    disconnect,
    on,
    send,
    ping,
  };
}

export const websocketStore = createWebSocketStore();
