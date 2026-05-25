import instance from '../instance';
export interface LoginRequest {
    email: string;
    password: string;
}

export interface RolePrivilegeDetail {
    rolePrivilegeId: number;
    privilegeStatus: string;
    isMaintain: number;
}

export interface UserPrivilegeDetail {
    userPrivilegeId: number;
    privilegeStatus: string;
    isMaintain: number;
}

export interface LoginResponse {
    statusCode: number;
    statusMessage: string;
    data: {
        accessToken: string;
        expiresIn: number;
        rolePrivileges?: Record<string, number>;
        userPrivileges?: Record<string, number>;
        rolePrivilegesMaintain?: Record<string, number>;
        rolePrivilege?: Record<string, RolePrivilegeDetail>;
        userPrivilege?: Record<string, UserPrivilegeDetail>;
        roleId?: number;
        userId?: number;
    };
}

export const postLogin = async (requestData: LoginRequest): Promise<LoginResponse> => {
    const response = await instance.post<LoginResponse>('auth/login', requestData);
    return response.data;
}

export const postLogout = async (): Promise<void> => {
    await instance.post('auth/logout');
}