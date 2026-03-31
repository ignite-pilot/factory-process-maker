import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { BrowserRouter } from "react-router-dom"
import { QueryClientProvider, QueryClient } from "@tanstack/react-query"
import AnalyzingPage from "../AnalyzingPage"

// Mock useParams
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom")
  return {
    ...actual,
    useParams: () => ({ id: "123" }),
  }
})

// Mock useAnalysisPolling
vi.mock("../../hooks/useAnalysis", () => ({
  useAnalysisPolling: (videoId: number) => ({
    status: "running",
    videoId,
  }),
}))

describe("AnalyzingPage", () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient()
  })

  const renderPage = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AnalyzingPage />
        </BrowserRouter>
      </QueryClientProvider>
    )
  }

  it("should render the analyzing page title", () => {
    renderPage()
    const title = screen.getByText("공정 분석 중")
    expect(title).toBeInTheDocument()
  })

  it("should display status message for running status", () => {
    renderPage()
    const statusText = screen.getByText("AI가 영상을 분석하고 있습니다...")
    expect(statusText).toBeInTheDocument()
  })

  it("should render the loading icon", () => {
    renderPage()
    const icon = screen.getByText("⚙️")
    expect(icon).toBeInTheDocument()
  })
})
