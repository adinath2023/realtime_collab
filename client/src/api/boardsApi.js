import { baseApi } from "./baseApi";

export const boardsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listBoards: builder.query({
      query: ({ page = 1, limit = 10, q = "" }) => `/boards?page=${page}&limit=${limit}&q=${encodeURIComponent(q)}`
    }),
    createBoard: builder.mutation({
      query: (body) => ({ url: "/boards", method: "POST", body })
    }),
    getBoard: builder.query({
      query: (boardId) => `/boards/${boardId}`
    }),
    addList: builder.mutation({
      query: ({ boardId, title }) => ({ url: `/lists/board/${boardId}`, method: "POST", body: { title } })
    }),
    addTask: builder.mutation({
      query: ({ listId, title }) => ({ url: `/tasks/list/${listId}`, method: "POST", body: { title } })
    }),
    moveTask: builder.mutation({
      query: ({ taskId, toListId, toPosition }) => ({ url: `/tasks/${taskId}/move`, method: "PATCH", body: { toListId, toPosition } })
    }),
    boardActivity: builder.query({
      query: ({ boardId, page = 1, limit = 15 }) => `/boards/${boardId}/activity?page=${page}&limit=${limit}`
    })
  })
});

export const {
  useListBoardsQuery,
  useCreateBoardMutation,
  useGetBoardQuery,
  useAddListMutation,
  useAddTaskMutation,
  useMoveTaskMutation,
  useBoardActivityQuery
} = boardsApi;
