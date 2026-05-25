import instance from "../instance";

export interface AddSubCategoryRequest {
    subCategoriesName: string;
    mainCategoryID: number;
    status: boolean;
}
export interface AddSubCategoryResponse {
    statusCode: number;
    statusMessage: string;
    data:any
    
}

export const AddSubCategory = async (requestData: AddSubCategoryRequest, mainCategoryId: number): Promise<AddSubCategoryResponse> => {
    const response = await instance.post<AddSubCategoryResponse>(`settings/${mainCategoryId}/SubCategory/added`, requestData);
    return response.data;
}

// Get All
export interface SubCategoryItemDto {
    id: number;
    subCategoryName: string;
    mainCategoryName?: string;
    status: boolean;
}

export interface GetSubCategoriesResponse {
    statusCode: number;
    statusMessage: string;
    data: SubCategoryItemDto[];
}

export const getSubCategoriesByMainCategory = async (mainCategoryId: number): Promise<GetSubCategoriesResponse> => {
    const response = await instance.get<GetSubCategoriesResponse>(`settings/${mainCategoryId}/SubCategory`);
    return response.data;
}

// Update (PUT)
export type UpdateSubCategoryRequest = AddSubCategoryRequest;
export type UpdateSubCategoryResponse = AddSubCategoryResponse;

export const updateSubCategoryById = async (id: number, requestData: UpdateSubCategoryRequest): Promise<UpdateSubCategoryResponse> => {
    const response = await instance.put<UpdateSubCategoryResponse>(`settings/SubCategory/${id}`, requestData);
    return response.data;
}

// Delete
export interface DeleteSubCategoryResponse {
    statusCode: number;
    statusMessage: string;
    data?: any;
}

export const deleteSubCategoryById = async (id: number): Promise<DeleteSubCategoryResponse> => {
    const response = await instance.delete<DeleteSubCategoryResponse>(`settings/SubCategory/${id}`);
    return response.data;
}


