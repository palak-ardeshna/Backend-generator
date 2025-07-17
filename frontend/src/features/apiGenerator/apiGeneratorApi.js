import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiGeneratorApi = createApi({
  reducerPath: 'apiGeneratorApi',
  baseQuery: fetchBaseQuery({ 
    baseUrl,
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('token');
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Modules', 'Backends'],
  endpoints: (builder) => ({
    generateModule: builder.mutation({
      query: (body) => ({
        url: '/generate-module',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Modules'],
    }),
    getModules: builder.query({
      query: () => '/generate-module',
      providesTags: ['Modules'],
    }),
    deleteModule: builder.mutation({
      query: (moduleName) => ({
        url: `/generate-module/${moduleName}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Modules'],
    }),
    // New endpoints for backend management
    createBackend: builder.mutation({
      query: (body) => ({
        url: '/user-backends',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Backends'],
    }),
    getUserBackends: builder.query({
      query: () => '/user-backends',
      providesTags: ['Backends'],
    }),
    getBackendById: builder.query({
      query: (backendId) => `/user-backends/${backendId}`,
      providesTags: (result, error, id) => [{ type: 'Backends', id }],
    }),
    updateBackend: builder.mutation({
      query: ({ backendId, ...body }) => ({
        url: `/user-backends/${backendId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { backendId }) => [{ type: 'Backends', id: backendId }],
    }),
    deleteBackend: builder.mutation({
      query: (backendId) => ({
        url: `/user-backends/${backendId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Backends'],
    }),
    generateModuleForBackend: builder.mutation({
      query: ({ backendId, ...body }) => ({
        url: `/user-backends/${backendId}/modules`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (result, error, { backendId }) => [{ type: 'Backends', id: backendId }],
    }),
    updateModuleInBackend: builder.mutation({
      query: ({ backendId, moduleName, ...body }) => ({
        url: `/user-backends/${backendId}/modules/${moduleName}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (result, error, { backendId }) => [{ type: 'Backends', id: backendId }],
    }),
    deleteModuleFromBackend: builder.mutation({
      query: ({ backendId, moduleName }) => ({
        url: `/user-backends/${backendId}/modules/${moduleName}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { backendId }) => [{ type: 'Backends', id: backendId }],
    }),
    exportBackend: builder.query({
      query: (backendId) => ({
        url: `/user-backends/${backendId}/export`,
        responseHandler: (response) => response.blob(),
      }),
    }),
  }),
});

export const { 
  useGenerateModuleMutation, 
  useGetModulesQuery,
  useDeleteModuleMutation,
  useCreateBackendMutation,
  useGetUserBackendsQuery,
  useGetBackendByIdQuery,
  useUpdateBackendMutation,
  useDeleteBackendMutation,
  useGenerateModuleForBackendMutation,
  useUpdateModuleInBackendMutation,
  useDeleteModuleFromBackendMutation,
  useLazyExportBackendQuery
} = apiGeneratorApi; 