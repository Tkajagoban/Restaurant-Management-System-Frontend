import instance from '../instance';

export interface VerifyOTPRequest {
    email: string;
    otp: string;
}

export interface VerifyOTPResponse {
    statusCode: number;
    statusMessage: string;
}

export const postVerifyOTP = async (requestData: VerifyOTPRequest): Promise<VerifyOTPResponse> => {
    console.log('Verifying OTP request to:', 'auth/otp/verify', 'with data:', requestData);
    try {
        const response = await instance.post<VerifyOTPResponse>('auth/otp/verify', requestData);
        console.log('Verify OTP response:', response.data);
        return response.data;
    } catch (error: any) {
        console.error('Error verifying OTP:', error.response || error);
        throw error;
    }
}
