import { useEffect, useRef, useCallback } from 'react';
import { WEBSOCKET_CONFIG, ORDER_EVENTS, type OrderWebSocketMessage } from '../api/websocket/websocket.config';
import { getOrderById } from '../api/order/Order.api';
import type { PlacedOrder } from '../components/pages/DashboardOverview/Dashboard';

interface UseOrderWebSocketOptions {
    onOrderCreated?: (order: PlacedOrder) => void;
    onOrderUpdated?: (order: PlacedOrder) => void;
    onOrderStatusChanged?: (order: PlacedOrder) => void;
    enabled?: boolean;
}

/**
 * Custom hook for real-time order updates via WebSocket.
 * Handles connection, reconnection with exponential backoff, and event dispatching.
 */
export function useOrderWebSocket(options: UseOrderWebSocketOptions = {}) {
    const { onOrderCreated, onOrderUpdated, onOrderStatusChanged, enabled = true } = options;

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const reconnectDelayRef = useRef(WEBSOCKET_CONFIG.RECONNECT_DELAY_MS);
    const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isUnmountedRef = useRef(false);

    // Map backend order data to PlacedOrder format
    const mapOrderToPlacedOrder = useCallback((order: any): PlacedOrder => {
        return {
            id: String(order.id || order.orderId || order.orderSummaryId || ''),
            orderItems: (order.orderItems || order.items || []).map((item: any) => ({
                id: String(item.id || item.orderItemId || ''),
                orderItemId: item.orderItemId || item.id,
                foodId: item.foodId,
                name: item.itemName || item.name || item.foodName || 'Unknown Item',
                price: item.price || 0,
                quantity: item.quantity || 1,
                isRejected: item.status === 'REJECTED'
            })),
            orderType: (order.orderType?.toLowerCase().replace('_', '-') as 'dine-in' | 'take-away') || 'dine-in',
            table: order.tableNumber ? `Table ${order.tableNumber}` : (order.table || ''),
            tableId: order.tableId || order.resturantTablesId || null,
            steward: order.stewardName || order.steward || '',
            stewardId: order.stewardId || null,
            placedAt: order.createdDateTime ? new Date(order.createdDateTime) : (order.placedAt ? new Date(order.placedAt) : new Date()),
            status: (order.status?.toLowerCase() || 'placed') as 'placed' | 'preparing' | 'completed' | 'cancelled',
            apiOrderId: typeof order.id === 'number' ? order.id : undefined
        };
    }, []);

    // Fetch order details by ID when event only contains orderId
    const fetchOrderDetails = useCallback(async (orderId: number | string): Promise<PlacedOrder | null> => {
        try {
            const response = await getOrderById(orderId);
            if (response?.data) {
                return mapOrderToPlacedOrder(response.data);
            }
        } catch (err) {
            console.error('[WebSocket] Failed to fetch order details:', orderId, err);
        }
        return null;
    }, [mapOrderToPlacedOrder]);

    // Handle incoming WebSocket messages
    const handleMessage = useCallback(async (event: MessageEvent) => {
        try {
            const message: OrderWebSocketMessage = JSON.parse(event.data);
            console.log('[WebSocket] Received message:', message);

            let order: PlacedOrder | null = null;

            // If full order data is provided, use it directly
            if (message.order) {
                order = mapOrderToPlacedOrder(message.order);
            }
            // Otherwise, fetch order details by ID
            else if (message.orderId) {
                order = await fetchOrderDetails(message.orderId);
            }

            if (!order) {
                console.warn('[WebSocket] Could not resolve order data from message:', message);
                return;
            }

            // Dispatch to appropriate handler based on event type
            switch (message.event) {
                case ORDER_EVENTS.ORDER_CREATED:
                    onOrderCreated?.(order);
                    break;
                case ORDER_EVENTS.ORDER_UPDATED:
                    onOrderUpdated?.(order);
                    break;
                case ORDER_EVENTS.ORDER_STATUS_CHANGED:
                    onOrderStatusChanged?.(order);
                    break;
                default:
                    console.log('[WebSocket] Unknown event type:', message.event);
            }
        } catch (err) {
            console.error('[WebSocket] Failed to parse message:', err);
        }
    }, [mapOrderToPlacedOrder, fetchOrderDetails, onOrderCreated, onOrderUpdated, onOrderStatusChanged]);

    // Clear reconnection timeout
    const clearReconnectTimeout = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
    }, []);

    // Clear heartbeat interval
    const clearHeartbeat = useCallback(() => {
        if (heartbeatIntervalRef.current) {
            clearInterval(heartbeatIntervalRef.current);
            heartbeatIntervalRef.current = null;
        }
    }, []);

    // Start heartbeat to keep connection alive
    const startHeartbeat = useCallback(() => {
        clearHeartbeat();
        heartbeatIntervalRef.current = setInterval(() => {
            if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ type: 'PING' }));
            }
        }, WEBSOCKET_CONFIG.HEARTBEAT_INTERVAL_MS);
    }, [clearHeartbeat]);

    // Connect to WebSocket
    const connect = useCallback(() => {
        if (isUnmountedRef.current || !enabled) return;

        // Don't connect if already connected or connecting
        if (wsRef.current?.readyState === WebSocket.OPEN ||
            wsRef.current?.readyState === WebSocket.CONNECTING) {
            return;
        }

        try {
            // Get auth token for WebSocket authentication
            const token = sessionStorage.getItem('token') || sessionStorage.getItem('accessToken');
            const wsUrl = token
                ? `${WEBSOCKET_CONFIG.URL}?token=${encodeURIComponent(token)}`
                : WEBSOCKET_CONFIG.URL;

            console.log('[WebSocket] Connecting to:', WEBSOCKET_CONFIG.URL);
            wsRef.current = new WebSocket(wsUrl);

            wsRef.current.onopen = () => {
                console.log('[WebSocket] Connected successfully');
                // Reset reconnection delay on successful connection
                reconnectDelayRef.current = WEBSOCKET_CONFIG.RECONNECT_DELAY_MS;
                startHeartbeat();
            };

            wsRef.current.onmessage = handleMessage;

            wsRef.current.onerror = (error) => {
                console.error('[WebSocket] Connection error:', error);
            };

            wsRef.current.onclose = (event) => {
                console.log('[WebSocket] Connection closed:', event.code, event.reason);
                clearHeartbeat();

                // Attempt reconnection if not unmounted and enabled
                if (!isUnmountedRef.current && enabled) {
                    console.log(`[WebSocket] Reconnecting in ${reconnectDelayRef.current}ms...`);

                    clearReconnectTimeout();
                    reconnectTimeoutRef.current = setTimeout(() => {
                        // Exponential backoff
                        reconnectDelayRef.current = Math.min(
                            reconnectDelayRef.current * WEBSOCKET_CONFIG.RECONNECT_MULTIPLIER,
                            WEBSOCKET_CONFIG.MAX_RECONNECT_DELAY_MS
                        );
                        connect();
                    }, reconnectDelayRef.current);
                }
            };
        } catch (err) {
            console.error('[WebSocket] Failed to create connection:', err);
        }
    }, [enabled, handleMessage, startHeartbeat, clearHeartbeat, clearReconnectTimeout]);

    // Disconnect from WebSocket
    const disconnect = useCallback(() => {
        clearReconnectTimeout();
        clearHeartbeat();

        if (wsRef.current) {
            wsRef.current.onclose = null; // Prevent reconnection on manual close
            wsRef.current.close();
            wsRef.current = null;
        }
    }, [clearReconnectTimeout, clearHeartbeat]);

    // Connect on mount, disconnect on unmount
    useEffect(() => {
        isUnmountedRef.current = false;

        if (enabled) {
            connect();
        }

        return () => {
            isUnmountedRef.current = true;
            disconnect();
        };
    }, [enabled, connect, disconnect]);

    return {
        isConnected: wsRef.current?.readyState === WebSocket.OPEN,
        reconnect: connect,
        disconnect,
    };
}

export default useOrderWebSocket;
