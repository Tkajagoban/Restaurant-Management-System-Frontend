import instance from '../instance';

export interface EmailUpdateOtpRequest {
    userId: number;
    newEmail: string;
}

export interface EmailUpdateVerifyRequest {
    userId: number;
    newEmail: string;
    otp: string;
}

export interface OtpResponse {
    statusCode: number;
    statusMessage: string;
    data: {
        message: string;
        expiryTime: string;
    };
}

export interface ApiResponse {
    statusCode: number;
    statusMessage: string;
}

/**
 * Send OTP to the new email address for email update verification
 */
export const sendEmailUpdateOtp = async (
    userId: number,
    newEmail: string
): Promise<OtpResponse> => {
    const response = await instance.post<OtpResponse>('auth/otp/email-update/send', {
        userId,
        newEmail
    });
    return response.data;
};

/**
 * Verify OTP and update the user's email
 */
export const verifyEmailUpdateOtp = async (
    userId: number,
    newEmail: string,
    otp: string
): Promise<ApiResponse> => {
    const response = await instance.post<ApiResponse>('auth/otp/email-update/verify', {
        userId,
        newEmail,
        otp
    });
    return response.data;
};
