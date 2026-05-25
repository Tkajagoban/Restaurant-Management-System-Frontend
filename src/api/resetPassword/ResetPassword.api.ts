import instance from '../instance';

export interface ResetPasswordRequest {
    email: string;
    newPassword: string;
    confirmPassword: string;
}

export interface ResetPasswordResponse {
    statusCode: number;
    statusMessage: string;
    data: any;
}

export const postResetPassword = async (
    requestData: ResetPasswordRequest
): Promise<ResetPasswordResponse> => {
    const response = await instance.put<ResetPasswordResponse>(
        'auth/new-password',
        requestData
    );
    return response.data;
};
