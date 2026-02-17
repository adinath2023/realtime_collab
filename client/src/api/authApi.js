import { baseApi } from "./baseApi";

export const authApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    signup: builder.mutation({
      query: (body) => ({ url: "/auth/signup", method: "POST", body })
    }),
    login: builder.mutation({
      query: (body) => ({ url: "/auth/login", method: "POST", body })
    }),
    me: builder.query({
      query: () => ({ url: "/auth/me" })
    })
  })
});

export const { useSignupMutation, useLoginMutation, useMeQuery } = authApi;
