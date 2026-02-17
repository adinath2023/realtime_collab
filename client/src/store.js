import { configureStore } from "@reduxjs/toolkit";
import { baseApi } from "./api/baseApi";

export const store = configureStore({
  reducer: {
    [baseApi.reducerPath]: baseApi.reducer
  },
  middleware: (getDefault) => getDefault().concat(baseApi.middleware)
});
