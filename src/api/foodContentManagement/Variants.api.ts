/**
 * @author [Kanujan]
 * @email [example@mail.com]
 * @create date 2025-12-20 23:13:44
 * @modify date 2025-12-20 23:13:44
 * @desc [description]
 */
import instance from "../instance";

export interface GetAllFoodVariantsResponse {
    statusCode: number;
    statusMessage: string;
    data: any;
    content?: any[]; // Added to support flattening logic
}

export interface GetAllFoodVariantsParams {
    page?: number;
    size?: number;
}

export const getAllFoodVariants = async (params?: GetAllFoodVariantsParams): Promise<GetAllFoodVariantsResponse> => {
    const response = await instance.get<GetAllFoodVariantsResponse>('settings/food', {
        params: {
            page: params?.page,
            size: params?.size
        }
    });
    return response.data;
}

export const addFoodVariant = async (mainCategoryId: string, subCategoryId: string, data: any) => {
    const response = await instance.post(`settings/${mainCategoryId}/${subCategoryId}/food/added`, data, {
        headers: {
            'Content-Type': undefined
        }
    });
    return response.data;
};

export const updateFoodVariant = async (id: string, data: any) => {
    const response = await instance.put(`settings/food/${id}`, data, {
        headers: {
            'Content-Type': undefined
        }
    });
    return response.data;
};

// Get Food by SubCategory
export const getFoodsBySubCategory = async (mainCategoryId: string, subCategoryId: string): Promise<GetAllFoodVariantsResponse> => {
    const response = await instance.get<GetAllFoodVariantsResponse>(`settings/${mainCategoryId}/${subCategoryId}/food`);
    return response.data;
};

export const deleteFoodVariant = async (id: string) => {
    const response = await instance.delete(`settings/food/${id}`);
    return response.data;
};
