import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { BrowserRouter } from "react-router-dom"
import VideoListPage from "../pages/VideoListPage"
import type { VideoResponse } from "../api/client"
import * as useVideosModule from "../hooks/useVideos"

vi.mock("../hooks/useVideos")
vi.mock("../components/VideoCard", () => ({
  default: ({ video }: { video: VideoResponse }) => (
    <div data-testid={`video-card-${video.id}`}>{video.fileName}</div>
  ),
}))

const mockVideos: VideoResponse[] = [
  {
    id: 1,
    fileName: "video1.mp4",
    filePath: "/path/to/video1.mp4",
    duration: 120.5,
    status: "pending",
    createdAt: "2026-03-31T00:00:00Z",
  },
  {
    id: 2,
    fileName: "video2.mp4",
    filePath: "/path/to/video2.mp4",
    duration: 180.0,
    status: "done",
    createdAt: "2026-03-31T00:00:00Z",
  },
]

describe("VideoListPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("페이지가 렌더링되어야 함", () => {
    vi.mocked(useVideosModule).useVideoList.mockReturnValue({
      data: [],
      isLoading: false,
    } as any)

    vi.mocked(useVideosModule).useUploadVideo.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any)

    render(
      <BrowserRouter>
        <VideoListPage />
      </BrowserRouter>
    )

    expect(screen.getByText("공정 동영상 분석")).toBeInTheDocument()
  })

  it("제목과 업로드 버튼을 표시해야 함", () => {
    vi.mocked(useVideosModule).useVideoList.mockReturnValue({
      data: [],
      isLoading: false,
    } as any)

    vi.mocked(useVideosModule).useUploadVideo.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any)

    render(
      <BrowserRouter>
        <VideoListPage />
      </BrowserRouter>
    )

    expect(screen.getByText("공정 동영상 분석")).toBeInTheDocument()
    expect(screen.getByText("동영상 업로드")).toBeInTheDocument()
  })

  it("비디오 목록을 표시해야 함", () => {
    vi.mocked(useVideosModule).useVideoList.mockReturnValue({
      data: mockVideos,
      isLoading: false,
    } as any)

    vi.mocked(useVideosModule).useUploadVideo.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any)

    render(
      <BrowserRouter>
        <VideoListPage />
      </BrowserRouter>
    )

    expect(screen.getByTestId("video-card-1")).toBeInTheDocument()
    expect(screen.getByTestId("video-card-2")).toBeInTheDocument()
  })

  it("로딩 중일 때 로딩 메시지를 표시해야 함", () => {
    vi.mocked(useVideosModule).useVideoList.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as any)

    vi.mocked(useVideosModule).useUploadVideo.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any)

    render(
      <BrowserRouter>
        <VideoListPage />
      </BrowserRouter>
    )

    expect(screen.getByText("불러오는 중...")).toBeInTheDocument()
  })

  it("비디오가 없을 때 빈 상태 메시지를 표시해야 함", () => {
    vi.mocked(useVideosModule).useVideoList.mockReturnValue({
      data: [],
      isLoading: false,
    } as any)

    vi.mocked(useVideosModule).useUploadVideo.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any)

    render(
      <BrowserRouter>
        <VideoListPage />
      </BrowserRouter>
    )

    expect(
      screen.getByText("업로드된 동영상이 없습니다. 동영상을 업로드하세요.")
    ).toBeInTheDocument()
  })

  it("파일 입력 클릭으로 파일 선택 대화를 열어야 함", () => {
    vi.mocked(useVideosModule).useVideoList.mockReturnValue({
      data: [],
      isLoading: false,
    } as any)

    vi.mocked(useVideosModule).useUploadVideo.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any)

    render(
      <BrowserRouter>
        <VideoListPage />
      </BrowserRouter>
    )

    const uploadButton = screen.getByText("동영상 업로드")
    fireEvent.click(uploadButton)

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).toBeInTheDocument()
  })

  it("파일 선택 시 업로드를 실행해야 함", async () => {
    const mockMutate = vi.fn()

    vi.mocked(useVideosModule).useVideoList.mockReturnValue({
      data: [],
      isLoading: false,
    } as any)

    vi.mocked(useVideosModule).useUploadVideo.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as any)

    render(
      <BrowserRouter>
        <VideoListPage />
      </BrowserRouter>
    )

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(["video content"], "test-video.mp4", { type: "video/mp4" })

    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(file)
    })
  })

  it("업로드 중일 때 버튼이 비활성화되어야 함", () => {
    vi.mocked(useVideosModule).useVideoList.mockReturnValue({
      data: [],
      isLoading: false,
    } as any)

    vi.mocked(useVideosModule).useUploadVideo.mockReturnValue({
      mutate: vi.fn(),
      isPending: true,
    } as any)

    render(
      <BrowserRouter>
        <VideoListPage />
      </BrowserRouter>
    )

    const uploadButton = screen.getByText("업로드 중...") as HTMLButtonElement
    expect(uploadButton.disabled).toBe(true)
  })

  it("올바른 파일 형식을 필터링해야 함", () => {
    vi.mocked(useVideosModule).useVideoList.mockReturnValue({
      data: [],
      isLoading: false,
    } as any)

    vi.mocked(useVideosModule).useUploadVideo.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    } as any)

    render(
      <BrowserRouter>
        <VideoListPage />
      </BrowserRouter>
    )

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput.accept).toBe(".mp4,.mov,.avi")
  })
})
