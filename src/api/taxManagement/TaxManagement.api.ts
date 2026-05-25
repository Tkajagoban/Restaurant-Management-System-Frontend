/**
 * @author [Kanujan]
 * @email [example@mail.com]
 * @create date 2025-12-23 16:23:51
 * @modify date 2025-12-23 16:23:51
 * @desc [description]
 */

import instance from "../instance";

// Delete Tax
export interface DeleteTaxResponse {
    statusCode: number;
    statusMessage: string;
    data: any;
}

export const deleteTax = async (id: number): Promise<DeleteTaxResponse> => {
    const response = await instance.delete<DeleteTaxResponse>(`settings/tax/${id}`);
    return response.data;
}

// Post Tax

export interface PostTaxRequest {
    name: string;
    percentage: number;
    status: boolean;
}
export interface PostTaxResponse {
    statusCode: number;
    statusMessage: string;
    data: any;
}

export const createTax = async (requestData: PostTaxRequest): Promise<PostTaxResponse> => {
    const response = await instance.post<PostTaxResponse>(`settings/tax/added`, requestData);
    return response.data;
}

// Update Tax 
export interface UpdateTaxRequest {
    name: String;
    percentage: number;
    status: boolean
}

export interface UpdateTaxResponse {
    statusCode: number;
    statusMessage: String;
    data: any;
}
export const updateTax = async (requestData: UpdateTaxRequest, id: number): Promise<UpdateTaxResponse> => {
    const response = await instance.put<UpdateTaxResponse>(`settings/tax/${id}`, requestData);
    return response.data;
}

// Get Tax
export interface GetTaxResponse {
    statusCode: number;
    statusMessage: string;
    data: any;
}

// Tax item structure returned from API
export interface TaxItem {
    id: number;
    name: string;
    percentage: number;
    status: boolean;
}

export const GetTax = async (
    page?: number,
    size?: number
): Promise<GetTaxResponse> => {
    const response = await instance.get<GetTaxResponse>(
        'settings/tax',
        {
            params: {
                ...(page !== undefined && { page }),
                ...(size !== undefined && { size })
            }
        }
    );
    return response.data;
};

// Fetch active taxes for Order Management
export const getActiveTaxes = async (): Promise<TaxItem[]> => {
    try {
        const response = await GetTax();
        const taxes = response.data?.content || response.data || [];
        return taxes
            .filter((tax: TaxItem) => tax.status === true)
            .map((tax: TaxItem) => ({
                ...tax,
                percentage: Number(tax.percentage)
            }));
    } catch (error) {
        console.error('Failed to fetch taxes', error);
        return [];
    }
};

export const calculateTaxBreakdown = (subtotal: number, taxes: any[]): { taxAmount: number; serviceAmount: number } => {
    let taxAmount = 0;
    let serviceAmount = 0;

    taxes.forEach(tax => {
        if (tax.name.toLowerCase() === 'service charge') {
            serviceAmount += (tax.percentage / 100) * subtotal;
        } else {
            taxAmount += (tax.percentage / 100) * subtotal;
        }
    });

    return {
        taxAmount: parseFloat(taxAmount.toFixed(2)),
        serviceAmount: parseFloat(serviceAmount.toFixed(2))
    };
}


export const calculateTaxAmount = (subtotal: number, taxes: any[]) => {
    const { taxAmount, serviceAmount } = calculateTaxBreakdown(subtotal, taxes);
    return Number((taxAmount + serviceAmount).toFixed(2));
};