import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { getOrders } from '../api/order/Order.api';

export interface OrderNotification {
  id: string;
  orderNumber: string;
  table: string;
  status: 'READY_TO_SERVE' | 'REJECTED';
  reason?: string;
  timestamp: Date;
}

interface OrderNotificationContextType {
  notifications: OrderNotification[];
  addNotification: (notification: Omit<OrderNotification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  acceptOrder: (orderNumber: string) => void;
  orders: any[];
  updateOrderStatus: (orderId: string, status: string) => void;
  addOrder: (order: any) => void;
  rejectedOrders: any[];
  addRejectedOrder: (order: any, reason: string) => void;
  clearRejectedOrder: (orderId: string) => void;
  refreshOrders: () => Promise<void>;
}

const OrderNotificationContext = createContext<OrderNotificationContextType | undefined>(undefined);

export function OrderNotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [rejectedOrders, setRejectedOrders] = useState<any[]>([]);

  const addNotification = (notification: Omit<OrderNotification, 'id' | 'timestamp'>) => {
    const newNotification: OrderNotification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
    };

    setNotifications((prev) => {
      // Avoid duplicate notifications for same order and status
      const exists = prev.some((n) => n.orderNumber === notification.orderNumber && n.status === notification.status);
      if (exists) return prev;
      return [...prev, newNotification];
    });
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const refreshOrders = useCallback(async () => {
    try {
      const response = await getOrders();
      let apiOrders: any[] = [];

      if (Array.isArray(response)) {
        apiOrders = response;
      } else if (response?.data?.content) {
        apiOrders = response.data.content;
      } else if (response?.content) {
        apiOrders = response.content;
      } else if (response?.data) {
        apiOrders = response.data;
      }

      // Map API orders to standard format
      const mappedOrders = apiOrders.map(o => {
        const orderId = String(o.id);

        // Get reason from local storage if available
        let rejectedReason = o.rejectedReason;
        if (!rejectedReason) {
          try {
            const reasons = JSON.parse(localStorage.getItem('order_rejection_reasons') || '{}');
            rejectedReason = reasons[orderId] || reasons[o.id];
          } catch (e) { }
        }

        return {
          ...o,
          id: orderId,
          orderNumber: `ORD-${orderId.padStart(3, '0')}`,
          table: o.tableNumber || `T${o.tableId || '-'}`,
          placedAt: o.createdDateTime || o.placedAt || new Date().toISOString(),
          status: o.status,
          rejectedReason: rejectedReason || 'No reason provided',
          items: (o.orderItems || []).map((item: any) => ({
            ...item,
            id: item.orderItemId || item.id,
            orderItemId: item.orderItemId || (typeof item.id === 'number' ? item.id : undefined),
            foodId: item.foodId,
            name: item.itemName || item.name,
            price: item.price,
            quantity: item.quantity,
            status: item.status
          }))
        };
      });

      // Filter rejected orders
      const rejected = mappedOrders.filter(o => o.status === 'REJECTED');
      setRejectedOrders(rejected);

      // Filter orders for notifications (READY_TO_SERVE)
      const readyToServe = mappedOrders.filter(o => o.status === 'READY_TO_SERVE');

      // Update notifications based on currently active statuses
      setNotifications(prev => {
        const existingNotifs = [...prev];

        // Add new READY_TO_SERVE notifications if they don't exist
        readyToServe.forEach(order => {
          const exists = existingNotifs.some(n => n.orderNumber === order.orderNumber && n.status === 'READY_TO_SERVE');
          if (!exists) {
            existingNotifs.push({
              id: `notif-ready-${order.id}`,
              orderNumber: order.orderNumber,
              table: order.table,
              status: 'READY_TO_SERVE',
              timestamp: new Date(order.placedAt)
            });
          }
        });

        // Add REJECTED notifications if they don't exist
        rejected.forEach(order => {
          const exists = existingNotifs.some(n => n.orderNumber === order.orderNumber && n.status === 'REJECTED');
          if (!exists) {
            existingNotifs.push({
              id: `notif-reject-${order.id}`,
              orderNumber: order.orderNumber,
              table: order.table,
              status: 'REJECTED',
              reason: order.rejectedReason || 'No reason provided',
              timestamp: new Date(order.placedAt)
            });
          }
        });

        return existingNotifs;
      });

      setOrders(mappedOrders);
    } catch (err) {
      console.error('Failed to refresh orders in context', err);
    }
  }, []);

  // Initial fetch and polling
  useEffect(() => {
    refreshOrders();
    const interval = setInterval(refreshOrders, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, [refreshOrders]);

  const acceptOrder = (orderNumber: string) => {
    setNotifications((prev) => prev.filter((n) => n.orderNumber !== orderNumber));
    setOrders((prev) =>
      prev.map((o) =>
        o.orderNumber === orderNumber ? { ...o, status: 'COLLECTED' } : o
      )
    );
  };

  const updateOrderStatus = (orderId: string, status: string) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, status } : order
      )
    );
  };

  const addOrder = (order: any) => {
    setOrders((prev) => {
      const existingIndex = prev.findIndex((o) => o.id === order.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = order;
        return updated;
      }
      return [...prev, order];
    });
  };

  const addRejectedOrder = (order: any, reason: string) => {
    setRejectedOrders(prev => {
      const exists = prev.some(o => o.id === order.id);
      if (exists) return prev.map(o => o.id === order.id ? { ...order, rejectedReason: reason } : o);
      return [...prev, { ...order, rejectedReason: reason }];
    });
    addNotification({
      orderNumber: order.orderNumber || order.id,
      table: order.table,
      status: 'REJECTED',
      reason
    });
  };

  const clearRejectedOrder = (orderId: string) => {
    setRejectedOrders(prev => prev.filter(o => o.id !== orderId));
    setNotifications(prev => prev.filter(n => n.orderNumber !== orderId));
  };

  return (
    <OrderNotificationContext.Provider
      value={{
        notifications,
        addNotification,
        removeNotification,
        acceptOrder,
        orders,
        updateOrderStatus,
        addOrder,
        rejectedOrders,
        addRejectedOrder,
        clearRejectedOrder,
        refreshOrders,
      }}
    >
      {children}
    </OrderNotificationContext.Provider>
  );
}

export function useOrderNotifications() {
  const context = useContext(OrderNotificationContext);
  if (context === undefined) {
    throw new Error('useOrderNotifications must be used within OrderNotificationProvider');
  }
  return context;
}

