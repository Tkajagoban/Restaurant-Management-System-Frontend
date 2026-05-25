/**
 * @author [Kanujan]
 * @email [example@mail.com]
 * @create date 2025-12-17 22:02:04
 * @modify date 2025-12-18 09:52:11
 * @desc [Category API Module]
 */
import instance from '../instance';

// Add Main Category
export interface addMainCategoryRequest {
    name: string;
    status: boolean;
}

export interface addMainCategoryResponse {
    statusCode: number;
    statusMessage: string;
    data: any;
}

export const createMainCategory = async (requestData: addMainCategoryRequest, restaurantId: string): Promise<addMainCategoryResponse> => {
    const response = await instance.post<addMainCategoryResponse>(`settings/${restaurantId}/MainCategories/added`, requestData);
    return response.data;
}

// Get Main Categories
export interface getMainCategoryResponse {
    statusCode: number;
    statusMessage: string;
    data: any;
}

export const fetchMainCategories = async (): Promise<getMainCategoryResponse> => {
    const response = await instance.get<getMainCategoryResponse>('settings/MainCategories');
    return response.data;
}

// Delete Main Category

export interface deleteMainCategoryResponse {
    statusCode: number;
    statusMessage: string;
    data: any;
}
export const deleteMainCategory = async (mainCategoriesId : number): Promise<deleteMainCategoryResponse> => {
    const response = await instance.delete<deleteMainCategoryResponse>(`settings/MainCategories/${mainCategoriesId}`);
    return response.data;
}

// Update Main Category
export interface updateMainCategoryRequest {
    name: string;
    status: boolean;
}

export interface updateMainCategoryResponse {
    statusCode: number;
    statusMessage: string;
    data: any;
}

export const updateMainCategory = async (requestData: updateMainCategoryRequest, mainCategoriesId: number): Promise<updateMainCategoryResponse> => {
    const response = await instance.put<updateMainCategoryResponse>(`settings/MainCategories/${mainCategoriesId}`, requestData);
    return response.data;
}




export interface GetAllCategoriesParams {
    page?: number;
    size?: number;
}

export const getAllCategories = async (params?: GetAllCategoriesParams): Promise<getMainCategoryResponse> => {
    const response = await instance.get<getMainCategoryResponse>('settings/MainCategories', {
        params: {
            page: params?.page,
            size: params?.size
        }
    });
    return response.data;
}
