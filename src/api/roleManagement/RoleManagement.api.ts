import instance from "../instance";

export interface AddRoleRequest {
    roleName: string;
}

export interface UpdateRoleRequest {
    roleName: string;
    restaurantId: string;
}

export interface Restaurant {
    id: number;
    restaurantName: string;
    address?: string;
    city?: string;
    email?: string;
    phone?: string;
}

export interface Role {
    id: number;
    roleName: string;
    restaurantId: number;
    createAt?: string;
    updateAt?: string;
    rolePrivileges?: Record<string, number>;
}

export interface GetRestaurantResponse {
    statusCode: number;
    statusMessage: string;
    data: Restaurant[];
}

export interface GetRoleResponse {
    statusCode: number;
    statusMessage: string;
    data: Role[];
}

export interface AddRoleResponse {
    statusCode: number;
    statusMessage: string;
    data: Role;
}

export const getAllRoles = async (restaurantId: string): Promise<GetRoleResponse> => {
    const response = await instance.get<GetRoleResponse>(`settings/${restaurantId}/roles`);
    return response.data;
};

export const addRole = async (requestData: AddRoleRequest, restaurantId: string): Promise<AddRoleResponse> => {
    const response = await instance.post<AddRoleResponse>(`settings/${restaurantId}/roles/added`, requestData);
    return response.data;
};

export const updateRole = async (roleId: string, requestData: UpdateRoleRequest): Promise<AddRoleResponse> => {
    const response = await instance.put<AddRoleResponse>(`settings/roles/${roleId}`, requestData);
    return response.data;
};

export const deleteRole = async (roleId: string): Promise<AddRoleResponse> => {
    const response = await instance.delete<AddRoleResponse>(`settings/roles/${roleId}`);
    return response.data;
};

export const getRoleById = async (restaurantId: string, roleId: string): Promise<AddRoleResponse> => {
    const response = await instance.get<AddRoleResponse>(`settings/${restaurantId}/roles/${roleId}`);
    return response.data;
};

export const getAllRestaurants = async (): Promise<GetRestaurantResponse> => {
    const response = await instance.get<GetRestaurantResponse>(`settings/restaurants`);
    return response.data;
};

