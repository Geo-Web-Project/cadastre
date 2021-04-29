import { configureStore } from "@reduxjs/toolkit";
import contentReducer from "../features/content/contentSlice";

export default configureStore({
  reducer: {
    selectedContent: contentReducer,
  },
});
