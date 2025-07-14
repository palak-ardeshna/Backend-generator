import { configureStore } from '@reduxjs/toolkit';
import { dashboardApi } from '../features/dashboard/dashboardApi';
import { apiGeneratorApi } from '../features/apiGenerator/apiGeneratorApi';
import { authApi } from '../features/auth/authApi';
import { usersApi } from '../features/users/usersApi';

export const store = configureStore({
  reducer: {
    [dashboardApi.reducerPath]: dashboardApi.reducer,
    [apiGeneratorApi.reducerPath]: apiGeneratorApi.reducer,
    [authApi.reducerPath]: authApi.reducer,
    [usersApi.reducerPath]: usersApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      dashboardApi.middleware, 
      apiGeneratorApi.middleware, 
      authApi.middleware,
      usersApi.middleware
    ),
}); 