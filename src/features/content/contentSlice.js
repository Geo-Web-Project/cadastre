import { createSlice } from "@reduxjs/toolkit";

export const contentSlice = createSlice({
  name: "selectedContent",
  initialState: {},
  reducers: {
    updateName: (state, action) => {
      state.name = action.payload;
    },
  },
});

export const { updateName } = contentSlice.actions;

export const selectRootContent = (state) => {
  name: state.name;
};

export default contentSlice.reducer;
