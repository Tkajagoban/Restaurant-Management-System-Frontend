import instance from "../instance";

// ========== INTERFACES ==========

export interface OrderItemDetail {
    id: number;
    itemName: string;
    foodName?: string; // Added to match backend DTO
    variant?: { name: string }; // Added for variant support
    foodId?: number;
    quantity: number;
    price: number;
    status?: string;
    orderSummaryId?: number;
}

export interface OrderItemsResponse {
    content: OrderItemDetail[];
    pageNumber: number;
    pageSize: number;
    totalElements: number;
    totalPages: number;
    first: boolean;
    last: boolean;
}

// ========== API FUNCTIONS ==========

/**
 * Get all Order Items with pagination
 * Note: Since there's no dedicated endpoint, we'll extract from order summaries
 * This is a utility function that aggregates order items
 * @param page Page number (default: 0)
 * @param size Items per page (default: 100)
 * @returns Promise<OrderItemsResponse>
 */
export const getAllOrderItems = async (
    page: number = 0,
    size: number = 100
): Promise<OrderItemsResponse> => {
    try {
        // Since there's no dedicated order items endpoint,
        // we'll need to get them from the order summaries
        // This is a placeholder - adjust based on your actual API
        const response = await instance.get<OrderItemsResponse>(
            'settings/orders',
            {
                params: { page, size }
            }
        );

        // If your API returns order items directly, use this:
        // const response = await instance.get<OrderItemsResponse>('settings/orderitems', { params: { page, size } });

        return response.data;
    } catch (err) {
        console.error("Failed to fetch order items", err);
        throw err;
    }
};

/**
 * Get Order Items by Order Summary ID
 * @param orderSummaryId The order summary ID
 * @returns Promise<OrderItemDetail[]>
 */
export const getOrderItemsByOrderId = async (
    orderSummaryId: number
): Promise<OrderItemDetail[]> => {
    try {
        const response = await instance.get<{ data: { orderItems: OrderItemDetail[] } }>(
            `settings/ordersummary/${orderSummaryId}`
        );
        return response.data.data.orderItems || [];
    } catch (err) {
        console.error(`Failed to fetch order items for order ${orderSummaryId}`, err);
        throw err;
    }
};
