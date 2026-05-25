import instance from "../instance";

export interface RolePrivilegeDetail {
    rolePrivilegeId: number;
    restaurantPrivilegeId: number;
    privilegeStatus: string | null;
}

export interface RolePrivilegeListResponse {
    roleId: number;
    rolePrivileges: Record<string, RolePrivilegeDetail>;
}

export interface ApiResponse<T> {
    statusCode: number;
    statusMessage: string;
    data: T;
}

export const getRolePrivilegesByRoleId = async (roleId: number): Promise<ApiResponse<RolePrivilegeListResponse>> => {
    try {
        const response = await instance.get<ApiResponse<RolePrivilegeListResponse>>(`settings/rolePrivilege/role/${roleId}`);
        return response.data;
    } catch (err) {
        console.error(`Failed to fetch privileges for role ID: ${roleId}`, err);
        throw err;
    }
};

export interface UpdateRolePrivilegeRequest {
    roleId: number;
    restaurantPrivilegeId: number;
    privilegeStatus: string;
}

export const updateRolePrivilege = async (request: UpdateRolePrivilegeRequest): Promise<ApiResponse<any>> => {
    try {
        const response = await instance.put<ApiResponse<any>>('settings/rolePrivilege', request);
        return response.data;
    } catch (err) {
        console.error('Failed to update role privilege', err);
        throw err;
    }
};
