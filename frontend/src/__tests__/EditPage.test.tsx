import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { BrowserRouter } from "react-router-dom"
import EditPage from "../pages/EditPage"
import type { VideoResponse, WorkUnitResponse } from "../api/client"
import * as useVideosModule from "../hooks/useVideos"
import * as useWorkUnitsModule from "../hooks/useWorkUnits"

vi.mock("../hooks/useVideos")
vi.mock("../hooks/useWorkUnits")

// video 엘리먼트 mock (jsdom은 video 재생을 지원하지 않음)
window.HTMLMediaElement.prototype.load = vi.fn()
window.HTMLMediaElement.prototype.play = vi.fn()
window.HTMLMediaElement.prototype.pause = vi.fn()

const mockVideo: VideoResponse = {
  id: 1,
  fileName: "test-video.mp4",
  filePath: "videos/test-video.mp4",
  duration: 120,
  status: "done",
  createdAt: "2026-03-31T00:00:00Z",
}

const makeWorkUnit = (overrides: Partial<WorkUnitResponse> = {}): WorkUnitResponse => ({
  id: 1,
  videoId: 1,
  sequence: 1,
  title: "작업 1",
  startTime: 0,
  endTime: 10,
  duration: 10,
  description: null,
  equipments: null,
  materials: null,
  startFrame: null,
  endFrame: null,
  isManuallyEdited: false,
  createdAt: "2026-03-31T00:00:00Z",
  updatedAt: "2026-03-31T00:00:00Z",
  frames: [],
  ...overrides,
})

describe("EditPage", () => {
  const mutateFn = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useVideosModule).useVideoDetail.mockReturnValue({
      data: mockVideo,
    } as ReturnType<typeof useVideosModule.useVideoDetail>)
    vi.mocked(useWorkUnitsModule).useWorkUnits.mockReturnValue({
      data: [makeWorkUnit()],
    } as ReturnType<typeof useWorkUnitsModule.useWorkUnits>)
    vi.mocked(useWorkUnitsModule).useUpdateWorkUnit.mockReturnValue({
      mutate: mutateFn,
    } as unknown as ReturnType<typeof useWorkUnitsModule.useUpdateWorkUnit>)
    vi.mocked(useWorkUnitsModule).useDeleteWorkUnit.mockReturnValue({
      mutate: mutateFn,
    } as unknown as ReturnType<typeof useWorkUnitsModule.useDeleteWorkUnit>)
    vi.mocked(useWorkUnitsModule).useCreateWorkUnit.mockReturnValue({
      mutate: mutateFn,
    } as unknown as ReturnType<typeof useWorkUnitsModule.useCreateWorkUnit>)
  })

  it("비디오 파일명을 표시해야 함", () => {
    render(
      <BrowserRouter>
        <EditPage />
      </BrowserRouter>
    )
    expect(screen.getByText("test-video.mp4")).toBeInTheDocument()
  })

  it("비디오 플레이어를 렌더링해야 함", () => {
    render(
      <BrowserRouter>
        <EditPage />
      </BrowserRouter>
    )
    expect(document.querySelector("video")).toBeInTheDocument()
  })

  it("작업 단위 목록을 렌더링해야 함", () => {
    render(
      <BrowserRouter>
        <EditPage />
      </BrowserRouter>
    )
    expect(screen.getByText("작업 단위 목록")).toBeInTheDocument()
    expect(screen.getByText("작업 1")).toBeInTheDocument()
  })

  it("video 데이터가 없을 때 로딩 메시지를 표시해야 함", () => {
    vi.mocked(useVideosModule).useVideoDetail.mockReturnValue({
      data: undefined,
    } as ReturnType<typeof useVideosModule.useVideoDetail>)
    render(
      <BrowserRouter>
        <EditPage />
      </BrowserRouter>
    )
    expect(screen.getByText("불러오는 중...")).toBeInTheDocument()
  })

  it("작업 추가 버튼 클릭시 createWorkUnit.mutate를 호출해야 함", () => {
    render(
      <BrowserRouter>
        <EditPage />
      </BrowserRouter>
    )
    fireEvent.click(screen.getByText("+ 작업 추가"))
    expect(mutateFn).toHaveBeenCalledWith(expect.objectContaining({
      title: "새 작업",
    }))
  })

  it("작업 단위가 없을 때 작업 추가 시 sequence 1로 생성해야 함", () => {
    vi.mocked(useWorkUnitsModule).useWorkUnits.mockReturnValue({
      data: [] as WorkUnitResponse[],
    } as ReturnType<typeof useWorkUnitsModule.useWorkUnits>)
    render(
      <BrowserRouter>
        <EditPage />
      </BrowserRouter>
    )
    fireEvent.click(screen.getByText("+ 작업 추가"))
    expect(mutateFn).toHaveBeenCalledWith(expect.objectContaining({
      sequence: 1,
      startTime: 0,
      endTime: 10,
    }))
  })
})
