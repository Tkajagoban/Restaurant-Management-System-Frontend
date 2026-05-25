import { configureStore } from '@reduxjs/toolkit';
import privilegeReducer from './slices/privilegeSlice';

export const store = configureStore({
  reducer: {
    privilege: privilegeReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
