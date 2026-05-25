import instance from "../instance";

// ========== INTERFACES ==========

export interface OrderItemRequest {
  foodId: number;
  quantity: number;
  price: number;
  status?: string;
}

export interface OrderItemUpdate {
  orderItemId?: number;
  foodId?: number;
  quantity: number;
  status: string;
}

export interface OrderItem {
  id?: number | string;
  itemName?: string;
  name?: string;
  foodId?: number;
  quantity: number;
  price: number;
  status?: string | null;
}

export interface Order {
  id: number | string;
  orderId?: string;
  tableId?: number;
  tableNumber?: string;
  table?: string;
  stewardId?: number;
  stewardName?: string;
  steward?: string;
  orderItems: OrderItem[];
  subTotal?: number | null;
  taxTotal?: number | null;
  serviceCharge?: number | null;
  taxIds?: number[];
  grandTotal?: number;
  orderType: string;
  status: string | null;
  createdDateTime?: string;
  placedAt?: string;
}

export interface PlaceOrderRequest {
  grandTotal: number;
  orderType: string;
  orderstatus: string;
  subtotal: number;
  resturantTablesId: number;
  stewardId: number;
  taxIds: number[];
  orderItems: {
    foodId: number;
    quantity: number;
  }[];
}

export interface UpdateOrderRequest {
  tableId?: number;
  stewardId?: number;
  orderItems: OrderItemUpdate[];
  taxIds?: number[];
  orderType?: string;
  status: string;
}

export interface ApiResponse<T> {
  statusCode: number;
  statusMessage: string;
  data: T;
}

export interface PaginatedResponse<T> {
  content: T[];
  empty: boolean;
  first: boolean;
  last: boolean;
  number: number;
  numberOfElements: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

// ========== API FUNCTIONS ==========

// ---------- GET ORDERS (list) ----------
export const getOrders = async (params?: { page?: number; size?: number }): Promise<any> => {
  try {
    const response = await instance.get<any>('settings/orders', { params });
    // The interceptor returns the full axios response object
    // If the backend returns a flat array, it will be in response.data
    // If it returns ApiResponse wrapper, it will also be in response.data
    return response.data;
  } catch (err) {
    console.error("Failed to fetch orders via API", err);
    throw err;
  }
};

// ---------- POST ORDER (Place Order) ----------
export const placeOrderSummary = async (payload: PlaceOrderRequest): Promise<ApiResponse<any>> => {
  try {
    const response = await instance.post<ApiResponse<any>>('settings/ordersummary/added', payload);
    return response.data;
  } catch (err) {
    console.error("Failed to place order", err);
    throw err;
  }
};

// ---------- PUT ORDER (Update Order) ----------
export const updateOrderSummary = async (id: number | string, payload: UpdateOrderRequest): Promise<ApiResponse<any>> => {
  try {
    const response = await instance.put<ApiResponse<any>>(`settings/ordersummary/${id}`, payload);
    return response.data;
  } catch (err) {
    console.error("Failed to update order", err);
    throw err;
  }
};

// ---------- Legacy createOrder for Dashboard compatibility ----------
export const createOrder = async (payload: any): Promise<ApiResponse<Order>> => {
  // Map to new API format
  const orderItems = payload.orderItems || [];

  const subtotal = orderItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0);

  // ✅ ONLY send IDs to backend, not string values for steward/table
  const requestBody: PlaceOrderRequest = {
    grandTotal: subtotal, // Will be calculated with tax on backend
    orderType: payload.orderType === 'dine-in' ? 'DINE_IN' : 'TAKE_AWAY',
    orderstatus: 'PLACE_ORDER',
    subtotal: subtotal,
    // Only send ID values - backend validates these strictly
    resturantTablesId: payload.tableId,
    stewardId: payload.stewardId,
    taxIds: payload.taxIds || [1],
    orderItems: orderItems.map((item: any) => ({
      foodId: item.foodId || (item.id && !isNaN(Number(item.id)) ? Number(item.id) : 1),
      quantity: item.quantity || 1
    }))
  };
  console.log('Sending Order Summary:', requestBody);

  try {
    const response = await placeOrderSummary(requestBody);

    // Map response back to Order format for Dashboard (includes display strings for UI)
    // Extract ID robustly using recursive search. Handle various response formats from the backend
    let serverId: number | string = '';

    const findIdRecursive = (obj: any): any => {
      if (!obj || typeof obj !== 'object') return null;

      // Try common ID fields
      const possibleIds = ['id', 'orderID', 'orderId', 'order_id', 'orderSummaryId', 'order_summary_id'];
      for (const field of possibleIds) {
        const val = obj[field];
        if (val !== undefined && val !== null && (typeof val === 'number' || typeof val === 'string')) {
          return val;
        }
      }

      // If there's a nested 'data' property, look deeper there first
      if (obj.data) {
        const found = findIdRecursive(obj.data);
        if (found) return found;
      }

      // Look in other object properties
      for (const key in obj) {
        if (key !== 'data' && typeof obj[key] === 'object') {
          const found = findIdRecursive(obj[key]);
          if (found) return found;
        }
      }

      return null;
    };

    const extractedId = findIdRecursive(response);
    if (extractedId) {
      serverId = extractedId;
    } else {
      serverId = Date.now();
    }

    // Map response back to Order format for Dashboard
    const order: Order = {
      orderId: response.data.orderId,
      id: serverId, // Always a number or string, never an object
      orderItems: orderItems,
      orderType: payload.orderType,
      // Keep string values for UI display only, not sent to backend
      table: payload.table,
      tableId: payload.tableId,
      steward: payload.steward,
      stewardId: payload.stewardId,
      placedAt: new Date().toISOString(),
      createdDateTime: new Date().toLocaleString(),
      status: 'PLACE_ORDER',
      grandTotal: response.data?.grandTotal || subtotal,
      subTotal: subtotal,
      taxIds: payload.taxIds
    };

    return {
      statusCode: 2000,
      statusMessage: 'Order placed successfully',
      data: order
    };
  } catch (err) {
    console.error('Order placement failed', err);
    throw err; // Throw error instead of fallback to localStorage
    // Fallback to local storage if API fails
    const localId = Date.now(); // Numeric fallback
    const order: Order = {
      id: localId,
      orderItems: orderItems,
      orderType: payload.orderType,
      table: payload.table,
      steward: payload.steward,
      placedAt: new Date().toISOString(),
      createdDateTime: new Date().toLocaleString(),
      status: 'PLACE_ORDER',
      grandTotal: subtotal
    };

    // Save locally
    const existing = JSON.parse(localStorage.getItem('local_orders') || '[]') as Order[];
    localStorage.setItem('local_orders', JSON.stringify([order, ...existing]));

    return {
      statusCode: 2000,
      statusMessage: 'Created locally',
      data: order
    };
  }
};

// ---------- GET ORDER BY ID ----------
export const getOrderById = async (id: string | number): Promise<ApiResponse<Order>> => {
  try {
    const resp = await instance.get<ApiResponse<Order>>(`/orders/${id}`);
    return resp.data;
  } catch (err) {
    throw err;
  }
};

// ---------- DELETE ORDER ----------
export const deleteOrderById = async (id: number | string): Promise<ApiResponse<null>> => {
  try {
    const response = await instance.delete<ApiResponse<null>>(`/orders/${id}`);
    return response.data;
  } catch (err) {
    throw err;
  }
};

// ---------- UPDATE ORDER STATUS (legacy) ----------
export const updateOrderStatus = async (id: number | string, status: string): Promise<ApiResponse<any>> => {
  try {
    const response = await instance.patch(`/orders/${id}`, { status });
    return response.data;
  } catch (err) {
    throw err;
  }
};
