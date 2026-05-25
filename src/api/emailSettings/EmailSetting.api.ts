import instance from "../instance";

// Email Settings API Types
export interface EmailSettingsRequest {
    displayName: string;
    sentEmail: string;
    hostName: string;
    port: number;
    protocol: string;
    password: string;
    ccMailAddress: string;
}

export interface EmailSettingsResponse {
    id: string;
    displayName: string;
    sentEmail: string;
    hostName: string;
    port: number;
    protocol: string;
    password: string;
    ccMailAddress: string;
    createdAt?: string;
    updatedAt?: string;
}

// Email Settings API functions
export const emailSettingsApi = {
    // Get email settings by ID
    getEmailSettings: async (id: string): Promise<EmailSettingsResponse> => {
        const response = await instance.get<EmailSettingsResponse>(`settings/email/${id}`);
        return response.data;
    },

    // Get all email settings
    getAllEmailSettings: async (): Promise<EmailSettingsResponse[]> => {
        const response = await instance.get<EmailSettingsResponse[]>('settings/email');
        return response.data;
    },

    // Create new email settings
    createEmailSettings: async (data: EmailSettingsRequest): Promise<EmailSettingsResponse> => {
        const response = await instance.post<EmailSettingsResponse>('settings/email/added', data);
        return response.data;
    },

    // Update email settings by ID
    updateEmailSettings: async (id: string, data: EmailSettingsRequest): Promise<EmailSettingsResponse> => {
        const response = await instance.put<EmailSettingsResponse>(`settings/email/${id}`, data);
        return response.data;
    },

    // Partial update email settings by ID
    patchEmailSettings: async (id: string, data: Partial<EmailSettingsRequest>): Promise<EmailSettingsResponse> => {
        const response = await instance.patch<EmailSettingsResponse>(`settings/email/${id}`, data);
        return response.data;
    },

    // Delete email settings by ID
    deleteEmailSettings: async (id: string): Promise<void> => {
        await instance.delete(`settings/email/${id}`);
    },

    // Test email connection
    testEmailConnection: async (id: string): Promise<{ success: boolean; message: string }> => {
        const response = await instance.post<{ success: boolean; message: string }>(`settings/email/${id}/test`);
        return response.data;
    },
};

export default emailSettingsApi;
