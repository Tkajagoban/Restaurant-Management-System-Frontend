import instance from '../instance';

export interface UserPrivilegeDetail {
    userPrivilegeId: number;
    restaurantPrivilegeId: number;
    privilegeStatus: 'READ' | 'WRITE' | 'MAINTAIN' | 'NONE';
}

export interface UserPrivilegeResponse {
    userId: number;
    userPrivileges: Record<string, UserPrivilegeDetail>;
}

export interface RestaurantPrivilege {
    id: number;
    privilege_id: number;
    privilege_name: string;
    restaurant_id: number;
}

export interface ApiResponse<T> {
    statusCode: number;
    statusMessage: string;
    data: T;
}

/**
 * Fetch user privileges by user ID
 * @param userId - The ID of the user
 * @returns Promise with user privileges response
 */
export const getUserPrivileges = async (
    userId: number
): Promise<ApiResponse<UserPrivilegeResponse>> => {
    try {
        const response = await instance.get<ApiResponse<UserPrivilegeResponse>>(
            `userPrivilege/user/${userId}`
        );
        return response.data;
    } catch (error) {
        console.error('Error fetching user privileges:', error);
        throw error;
    }
};

/**
 * Update a single user privilege
 * @param userId - The ID of the user
 * @param payload - The privilege update data
 * @param id - Optional userPrivilege record ID
 * @returns Promise with the API response
 */
export const updateUserPrivilege = async (
    userId: number,
    payload: {
        privilegeStatus: string;
        restaurantPrivilegeId: number;
    },
    id?: number
): Promise<ApiResponse<any>> => {
    try {
        const url = `settings/userPrivilege/update/${userId}${id ? `?id=${id}` : ''}`;
        const response = await instance.put<ApiResponse<any>>(url, payload);
        return response.data;
    } catch (error) {
        console.error('Error updating user privilege:', error);
        throw error;
    }
};

/**
 * Get all available restaurant privileges for a specific restaurant
 * @param restaurantId - The ID of the restaurant
 * @returns Promise with list of all available restaurant privileges
 */
export const getAllRestaurantPrivileges = async (
    restaurantId: number
): Promise<ApiResponse<{ content: RestaurantPrivilege[] }>> => {
    try {
        const response = await instance.get<ApiResponse<{ content: RestaurantPrivilege[] }>>(
            `settings/${restaurantId}/restaurantPrivilege`
        );
        return response.data;
    } catch (error) {
        console.error('Error fetching restaurant privileges:', error);
        throw error;
    }
};
