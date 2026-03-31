import { BrowserRouter, Routes, Route } from "react-router-dom"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import VideoListPage from "./pages/VideoListPage"
import AnalyzingPage from "./pages/AnalyzingPage"
import EditPage from "./pages/EditPage"

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<VideoListPage />} />
          <Route path="/videos/:id/analyzing" element={<AnalyzingPage />} />
          <Route path="/videos/:id/edit" element={<EditPage />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
