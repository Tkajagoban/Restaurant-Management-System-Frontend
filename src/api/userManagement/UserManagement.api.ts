
import instance from "../instance";

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  nic: string;
  address: string;
  city: string;
  roleId: number;
  roleName: string;
}

export interface UserRequest {
  firstName: string;
  lastName: string;
  email: string;
  nic: string;
  address: string;
  city: string;
  roleId: number;
  restaurantId: number;
  phoneNumber: string;
}

export interface UserSearchParams {
  page?: number;
  size?: number;
  restaurantId?: number;
  roleId?: number;
  sort?: string;
}

export interface UserPageResponse {
  content: User[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}

export interface ApiResponse<T> {
  statusCode: number;
  statusMessage: string;
  data: T;
}

export const getUsers = async (
  restaurantId: number,
  params?: UserSearchParams
): Promise<ApiResponse<UserPageResponse>> => {
  const response = await instance.get<ApiResponse<UserPageResponse>>(
    `settings/${restaurantId}/users`,
    { params }
  );
  return response.data;
};

export const getUserById = async (
  id: number
): Promise<ApiResponse<User>> => {
  const response = await instance.get<ApiResponse<User>>(`settings/users/${id}`);
  return response.data;
};

export const createUser = async (
  userData: UserRequest,
  restaurantId: number,
  roleId: number
): Promise<ApiResponse<User>> => {
  const response = await instance.post<ApiResponse<User>>(
    `settings/${restaurantId}/${roleId}/users/added`,
    userData
  );
  return response.data;
};

export const updateUser = async (
  id: number,
  userData: UserRequest
): Promise<ApiResponse<User>> => {
  const response = await instance.put<ApiResponse<User>>(
    `settings/users/${id}`,
    userData
  );
  return response.data;
};

export const deleteUser = async (
  id: number
): Promise<ApiResponse<null>> => {
  const response = await instance.delete<ApiResponse<null>>(
    `settings/users/${id}`
  );
  return response.data;
};