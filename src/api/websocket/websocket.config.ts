// WebSocket Configuration for Real-time Order Updates

// Derive WebSocket URL from the REST API base URL
const REST_BASE_URL = 'http://localhost:8089/api/v1/';
const WS_BASE_URL = REST_BASE_URL.replace(/^http/, 'ws').replace('/api/v1/', '');

export const WEBSOCKET_CONFIG = {
    // WebSocket endpoint URL - adjust path as per backend configuration
    URL: `${WS_BASE_URL}/ws/orders`,

    // Reconnection settings
    RECONNECT_DELAY_MS: 1000,        // Initial delay before reconnection attempt
    MAX_RECONNECT_DELAY_MS: 30000,   // Maximum delay between reconnection attempts
    RECONNECT_MULTIPLIER: 2,         // Exponential backoff multiplier

    // Heartbeat/ping interval to keep connection alive
    HEARTBEAT_INTERVAL_MS: 30000,
};

// Order event types from backend
export const ORDER_EVENTS = {
    ORDER_CREATED: 'ORDER_CREATED',
    ORDER_UPDATED: 'ORDER_UPDATED',
    ORDER_STATUS_CHANGED: 'ORDER_STATUS_CHANGED',
    ORDER_DELETED: 'ORDER_DELETED',
} as const;

export type OrderEventType = typeof ORDER_EVENTS[keyof typeof ORDER_EVENTS];

// WebSocket message structure
export interface OrderWebSocketMessage {
    event: OrderEventType;
    orderId?: number | string;
    order?: any; // Full order data if provided
    timestamp?: string;
}
