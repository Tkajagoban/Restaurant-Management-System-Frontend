import instance from "../instance";
import type { Restaurant } from "../restaurantManagement/RestaurantManagement.api";

// ========== INTERFACES ==========

export interface RestaurantDetails {
    id: number;
    restaurantName: string;
    address: string;
    phone: string;
    logo?: string;
    city?: string;
    email?: string;
    webSite?: string;
}

export interface ApiResponse<T> {
    statusCode: number;
    statusMessage: string;
    data: T;
}

// ========== API FUNCTIONS ==========

/**
 * Get Restaurant Details
 * Fetches the first restaurant from the list (assuming single restaurant setup)
 * @returns Promise<RestaurantDetails>
 */
export const getRestaurantDetails = async (): Promise<RestaurantDetails> => {
    try {
        const response = await instance.get<ApiResponse<Restaurant[]>>(
            'settings/restaurant'
        );

        if (response.data.statusCode !== 2000) {
            throw new Error(response.data.statusMessage);
        }

        const restaurants = response.data.data;
        if (!restaurants || restaurants.length === 0) {
            throw new Error('No restaurant found');
        }

        // Map to RestaurantDetails format
        const restaurant = restaurants[0];
        return {
            id: restaurant.id || 0,
            restaurantName: restaurant.name,
            address: restaurant.address,
            phone: restaurant.phoneNumber,
            logo: restaurant.logoImage,
            city: restaurant.city,
            email: restaurant.email,
            webSite: restaurant.webSite
        };
    } catch (err) {
        console.error("Failed to fetch restaurant details", err);
        throw err;
    }
};

/**
 * Get Restaurant by ID
 * @param restaurantId Restaurant ID
 * @returns Promise<RestaurantDetails>
 */
export const getRestaurantById = async (
    restaurantId: number
): Promise<RestaurantDetails> => {
    try {
        // Note: Backend doesn't have a get-by-id endpoint, so we get all and filter
        const response = await instance.get<ApiResponse<Restaurant[]>>(
            'settings/restaurant'
        );

        if (response.data.statusCode !== 2000) {
            throw new Error(response.data.statusMessage);
        }

        const restaurant = response.data.data.find(r => r.id === restaurantId);
        if (!restaurant) {
            throw new Error(`Restaurant with ID ${restaurantId} not found`);
        }

        return {
            id: restaurant.id || 0,
            restaurantName: restaurant.name,
            address: restaurant.address,
            phone: restaurant.phoneNumber,
            logo: restaurant.logoImage,
            city: restaurant.city,
            email: restaurant.email,
            webSite: restaurant.webSite
        };
    } catch (err) {
        console.error(`Failed to fetch restaurant ${restaurantId}`, err);
        throw err;
    }
};
