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

export const galleryApi = createApi({
  reducerPath: 'galleryApi',
  baseQuery: validatedBaseQuery,
  tagTypes: ['Gallery'],
  endpoints: (builder) => ({
    getGallery: builder.query({
      query: (category) => ({
        url: 'gallery',
        params: category === 'all' ? undefined : { category },
      }),
      providesTags: ['Gallery'],
    }),
    uploadGallery: builder.mutation({
      query: (body) => ({
        url: 'gallery/uploadImg',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Gallery'],
    }),
    deleteGallery: builder.mutation({
      query: (photoId) => ({
        url: `gallery/${encodeURIComponent(photoId)}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Gallery'],
    }),
  }),
});

export const {
  useGetGalleryQuery,
  useUploadGalleryMutation,
  useDeleteGalleryMutation,
} = galleryApi;
