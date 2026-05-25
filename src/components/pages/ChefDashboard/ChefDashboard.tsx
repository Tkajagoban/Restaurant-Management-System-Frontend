import { useState, useEffect } from 'react';
import { useOrderNotifications } from '../../../contexts/OrderNotificationContext';
import { getOrders, updateOrderSummary, type Order as ApiOrder } from '../../../api/order/Order.api';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  originalQuantity?: number;
  price: number;
  status?: 'pending' | 'in-preparation' | 'ready' | 'rejected';
  rejectedReason?: string;
  foodId?: number | string; // Backend food ID for updates
  orderItemId?: number; // Backend order item ID for updates
}

export interface RejectionLog {
  orderId: string;
  orderNumber: string;
  itemName: string;
  itemId?: string;
  rejectedQty: number;
  reason?: string;
  timestamp: string;
}

interface Order {
  id: string;
  orderNumber: string;
  table: string;
  tableId: number;
  stewardId: number;
  time: string; // Original placed/created time
  placedAt?: string; // Timestamp when order was placed
  preparingAt?: string; // Timestamp when order moved to In Preparation
  readyAt?: string; // Timestamp when order became Ready to Serve
  items: OrderItem[];
  status: 'placed' | 'accepted' | 'pending' | 'ready' | 'completed';
  rejectedReason?: string;
  apiOrderId?: number; // Store the backend order ID for updates
  orderType?: string;
  taxIds?: number[];
}

function ChefDashboard() {
  const { addNotification, updateOrderStatus, addOrder, addRejectedOrder, refreshOrders } = useOrderNotifications();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch orders from backend on mount
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await getOrders();

        // Handle various possible response structures
        let apiOrders: ApiOrder[] = [];
        if (Array.isArray(response)) {
          apiOrders = response;
        } else if (response && response.data && Array.isArray(response.data.content)) {
          apiOrders = response.data.content;
        } else if (response && response.content && Array.isArray(response.content)) {
          apiOrders = response.content;
        } else if (response && response.data && Array.isArray(response.data)) {
          apiOrders = response.data;
        }

        // Map API orders to Chef Dashboard format
        const mappedOrders: Order[] = apiOrders
          .filter((o: ApiOrder) =>
            o.status === 'PLACE_ORDER' ||
            o.status === 'ACCEPTED' ||
            o.status === 'IN_PREPARED' ||
            o.status === 'READY_TO_SERVE'
          )
          .map((o: ApiOrder) => {
            // Map status from API to local format
            // PLACE_ORDER -> placed (Placed Orders column)
            // ACCEPTED/IN_PREPARED -> pending (In Preparation column)
            // READY_TO_SERVE -> ready (Ready to Serve column)
            let localStatus: Order['status'] = 'placed';
            if (o.status === 'ACCEPTED' || o.status === 'IN_PREPARED') localStatus = 'pending';
            else if (o.status === 'READY_TO_SERVE') localStatus = 'ready';
            else if (o.status === 'PLACE_ORDER') localStatus = 'placed';
            else if (o.status === 'READY_TO_ORDER' || o.status === 'COMPLETED') localStatus = 'completed';

            // Map item statuses from backend
            const mapItemStatus = (itemStatus: string | null | undefined): OrderItem['status'] => {
              if (itemStatus === 'PREPARE') return 'in-preparation';
              if (itemStatus === 'READY') return 'ready';
              return 'pending'; // PENDING or null
            };

            // Get status-specific timestamps from backend or use defaults
            const createdTime = o.createdDateTime || new Date().toLocaleTimeString();
            // Backend may provide these fields - use them if available
            const preparingAtTime = (o as any).preparingAt || (o as any).inPreparationAt || (o as any).acceptedAt;
            const readyAtTime = (o as any).readyAt || (o as any).readyToServeAt;

            return {
              id: String(o.id),
              orderNumber: `ORD-${String(o.id).padStart(3, '0')}`,
              table: o.tableNumber || `T${o.tableId || '-'}`,
              tableId: o.tableId || 1,
              stewardId: o.stewardId || 1,
              time: createdTime, // Original placed time
              placedAt: createdTime,
              preparingAt: preparingAtTime || undefined,
              readyAt: readyAtTime || undefined,
              items: (o.orderItems || []).map((item, idx) => ({
                id: `${o.id}-${item.id || idx}`,
                name: item.itemName || item.name || 'Unknown Item',
                quantity: item.quantity,
                price: item.price,
                status: mapItemStatus(item.status),
                foodId: item.foodId || item.id,
                orderItemId: typeof item.id === 'number' ? item.id : parseInt(String(item.id))
              })),
              status: localStatus,
              apiOrderId: typeof o.id === 'number' ? o.id : parseInt(String(o.id)),
              orderType: o.orderType || 'DINE_IN',
              taxIds: o.taxIds || [1]
            };
          });

        setOrders(mappedOrders);

        // Sync "Ready" orders with shared context so Header can show them
        mappedOrders.forEach(order => {
          if (order.status === 'ready') {
            addOrder(order);
          }
        });
      } catch (err) {
        console.error('Failed to fetch orders for Chef Dashboard', err);
        // Set empty if API fails
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();

    // Poll for new orders every 10 seconds
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  // Quantity Update Modal State
  const [qtyUpdateModalOpen, setQtyUpdateModalOpen] = useState(false);
  const [qtyUpdateData, setQtyUpdateData] = useState<{ orderId: string; itemId: string; itemName: string; currentQty: number } | null>(null);
  const [newQuantity, setNewQuantity] = useState('');
  const [updateReason, setUpdateReason] = useState('');

  // Track minimized items
  const [minimizedItems, setMinimizedItems] = useState<Set<string>>(new Set());

  // Item-level rejection modal state
  const [itemRejectModalOpen, setItemRejectModalOpen] = useState(false);
  const [itemToReject, setItemToReject] = useState<{ orderId: string; item: OrderItem } | null>(null);
  const [itemRejectReason, setItemRejectReason] = useState('');

  // Track rejection logs (sent to Admin)
  // const [rejectionLogs, setRejectionLogs] = useState<RejectionLog[]>([]);

  const placedOrders = orders.filter((o) => o.status === 'placed');
  const pendingOrders = orders.filter((o) => o.status === 'pending');
  const readyOrders = orders.filter((o) => o.status === 'ready');

  // Reduce item quantity by 1
  /*
  const handleReduceQuantity = (orderId: string, itemId: string) => {
    setOrders(prev => prev.map(order => {
      if (order.id === orderId) {
        return {
          ...order,
          items: order.items.map(item => {
            if (item.id === itemId && item.quantity > 1) {
              return {
                ...item,
                quantity: item.quantity - 1,
                originalQuantity: item.originalQuantity ?? item.quantity
              };
            }
            return item;
          })
        };
      }
      return order;
    }));
  };
  */

  // Open quantity update modal
  /*
  const openQtyUpdateModal = (orderId: string, item: OrderItem) => {
    setQtyUpdateData({ orderId, itemId: item.id, itemName: item.name, currentQty: item.quantity });
    setNewQuantity(item.quantity.toString());
    setUpdateReason('');
    setQtyUpdateModalOpen(true);
  };
  */

  // Confirm quantity update
  const confirmQtyUpdate = () => {
    if (!qtyUpdateData || !updateReason.trim()) {
      alert('Please provide a reason for the quantity change');
      return;
    }
    const qty = parseInt(newQuantity);
    if (isNaN(qty) || qty < 1) {
      alert('Please enter a valid quantity (minimum 1)');
      return;
    }

    const order = orders.find(o => o.id === qtyUpdateData.orderId);
    if (order) {
      // Update the quantity
      setOrders(prev => prev.map(o => {
        if (o.id === qtyUpdateData.orderId) {
          return {
            ...o,
            items: o.items.map(item =>
              item.id === qtyUpdateData.itemId
                ? { ...item, quantity: qty, originalQuantity: item.originalQuantity ?? item.quantity }
                : item
            )
          };
        }
        return o;
      }));

      // Send notification to Admin
      addNotification({
        orderNumber: order.orderNumber,
        table: order.table,
        status: 'QUANTITY_UPDATED' as any,
      });

      console.log(`Chef updated ${qtyUpdateData.itemName} qty from ${qtyUpdateData.currentQty} to ${qty}. Reason: ${updateReason}`);
    }

    // Close modal
    setQtyUpdateModalOpen(false);
    setQtyUpdateData(null);
    setNewQuantity('');
    setUpdateReason('');
  };

  const cancelQtyUpdate = () => {
    setQtyUpdateModalOpen(false);
    setQtyUpdateData(null);
    setNewQuantity('');
    setUpdateReason('');
  };

  // Reject remaining quantity (difference between original and current)
  const handleRejectRemaining = (orderId: string, itemId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    const item = order.items.find(i => i.id === itemId);
    if (!item || !item.originalQuantity) return;

    const rejectedQty = item.originalQuantity - item.quantity;
    if (rejectedQty <= 0) return;

    // Log the rejection (send to Admin)
    // const log: RejectionLog = {
    //   orderId,
    //   orderNumber: order.orderNumber,
    //   itemName: item.name,
    //   rejectedQty,
    //   timestamp: new Date().toLocaleTimeString()
    // };
    // setRejectionLogs(prev => [...prev, log]);

    // Send notification to Admin
    addNotification({
      orderNumber: order.orderNumber,
      table: order.table,
      status: 'READY_TO_SERVE',
    });
    console.log(`Chef rejected ${rejectedQty} qty of ${item.name} from order ${order.orderNumber}`);

    // Clear the original quantity (rejection confirmed)
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          items: o.items.map(i =>
            i.id === itemId ? { ...i, originalQuantity: undefined } : i
          )
        };
      }
      return o;
    }));
  };

  // Toggle item minimize state
  const toggleMinimize = (orderId: string, itemId: string) => {
    const key = `${orderId}-${itemId}`;
    setMinimizedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  // Start preparing an item (changes item status to PREPARE)
  const handleStartPrepare = async (orderId: string, itemId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          items: o.items.map(item =>
            item.id === itemId ? { ...item, status: 'in-preparation' as const } : item
          )
        };
      }
      return o;
    }));

    // Sync with backend - update order with item status PREPARE
    if (order.apiOrderId) {
      try {
        const updatedItems = order.items.map(item => ({
          orderItemId: item.orderItemId || parseInt(item.id.split('-')[1]) || 1,
          quantity: item.quantity,
          status: item.id === itemId ? 'PREPARE' : (item.status === 'in-preparation' ? 'PREPARE' : item.status === 'ready' ? 'READY' : 'PENDING')
        }));

        await updateOrderSummary(order.apiOrderId, {
          tableId: order.tableId,
          stewardId: order.stewardId,
          orderItems: updatedItems,
          taxIds: [1],
          orderType: 'DINE_IN',
          status: 'IN_PREPARED'
        });
      } catch (err) {
        console.error('Failed to update item status', err);
      }
    }
  };

  // Complete an item (mark as ready - changes item status to READY)
  const handleCompleteItem = async (orderId: string, itemId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    // Calculate if all items will be ready after this update
    const updatedItems = order.items.map(item =>
      item.id === itemId ? { ...item, status: 'ready' as const } : item
    );
    const allReady = updatedItems.every(item => item.status === 'ready');

    // Set readyAt timestamp if all items become ready
    const readyTimestamp = allReady ? new Date().toLocaleTimeString() : undefined;

    setOrders(prev => {
      const updated = prev.map(o => {
        if (o.id === orderId) {
          return {
            ...o,
            items: updatedItems,
            status: allReady ? 'ready' as const : o.status,
            readyAt: allReady ? readyTimestamp : o.readyAt
          };
        }
        return o;
      });

      // Find the order to check if notification should be sent
      const updatedOrder = updated.find(o => o.id === orderId);
      if (updatedOrder && updatedOrder.status === 'ready') {
        updateOrderStatus(orderId, 'READY_TO_SERVE');
        addOrder({ ...updatedOrder, status: 'READY_TO_SERVE' as any });
        addNotification({
          orderNumber: updatedOrder.orderNumber,
          table: updatedOrder.table,
          status: 'READY_TO_SERVE',
        });
      }

      return updated;
    });

    // Sync with backend
    if (order.apiOrderId) {
      try {
        const backendItems = order.items.map(item => ({
          orderItemId: item.orderItemId || parseInt(item.id.split('-')[1]) || 1,
          quantity: item.quantity,
          status: item.id === itemId ? 'READY' : (item.status === 'ready' ? 'READY' : item.status === 'in-preparation' ? 'PREPARE' : 'PENDING')
        }));

        await updateOrderSummary(order.apiOrderId, {
          tableId: order.tableId,
          stewardId: order.stewardId,
          orderItems: backendItems,
          taxIds: [1],
          orderType: 'DINE_IN',
          status: allReady ? 'READY_TO_SERVE' : 'IN_PREPARED'
        });
      } catch (err) {
        console.error('Failed to update item completion status', err);
      }
    }
  };

  const handleAcceptOrder = async (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    // Set preparingAt timestamp when order moves to In Preparation
    const preparingTimestamp = new Date().toLocaleTimeString();
    const updatedOrder = { ...order, status: 'pending' as const, preparingAt: preparingTimestamp };
    setOrders((orders) =>
      orders.map((o) => (o.id === orderId ? updatedOrder : o))
    );

    // Sync with shared orders
    updateOrderStatus(orderId, 'pending');
    addOrder(updatedOrder);

    // Update backend status to IN_PREPARED (order moves to In Preparation column)
    if (order.apiOrderId) {
      try {
        const updatePayload = {
          tableId: order.tableId,
          stewardId: order.stewardId,
          orderItems: order.items.map(item => ({
            orderItemId: item.orderItemId || parseInt(item.id.split('-')[1]) || 1,
            quantity: item.quantity,
            status: 'PENDING' // Initial state on accept
          })),
          taxIds: [1],
          orderType: 'DINE_IN',
          status: 'IN_PREPARED' // Move to In Preparation
        };
        console.log('Updating order to IN_PREPARED:', order.apiOrderId, updatePayload);
        const result = await updateOrderSummary(order.apiOrderId, updatePayload);
        console.log('Update result:', result);
      } catch (err) {
        console.error('Failed to update order status on backend', err);
      }
    } else {
      console.warn('No apiOrderId found for order:', orderId);
    }

    // Clear any selections for this order
    const orderItemKeys = order.items.map((item) => `${orderId}-${item.id}`);
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      orderItemKeys.forEach((key) => newSet.delete(key));
      return newSet;
    });
  };

  const handleRejectClick = (orderId: string) => {
    setSelectedOrderId(orderId);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async () => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejecting this order');
      return;
    }

    if (selectedOrderId) {
      const order = orders.find(o => o.id === selectedOrderId);
      if (order) {
        addRejectedOrder(order, rejectReason);

        // Store reason locally for persistent retrieval (since backend doesn't store it)
        try {
          const reasons = JSON.parse(localStorage.getItem('order_rejection_reasons') || '{}');
          reasons[order.apiOrderId || order.id] = rejectReason;
          localStorage.setItem('order_rejection_reasons', JSON.stringify(reasons));
        } catch (e) {
          console.error('Failed to save rejection reason to localStorage', e);
        }

        // Update backend status to REJECTED
        if (order.apiOrderId) {
          try {
            await updateOrderSummary(order.apiOrderId, {
              tableId: order.tableId,
              stewardId: order.stewardId,
              orderItems: order.items.map(item => ({
                orderItemId: item.orderItemId || (typeof item.id === 'string' ? parseInt(item.id.split('-')[1]) : Number(item.id)) || 1,
                quantity: item.quantity,
                status: 'PENDING'
              })),
              orderType: order.orderType || 'DINE_IN',
              status: 'REJECTED'
            });
            // Refresh global context to show in Header immediately
            refreshOrders();
          } catch (err) {
            console.error('Failed to update rejection status on backend', err);
          }
        }
      }
      setOrders((orders) =>
        orders.map((order) =>
          order.id === selectedOrderId
            ? { ...order, status: 'rejected' as any, rejectedReason: rejectReason }
            : order
        )
      );
    }

    setRejectModalOpen(false);
    setSelectedOrderId(null);
    setRejectReason('');
  };

  const handleCancelReject = () => {
    setRejectModalOpen(false);
    setSelectedOrderId(null);
    setRejectReason('');
  };

  // Open item rejection modal
  const handleItemRejectClick = (orderId: string, item: OrderItem) => {
    setItemToReject({ orderId, item });
    setItemRejectReason('');
    setItemRejectModalOpen(true);
  };

  // Confirm item rejection
  const handleConfirmItemReject = async () => {
    if (!itemRejectReason.trim()) {
      alert('Please provide a reason for rejecting this item');
      return;
    }

    if (itemToReject) {
      const { orderId, item } = itemToReject;
      const order = orders.find(o => o.id === orderId);

      if (order) {
        // Log the rejection (for Admin)
        // const log: RejectionLog = {
        //   orderId,
        //   orderNumber: order.orderNumber,
        //   itemName: item.name,
        //   itemId: item.id,
        //   rejectedQty: item.quantity,
        //   reason: itemRejectReason,
        //   timestamp: new Date().toLocaleTimeString()
        // };
        // setRejectionLogs(prev => [...prev, log]);

        // Contextual reason as requested by user
        const contextReason = `Order #${order.orderNumber} has rejected item(s). Reason: ${itemRejectReason}`;

        // Prepare order object for Admin with rejected item info
        const orderForAdmin = {
          ...order,
          rejectedReason: contextReason,
          rejectedItems: [{ ...item, reason: itemRejectReason }]
        };

        // Trigger full rejection workflow
        addRejectedOrder(orderForAdmin, contextReason);

        // Store reason locally for persistent retrieval
        try {
          const reasons = JSON.parse(localStorage.getItem('order_rejection_reasons') || '{}');
          reasons[order.apiOrderId || order.id] = contextReason;
          localStorage.setItem('order_rejection_reasons', JSON.stringify(reasons));
        } catch (e) {
          console.error('Failed to save item rejection reason to localStorage', e);
        }

        console.log(`Chef rejected item: ${item.name} from order ${order.orderNumber}. Reason: ${itemRejectReason}`);

        // Mark the entire order as rejected locally (to follow full order workflow)
        setOrders(prev => prev.map(o => {
          if (o.id === orderId) {
            return {
              ...o,
              status: 'rejected' as any,
              rejectedReason: contextReason,
            };
          }
          return o;
        }));

        // Sync with backend - Mark entire order as REJECTED
        if (order.apiOrderId) {
          try {
            await updateOrderSummary(order.apiOrderId, {
              tableId: order.tableId,
              stewardId: order.stewardId,
              orderItems: order.items.map(i => ({
                orderItemId: i.orderItemId || (typeof i.id === 'string' ? parseInt(i.id.split('-')[1]) : Number(i.id)) || 1,
                quantity: i.quantity,
                status: 'PENDING'
              })),
              orderType: order.orderType || 'DINE_IN',
              status: 'REJECTED'
            });
            // Refresh global context to show in Header immediately
            refreshOrders();
          } catch (err) {
            console.error('Failed to sync item rejection to backend', err);
          }
        }
      }
    }

    setItemRejectModalOpen(false);
    setItemToReject(null);
    setItemRejectReason('');
  };

  // Cancel item rejection
  const handleCancelItemReject = () => {
    setItemRejectModalOpen(false);
    setItemToReject(null);
    setItemRejectReason('');
  };

  const toggleItemSelection = (orderId: string, itemId: string) => {
    const key = `${orderId}-${itemId}`;
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const handleSelectAll = (orderId: string, order: Order) => {
    const allItemKeys = order.items.map((item) => `${orderId}-${item.id}`);
    const allSelected = allItemKeys.every((key) => selectedItems.has(key));

    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (allSelected) {
        allItemKeys.forEach((key) => newSet.delete(key));
      } else {
        allItemKeys.forEach((key) => newSet.add(key));
      }
      return newSet;
    });
  };

  const handleMarkReady = async (orderId: string) => {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;

    const orderItemKeys = order.items.map((item) => `${orderId}-${item.id}`);
    const hasSelectedItems = orderItemKeys.some((key) => selectedItems.has(key));

    if (!hasSelectedItems) {
      alert('Please select at least one item to mark as ready');
      return;
    }

    // Set readyAt timestamp when order becomes Ready to Serve
    const readyTimestamp = new Date().toLocaleTimeString();
    const updatedOrder = { ...order, status: 'ready' as const, readyAt: readyTimestamp };
    setOrders((orders) =>
      orders.map((o) => (o.id === orderId ? updatedOrder : o))
    );

    // Update shared order status and sync order
    updateOrderStatus(orderId, 'READY_TO_SERVE');
    addOrder({ ...updatedOrder, status: 'READY_TO_SERVE' as any });

    // Trigger notification for Steward and Admin
    addNotification({
      orderNumber: order.orderNumber,
      table: order.table,
      status: 'READY_TO_SERVE',
    });

    // Sync with backend - set status to READY_TO_SERVE
    if (order.apiOrderId) {
      try {
        const updatePayload = {
          tableId: order.tableId,
          stewardId: order.stewardId,
          orderItems: order.items.map(item => ({
            orderItemId: item.orderItemId || parseInt(item.id.split('-')[1]) || 1,
            quantity: item.quantity,
            status: 'READY' // All items should be ready when order is marked ready
          })),
          taxIds: [1],
          orderType: 'DINE_IN',
          status: 'READY_TO_SERVE'
        };
        console.log('Updating order to READY_TO_SERVE:', order.apiOrderId, updatePayload);
        const result = await updateOrderSummary(order.apiOrderId, updatePayload);
        console.log('Update result:', result);
      } catch (err) {
        console.error('Failed to update order to READY_TO_SERVE', err);
      }
    } else {
      console.warn('No apiOrderId for order:', orderId);
    }

    // Clear selections for this order
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      orderItemKeys.forEach((key) => newSet.delete(key));
      return newSet;
    });
  };



  // Get item status badge color
  const getStatusBadgeStyle = (status?: string) => {
    switch (status) {
      case 'in-preparation':
        return { background: '#fef3c7', color: '#d97706', border: '1px solid #fcd34d' };
      case 'ready':
        return { background: '#d1fae5', color: '#059669', border: '1px solid #6ee7b7' };
      default:
        return { background: '#e5e7eb', color: '#6b7280', border: '1px solid #d1d5db' };
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'in-preparation': return 'In Prep';
      case 'ready': return 'Ready';
      default: return 'Pending';
    }
  };

  return (
    <div className="chef-dashboard-container" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%', overflow: 'hidden' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', flex: 1, overflow: 'hidden' }}>
        {/* Placed Orders Section */}
        <div className="chef-section" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <h3 className="chef-section-title">Placed Orders</h3>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {loading ? (
              <p className="no-orders">Loading orders...</p>
            ) : placedOrders.length === 0 ? (
              <p className="no-orders">No placed orders</p>
            ) : (
              placedOrders.map((order) => (
                <div key={order.id} className="chef-order-card">
                  <div className="chef-order-header">
                    <div>
                      <strong>Order: {order.orderNumber}</strong>
                      <p className="chef-order-meta">{order.table} • {order.placedAt || order.time}</p>
                    </div>
                  </div>
                  <div className="chef-order-items">
                    {order.items.map((item) => {
                      const hasReduction = item.originalQuantity && item.originalQuantity > item.quantity;
                      return (
                        <div key={item.id} className="chef-order-item" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                          <span style={{ flex: 1 }}>{item.name}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.85rem', color: '#374151', fontWeight: 500 }}>×{item.quantity}</span>
                            {/* Item-level Reject Button */}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleItemRejectClick(order.id, item); }}
                              style={{
                                width: '22px', height: '22px',
                                background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5',
                                borderRadius: '4px', fontSize: '0.7rem', fontWeight: 'bold',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                              }}
                              title="Reject this item"
                            >✕</button>
                          </div>
                          {hasReduction && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRejectRemaining(order.id, item.id); }}
                              style={{
                                marginTop: '0.25rem', width: '100%',
                                background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5',
                                borderRadius: '4px', padding: '0.2rem 0.4rem', fontSize: '0.65rem',
                                cursor: 'pointer'
                              }}
                            >
                              Reject Remaining
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="chef-order-actions">
                    <button
                      className="chef-btn chef-btn-accept"
                      onClick={() => handleAcceptOrder(order.id)}
                    >
                      Accept Order
                    </button>
                    <button
                      className="chef-btn chef-btn-reject"
                      onClick={() => handleRejectClick(order.id)}
                    >
                      Reject Order
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pending Orders Section (In Preparation) */}
        <div className="chef-section" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <h3 className="chef-section-title">In Preparation</h3>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {pendingOrders.length === 0 ? (
              <p className="no-orders">No orders in preparation</p>
            ) : (
              pendingOrders.map((order) => {
                const orderItemKeys = order.items.map((item) => `${order.id}-${item.id}`);
                const allSelected = orderItemKeys.every((key) => selectedItems.has(key));
                const hasSelected = orderItemKeys.some((key) => selectedItems.has(key));

                return (
                  <div key={order.id} className="chef-order-card">
                    <div className="chef-order-header">
                      <div>
                        <strong>Order: {order.orderNumber}</strong>
                        <p className="chef-order-meta">{order.table} • {order.preparingAt || order.time}</p>
                      </div>
                    </div>
                    <div className="chef-order-items">
                      {order.items.length > 0 ? (
                        <>
                          <button
                            className="chef-select-all-btn"
                            onClick={() => handleSelectAll(order.id, order)}
                          >
                            {allSelected ? 'Deselect All' : 'Select All Items'}
                          </button>
                          {order.items.map((item) => {
                            const itemKey = `${order.id}-${item.id}`;
                            const isSelected = selectedItems.has(itemKey);
                            const isMinimized = minimizedItems.has(itemKey);

                            return (
                              <div
                                key={item.id}
                                className={`chef-order-item ${isSelected ? 'selected' : ''}`}
                                style={{
                                  padding: isMinimized ? '0.4rem 0.5rem' : '0.5rem',
                                  transition: 'all 0.2s ease',
                                  gap: '0.5rem'
                                }}
                              >
                                {/* Minimized View */}
                                {isMinimized ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
                                    <span style={{ flex: 1, fontSize: '0.8rem' }}>{item.name}</span>
                                    <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>×{item.quantity}</span>
                                    <span style={{
                                      ...getStatusBadgeStyle(item.status),
                                      padding: '0.15rem 0.4rem',
                                      borderRadius: '4px',
                                      fontSize: '0.65rem',
                                      fontWeight: 500
                                    }}>{getStatusLabel(item.status)}</span>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); toggleMinimize(order.id, item.id); }}
                                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.1rem', fontSize: '0.7rem' }}
                                      title="Expand"
                                    >⬇️</button>
                                  </div>
                                ) : (
                                  /* Expanded View */
                                  <>
                                    <div
                                      onClick={() => toggleItemSelection(order.id, item.id)}
                                      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', flex: 1 }}
                                    >
                                      <span>{item.name}</span>
                                      <span style={{ color: '#6b7280', fontSize: '0.85rem' }}> Qty: {item.quantity}</span>
                                      {isSelected && <span className="check-mark">✓</span>}
                                    </div>

                                    {/* Status & Action Buttons */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginLeft: 'auto' }}>
                                      <span style={{
                                        ...getStatusBadgeStyle(item.status),
                                        padding: '0.2rem 0.5rem',
                                        borderRadius: '4px',
                                        fontSize: '0.7rem',
                                        fontWeight: 500
                                      }}>{getStatusLabel(item.status)}</span>

                                      {/* Prepare Button - Only show for pending items */}
                                      {item.status === 'pending' && (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleStartPrepare(order.id, item.id); }}
                                          style={{
                                            background: '#fbbf24',
                                            color: '#000',
                                            border: 'none',
                                            borderRadius: '6px',
                                            padding: '0.3rem 0.6rem',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                          }}
                                          title="Start Preparation"
                                        >Prepare</button>
                                      )}

                                      {/* Complete Button - Only show for in-preparation items */}
                                      {item.status === 'in-preparation' && (
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleCompleteItem(order.id, item.id); }}
                                          style={{
                                            background: '#fff',
                                            color: '#fbbf24',
                                            border: '1px solid #fbbf24',
                                            borderRadius: '6px',
                                            padding: '0.3rem 0.6rem',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            transition: 'all 0.2s'
                                          }}
                                          title="Mark as Ready"
                                        >Complete</button>
                                      )}

                                      {/* Minimize Button */}
                                      <button
                                        onClick={(e) => { e.stopPropagation(); toggleMinimize(order.id, item.id); }}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.1rem', fontSize: '0.7rem' }}
                                        title="Minimize"
                                      >⬆️</button>
                                    </div>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </>
                      ) : (
                        <p style={{ fontSize: '0.85rem', color: '#6b7280', textAlign: 'center', padding: '1rem', fontStyle: 'italic' }}>
                          No food items found for this order.
                        </p>
                      )}
                    </div>
                    {order.items.length > 0 && (
                      <div className="chef-order-actions">
                        <button
                          className="chef-btn chef-btn-ready"
                          onClick={() => handleMarkReady(order.id)}
                          disabled={!hasSelected}
                          style={{ opacity: hasSelected ? 1 : 0.5, cursor: hasSelected ? 'pointer' : 'not-allowed' }}
                        >
                          Mark Order Ready
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Ready to Serve Section */}
        <div className="chef-section" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <h3 className="chef-section-title">Ready to Serve</h3>
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {readyOrders.length === 0 ? (
              <p className="no-orders">No ready orders</p>
            ) : (
              readyOrders.map((order) => (
                <div key={order.id} className="chef-order-card chef-order-ready">
                  <div className="chef-order-header">
                    <div>
                      <strong>Order: {order.orderNumber}</strong>
                      <p className="chef-order-meta">{order.table} • {order.readyAt || order.time}</p>
                    </div>
                    <span className="ready-badge">Ready for pickup</span>
                  </div>
                  <div className="chef-order-items">
                    {order.items.map((item) => {
                      const itemKey = `${order.id}-${item.id}`;
                      const isMinimized = minimizedItems.has(itemKey);

                      return (
                        <div
                          key={item.id}
                          className="chef-order-item"
                          style={{ padding: isMinimized ? '0.4rem 0.5rem' : '0.5rem' }}
                        >
                          {isMinimized ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
                              <span style={{ flex: 1, fontSize: '0.8rem' }}>{item.name}</span>
                              <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>×{item.quantity}</span>
                              <span style={{
                                background: '#d1fae5', color: '#059669', border: '1px solid #6ee7b7',
                                padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.65rem', fontWeight: 500
                              }}>Ready</span>
                              <button
                                onClick={() => toggleMinimize(order.id, item.id)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.1rem', fontSize: '0.7rem' }}
                              >⬇️</button>
                            </div>
                          ) : (
                            <>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                                <span>{item.name}</span>
                                <span style={{ color: '#6b7280', fontSize: '0.85rem' }}> Qty: {item.quantity}</span>
                              </div>
                              <span style={{
                                background: '#d1fae5', color: '#059669', border: '1px solid #6ee7b7',
                                padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 500, marginLeft: 'auto'
                              }}>Ready</span>
                              <button
                                onClick={() => toggleMinimize(order.id, item.id)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.1rem', fontSize: '0.7rem', marginLeft: '0.5rem' }}
                              >⬆️</button>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Rejection Modal */}
      {rejectModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>Reject Order</h3>
              <button className="close-button" onClick={handleCancelReject}>
                ✕
              </button>
            </div>
            <div style={{ padding: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                Reason for rejecting this order <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                required
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                <button
                  className="chef-btn chef-btn-cancel"
                  onClick={handleCancelReject}
                  style={{ background: '#e5e7eb', color: '#374151' }}
                >
                  Cancel
                </button>
                <button
                  className="chef-btn chef-btn-reject"
                  onClick={handleConfirmReject}
                  disabled={!rejectReason.trim()}
                  style={{ opacity: rejectReason.trim() ? 1 : 0.5, cursor: rejectReason.trim() ? 'pointer' : 'not-allowed' }}
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quantity Update Modal */}
      {qtyUpdateModalOpen && qtyUpdateData && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Update Quantity</h3>
              <button className="close-button" onClick={cancelQtyUpdate}>
                ✕
              </button>
            </div>
            <div style={{ padding: '1rem' }}>
              <p style={{ marginBottom: '1rem', color: '#374151' }}>
                <strong>{qtyUpdateData.itemName}</strong>
                <br />
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Current quantity: {qtyUpdateData.currentQty}</span>
              </p>

              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                New Quantity <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input
                type="number"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                min="1"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  marginBottom: '1rem'
                }}
              />

              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                Reason <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                value={updateReason}
                onChange={(e) => setUpdateReason(e.target.value)}
                placeholder="e.g., Stock not available, Only limited portion possible"
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />

              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                <button
                  className="chef-btn"
                  onClick={cancelQtyUpdate}
                  style={{ background: '#e5e7eb', color: '#374151' }}
                >
                  Cancel
                </button>
                <button
                  className="chef-btn chef-btn-accept"
                  onClick={confirmQtyUpdate}
                  disabled={!updateReason.trim() || !newQuantity}
                  style={{ opacity: (updateReason.trim() && newQuantity) ? 1 : 0.5, cursor: (updateReason.trim() && newQuantity) ? 'pointer' : 'not-allowed' }}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Item Rejection Modal */}
      {itemRejectModalOpen && itemToReject && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="modal-header" style={{ background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)', borderBottom: '1px solid #fca5a5' }}>
              <h3 style={{ color: '#dc2626' }}>Reject Item</h3>
              <button className="close-button" onClick={handleCancelItemReject}>
                ✕
              </button>
            </div>
            <div style={{ padding: '1.25rem' }}>
              <div style={{
                background: '#f9fafb',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                marginBottom: '1rem',
                border: '1px solid #e5e7eb'
              }}>
                <p style={{ margin: 0, fontWeight: 600, color: '#1f2937' }}>{itemToReject.item.name}</p>
              </div>

              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#374151' }}>
                Enter reason for rejection <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                value={itemRejectReason}
                onChange={(e) => setItemRejectReason(e.target.value)}
                placeholder="e.g., Ingredient out of stock, Item unavailable..."
                required
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleCancelItemReject}
                  style={{
                    padding: '0.6rem 1.25rem',
                    background: '#e5e7eb',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: '0.9rem',
                    transition: 'all 0.2s'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmItemReject}
                  disabled={!itemRejectReason.trim()}
                  style={{
                    padding: '0.6rem 1.25rem',
                    background: itemRejectReason.trim() ? '#dc2626' : '#fca5a5',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    cursor: itemRejectReason.trim() ? 'pointer' : 'not-allowed',
                    fontSize: '0.9rem',
                    transition: 'all 0.2s'
                  }}
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChefDashboard;
