import { configureStore } from '@reduxjs/toolkit';
import { authApi } from '../services/authApi.js';
import { galleryApi } from '../services/galleryApi.js';

export const store = configureStore({
  reducer: {
    [authApi.reducerPath]: authApi.reducer,
    [galleryApi.reducerPath]: galleryApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(authApi.middleware, galleryApi.middleware),
});
