import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseQuery = fetchBaseQuery({
  baseUrl: (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, ''),
  credentials: 'include',
});

const validatedBaseQuery = async (args, api, extraOptions) => {
  const result = await baseQuery(args, api, extraOptions);
  if (result.error) return result;

  const payload = result.data;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {
      error: {
        status: 'CUSTOM_ERROR',
        error: 'The server returned an invalid response.',
      },
    };
  }

  if (payload.success === false) {
    return {
      error: {
        status: 'CUSTOM_ERROR',
        error: payload.message || 'The request failed.',
        data: payload,
      },
    };
  }

  return result;
};

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: validatedBaseQuery,
  tagTypes: ['AdminSession'],
  endpoints: (builder) => ({
    loginAdmin: builder.mutation({
      query: (credentials) => ({
        url: 'admin/login',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['AdminSession'],
    }),
    logoutAdmin: builder.mutation({
      query: () => ({
        url: 'admin/logout',
        method: 'POST',
      }),
      invalidatesTags: ['AdminSession'],
    }),
    checkAdminAuth: builder.query({
      query: () => 'admin/check-auth',
      providesTags: ['AdminSession'],
    }),
    getAdminDashboard: builder.query({
      query: () => 'admin/dashboard',
      providesTags: ['AdminSession'],
    }),
  }),
});

export const {
  useLoginAdminMutation,
  useLogoutAdminMutation,
  useCheckAdminAuthQuery,
  useGetAdminDashboardQuery,
} = authApi;
