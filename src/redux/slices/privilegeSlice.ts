import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type PrivilegeStatus = 'READ' | 'WRITE' | 'MAINTAIN' | 'NONE';

interface PrivilegeDetail {
    privilegeStatus: PrivilegeStatus;
    isMaintain: number;
    restaurantPrivilegeId: number;
}

interface PrivilegeState {
    privileges: Record<string, PrivilegeDetail>;
}

const initialState: PrivilegeState = {
    privileges: {},
};

const privilegeSlice = createSlice({
    name: 'privilege',
    initialState,
    reducers: {
        setPrivileges: (state, action: PayloadAction<Record<string, PrivilegeDetail>>) => {
            state.privileges = action.payload;
        },
        updatePrivilege: (state, action: PayloadAction<{ featureName: string; status: PrivilegeStatus }>) => {
            const existing = state.privileges[action.payload.featureName];
            if (existing) {
                state.privileges[action.payload.featureName] = {
                    ...existing,
                    privilegeStatus: action.payload.status,
                    isMaintain: action.payload.status === 'MAINTAIN' ? 1 : 0,
                };
            }
        },
        clearPrivileges: (state) => {
            state.privileges = {};
        },
    },
});

export const { setPrivileges, updatePrivilege, clearPrivileges } = privilegeSlice.actions;
export default privilegeSlice.reducer;
