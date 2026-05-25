import instance from '../instance';

export interface SendEmailRequest {
    email: string;
}

export interface SendEmailResponse {
    statusCode: number;
    statusMessage: string;
    data: {
        message: string;
        expiryTime: string;
    };
}

export const postSendEmail = async (requestData: SendEmailRequest): Promise<SendEmailResponse> => {
    console.log('Sending OTP request to:', 'auth/otp', 'with data:', requestData);
    try {
        const response = await instance.post<SendEmailResponse>('auth/otp', requestData);
        console.log('OTP response:', response.data);
        return response.data;
    } catch (error: any) {
        console.error('Error sending OTP:', error.response || error);
        throw error;
    }
}
