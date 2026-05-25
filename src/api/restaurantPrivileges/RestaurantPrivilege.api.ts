import instance from "../instance";

// Paginated Response Interface
export interface PaginatedContent<T> {
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

export interface RestaurantPrivilege {
    id: number;
    privilege_id: number;
    restaurant_id: number;
    privilege_name: string;
    active?: boolean;
}

export interface ApiResponse<T> {
    statusCode: number;
    statusMessage: string;
    data: T;
}

// Get privileges by restaurant ID
export const getRestaurantPrivileges = async (restaurantId: number | string): Promise<ApiResponse<PaginatedContent<RestaurantPrivilege>>> => {
    try {
        const response = await instance.get<ApiResponse<PaginatedContent<RestaurantPrivilege>>>(`settings/${restaurantId}/restaurantPrivilege?page=0&size=100`);
        return response.data;
    } catch (err) {
        console.error("Failed to fetch restaurant privileges", err);
        throw err;
    }
};
