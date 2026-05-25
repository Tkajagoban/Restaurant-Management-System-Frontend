import instance from '../instance';

//add new table
export interface addTableRequest {
    tableNumber: string;
    guestCount: number;
    status: boolean;
}

export interface addTableResponse {
    statusCode: number;
    statusMessage: string;
    data: any;
}
export const createTable = async (requestData: addTableRequest): Promise<addTableResponse> => {
    const response = await instance.post<addTableResponse>(`settings/table/added`, requestData);
    return response.data;
}

//get all tables
export interface FetchTablesData {
    id: number;
    tableNumber: string;
    guestCount: number;
    status: boolean;
}

export interface PaginatedTables {
    content: FetchTablesData[];
    number: number;
    totalPages: number;
    totalElements: number;
    size: number;
}

export interface GetTablesResponse {
    statusCode: number;
    statusMessage: string;
    data: PaginatedTables;
}

export const getAllTables = async (
    page?: number,
    size?: number
): Promise<GetTablesResponse> => {
    const response = await instance.get<GetTablesResponse>(
        `settings/table`,
        {
            params: {
                ...(page !== undefined && { page }),
                ...(size !== undefined && { size })
            }
        }
    );
    return response.data;
}

//update table
export interface UpdateTableRequest {
    tableNumber: string;
    guestCount: number;
    status: boolean;
}

export interface UpdateTableResponse {
    statusCode: number;
    statusMessage: string;
    data: any;
}

export const updateTable = async (id: number, requestData: UpdateTableRequest): Promise<UpdateTableResponse> => {
    const response = await instance.put<UpdateTableResponse>(`settings/table/${id}`, requestData);
    return response.data;
}

//delete table
export interface DeleteTableResponse {
    statusCode: number;
    statusMessage: string;
    data: any;
}

export const deleteTable = async (id: number): Promise<DeleteTableResponse> => {
    const response = await instance.delete(`settings/table/${id}`);
    return response.data;
}

export const getTableByNumber = async (tableNumber: number): Promise<FetchTablesData | null> => {
    try {
        const response = await instance.get<GetTablesResponse>(
            `settings/table`,
            {
                params: {
                    tableNumber: tableNumber
                }
            }
        );
        const tables = response.data.data.content;
        if (tables.length > 0) {
            return tables[0];
        } else {
            return null;
        }
    } catch (error) {
        console.error('Error fetching table by number:', error);
        return null;
    }
};

export const saveTable = async (table: FetchTablesData): Promise<FetchTablesData> => {
    if (table.id) {
        // update existing table
        const updated = await updateTable(table.id, {
            tableNumber: table.tableNumber,
            guestCount: table.guestCount,
            status: table.status
        });
        return updated.data;
    } else {
        // create new table
        const created = await createTable({
            tableNumber: table.tableNumber,
            guestCount: table.guestCount,
            status: table.status
        });
        return created.data;
    }
};

/**
 * Updates a table's status by ID.
 * Fetches the table data first to preserve tableNumber and guestCount,
 * then updates only the status field.
 * @param tableId - The ID of the table to update
 * @param newStatus - The new status (true = Reserved, false = Unreserved)
 */
export const updateTableStatusById = async (tableId: number, newStatus: boolean): Promise<void> => {
    try {
        // Fetch all tables to get the current table data
        const response = await getAllTables(0, 100);
        const table = response.data.content.find(t => t.id === tableId);

        if (table) {
            await updateTable(tableId, {
                tableNumber: table.tableNumber,
                guestCount: table.guestCount,
                status: newStatus
            });
            console.log(`Table ${table.tableNumber} status updated to ${newStatus ? 'Reserved' : 'Unreserved'}`);
        } else {
            console.warn(`Table with ID ${tableId} not found`);
        }
    } catch (error) {
        console.error('Error updating table status:', error);
        throw error;
    }
};