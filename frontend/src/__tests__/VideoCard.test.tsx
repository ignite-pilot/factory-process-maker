import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { BrowserRouter } from "react-router-dom"
import VideoCard from "../components/VideoCard"
import type { VideoResponse } from "../api/client"
import * as useVideosModule from "../hooks/useVideos"

vi.mock("../hooks/useVideos")

const mockNavigate = vi.fn()

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom")
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const mockVideo: VideoResponse = {
  id: 1,
  fileName: "test-video.mp4",
  filePath: "/path/to/video.mp4",
  duration: 120.5,
  status: "pending",
  createdAt: "2026-03-31T00:00:00Z",
  workUnitCount: 0,
}

describe("VideoCard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useVideosModule).useStartAnalysis.mockReturnValue({
      mutate: vi.fn((_id: number, options?: { onSuccess?: () => void }) => {
        if (options?.onSuccess) options.onSuccess()
      }),
      isPending: false,
    } as any)
  })

  it("렌더링되어야 함", () => {
    render(
      <BrowserRouter>
        <VideoCard video={mockVideo} />
      </BrowserRouter>
    )
    expect(screen.getByText(mockVideo.fileName)).toBeInTheDocument()
  })

  it("비디오 파일명을 표시해야 함", () => {
    render(
      <BrowserRouter>
        <VideoCard video={mockVideo} />
      </BrowserRouter>
    )
    expect(screen.getByText("test-video.mp4")).toBeInTheDocument()
  })

  it("비디오 상태를 표시해야 함", () => {
    render(
      <BrowserRouter>
        <VideoCard video={mockVideo} />
      </BrowserRouter>
    )
    expect(screen.getByText("대기중")).toBeInTheDocument()
  })

  it("비디오 길이를 표시해야 함", () => {
    render(
      <BrowserRouter>
        <VideoCard video={mockVideo} />
      </BrowserRouter>
    )
    expect(screen.getByText("120.5초")).toBeInTheDocument()
  })

  it("pending 상태일 때 분석 시작 버튼을 표시해야 함", () => {
    render(
      <BrowserRouter>
        <VideoCard video={mockVideo} />
      </BrowserRouter>
    )
    expect(screen.getByText("분석 시작")).toBeInTheDocument()
  })

  it("done 상태일 때 편집 버튼을 표시해야 함", () => {
    const doneVideo = { ...mockVideo, status: "done" as const }
    render(
      <BrowserRouter>
        <VideoCard video={doneVideo} />
      </BrowserRouter>
    )
    expect(screen.getByText("편집")).toBeInTheDocument()
  })

  it("analyzing 상태일 때 진행 확인 버튼을 표시해야 함", () => {
    const analyzingVideo = { ...mockVideo, status: "analyzing" as const }
    render(
      <BrowserRouter>
        <VideoCard video={analyzingVideo} />
      </BrowserRouter>
    )
    expect(screen.getByText("진행 확인")).toBeInTheDocument()
  })

  it("분석 시작 버튼 클릭시 분석을 시작해야 함", () => {
    const startAnalysisMutate = vi.fn()
    vi.mocked(useVideosModule).useStartAnalysis.mockReturnValue({
      mutate: startAnalysisMutate,
      isPending: false,
    } as any)

    render(
      <BrowserRouter>
        <VideoCard video={mockVideo} />
      </BrowserRouter>
    )

    const analyzeButton = screen.getByText("분석 시작")
    fireEvent.click(analyzeButton)

    expect(startAnalysisMutate).toHaveBeenCalledWith(mockVideo.id, expect.any(Object))
  })

  it("편집 버튼 클릭시 편집 페이지로 이동해야 함", () => {
    const doneVideo = { ...mockVideo, status: "done" as const }
    render(
      <BrowserRouter>
        <VideoCard video={doneVideo} />
      </BrowserRouter>
    )

    const editButton = screen.getByText("편집")
    fireEvent.click(editButton)

    expect(mockNavigate).toHaveBeenCalledWith(`/videos/${mockVideo.id}/edit`)
  })

  it("진행 확인 버튼 클릭시 분석 진행 페이지로 이동해야 함", () => {
    const analyzingVideo = { ...mockVideo, status: "analyzing" as const }
    render(
      <BrowserRouter>
        <VideoCard video={analyzingVideo} />
      </BrowserRouter>
    )

    const progressButton = screen.getByText("진행 확인")
    fireEvent.click(progressButton)

    expect(mockNavigate).toHaveBeenCalledWith(`/videos/${mockVideo.id}/analyzing`)
  })

  it("failed 상태일 때는 버튼을 표시하지 않아야 함", () => {
    const failedVideo: VideoResponse = { ...mockVideo, status: "failed" as const }
    render(
      <BrowserRouter>
        <VideoCard video={failedVideo} />
      </BrowserRouter>
    )

    expect(screen.getByText("실패")).toBeInTheDocument()
    expect(screen.queryByText("분석 시작")).not.toBeInTheDocument()
    expect(screen.queryByText("편집")).not.toBeInTheDocument()
    expect(screen.queryByText("진행 확인")).not.toBeInTheDocument()
  })

  it("분석 중일 때 분석 시작 버튼이 비활성화되어야 함", () => {
    vi.mocked(useVideosModule).useStartAnalysis.mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
    } as any)

    render(
      <BrowserRouter>
        <VideoCard video={mockVideo} />
      </BrowserRouter>
    )

    const analyzeButton = screen.getByText("분석 시작") as HTMLButtonElement
    expect(analyzeButton.disabled).toBe(true)
  })
})
