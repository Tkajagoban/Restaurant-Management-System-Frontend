import instance from "../instance";

// ========== INTERFACES ==========

export interface OrderSummaryItem {
    id: number;
    orderId: string;
    tableId?: number;
    tableNumber?: string;
    stewardId?: number;
    stewardName?: string;
    subTotal: number;
    grandTotal: number;
    taxTotal: number;
    serviceCharge: number;
    orderType: 'DINE_IN' | 'TAKEAWAY';
    status: string;
    createdDateTime: string;
    orderItems?: any[]; // Using any[] temporarily or import OrderItemDetail if possible to avoid circular dep
}

export interface OrderSummaryResponse {
    content: OrderSummaryItem[];
    pageNumber: number;
    pageSize: number;
    totalElements: number;
    totalPages: number;
    first: boolean;
    last: boolean;
}

// ========== API FUNCTIONS ==========

/**
 * Get all Order Summaries with pagination
 * @param page Page number (default: 0)
 * @param size Items per page (default: 100)
 * @returns Promise<OrderSummaryResponse>
 */
export const getAllOrderSummary = async (
    page: number = 0,
    size: number = 100
): Promise<OrderSummaryResponse> => {
    try {
        const response = await instance.get<OrderSummaryResponse>(
            'settings/orders',
            {
                params: { page, size }
            }
        );
        return response.data;
    } catch (err) {
        console.error("Failed to fetch order summaries", err);
        throw err;
    }
};

/**
 * Get Order Summary by ID
 * @param id Order Summary ID
 * @returns Promise<OrderSummaryItem>
 */
export const getOrderSummaryById = async (
    id: number
): Promise<OrderSummaryItem> => {
    try {
        const response = await instance.get<{ data: OrderSummaryItem }>(
            `settings/ordersummary/${id}`
        );
        return response.data.data;
    } catch (err) {
        console.error(`Failed to fetch order summary ${id}`, err);
        throw err;
    }
};
