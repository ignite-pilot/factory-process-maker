import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import WorkUnitEditor from "../components/WorkUnitEditor"
import type { WorkUnitResponse } from "../api/client"

const mockWorkUnit: WorkUnitResponse = {
  id: 1,
  videoId: 10,
  sequence: 2,
  title: "볼트 체결",
  startTime: 30,
  endTime: 90,
  duration: 60,
  description: "M8 볼트 체결 작업",
  equipments: ["토크렌치"],
  materials: ["M8 볼트"],
  startFrame: null,
  endFrame: null,
  isManuallyEdited: false,
  createdAt: "2026-04-02T00:00:00Z",
  updatedAt: "2026-04-02T00:00:00Z",
  frames: [],
}

const defaultProps = () => ({
  workUnit: mockWorkUnit,
  duration: 300,
  currentTime: 45,
  onSeek: vi.fn(),
  onPlayRange: vi.fn(),
  onSave: vi.fn(),
  onCancel: vi.fn(),
})

describe("WorkUnitEditor", () => {
  it("작업 순서 번호를 헤더에 표시해야 함", () => {
    render(<WorkUnitEditor {...defaultProps()} />)
    expect(screen.getByText(/편집 — #2/)).toBeInTheDocument()
  })

  it("기존 작업명이 입력 필드에 초기화되어야 함", () => {
    render(<WorkUnitEditor {...defaultProps()} />)
    const input = screen.getByPlaceholderText("작업명")
    expect((input as HTMLInputElement).value).toBe("볼트 체결")
  })

  it("기존 설명이 textarea에 초기화되어야 함", () => {
    render(<WorkUnitEditor {...defaultProps()} />)
    const textarea = screen.getByPlaceholderText("작업 설명")
    expect((textarea as HTMLTextAreaElement).value).toBe("M8 볼트 체결 작업")
  })

  it("기존 설비가 입력 필드에 초기화되어야 함", () => {
    render(<WorkUnitEditor {...defaultProps()} />)
    const input = screen.getByPlaceholderText("설비 (쉼표로 구분)")
    expect((input as HTMLInputElement).value).toBe("토크렌치")
  })

  it("기존 자재가 입력 필드에 초기화되어야 함", () => {
    render(<WorkUnitEditor {...defaultProps()} />)
    const input = screen.getByPlaceholderText("자재 (쉼표로 구분)")
    expect((input as HTMLInputElement).value).toBe("M8 볼트")
  })

  it("저장 버튼 클릭 시 onSave가 올바른 인수로 호출되어야 함", () => {
    const onSave = vi.fn()
    render(<WorkUnitEditor {...defaultProps()} onSave={onSave} />)
    fireEvent.click(screen.getByText("저장"))
    expect(onSave).toHaveBeenCalledWith(1, expect.objectContaining({
      title: "볼트 체결",
      startTime: 30,
      endTime: 90,
    }))
  })

  it("작업명이 비어 있으면 저장 버튼이 비활성화되어야 함", () => {
    render(<WorkUnitEditor {...defaultProps()} />)
    const titleInput = screen.getByPlaceholderText("작업명")
    fireEvent.change(titleInput, { target: { value: "" } })
    expect(screen.getByText("저장")).toBeDisabled()
  })

  it("취소 버튼 클릭 시 onCancel이 호출되어야 함", () => {
    const onCancel = vi.fn()
    render(<WorkUnitEditor {...defaultProps()} onCancel={onCancel} />)
    fireEvent.click(screen.getAllByText("취소")[0])
    expect(onCancel).toHaveBeenCalled()
  })

  it("닫기 버튼 클릭 시 onCancel이 호출되어야 함", () => {
    const onCancel = vi.fn()
    render(<WorkUnitEditor {...defaultProps()} onCancel={onCancel} />)
    fireEvent.click(screen.getByText("닫기"))
    expect(onCancel).toHaveBeenCalled()
  })

  it("구간 재생 버튼 클릭 시 onPlayRange가 호출되어야 함", () => {
    const onPlayRange = vi.fn()
    render(<WorkUnitEditor {...defaultProps()} onPlayRange={onPlayRange} />)
    fireEvent.click(screen.getByText("▶ 구간 재생"))
    expect(onPlayRange).toHaveBeenCalledWith(30, 90)
  })

  it("타임라인 클릭 시 onSeek가 호출되어야 함", () => {
    const onSeek = vi.fn()
    render(<WorkUnitEditor {...defaultProps()} onSeek={onSeek} />)
    const timeline = screen.getByTestId("editor-timeline")
    Object.defineProperty(timeline, "getBoundingClientRect", {
      value: () => ({ left: 0, width: 100, top: 0, bottom: 20, right: 100, height: 20 }),
      configurable: true,
    })
    fireEvent.click(timeline, { clientX: 50 }) // 50% → 150초
    expect(onSeek).toHaveBeenCalledWith(150)
  })

  it("작업명 변경 후 저장 시 변경된 값이 onSave에 전달되어야 함", () => {
    const onSave = vi.fn()
    render(<WorkUnitEditor {...defaultProps()} onSave={onSave} />)
    const titleInput = screen.getByPlaceholderText("작업명")
    fireEvent.change(titleInput, { target: { value: "수정된 작업명" } })
    fireEvent.click(screen.getByText("저장"))
    expect(onSave).toHaveBeenCalledWith(1, expect.objectContaining({ title: "수정된 작업명" }))
  })

  it("설명 변경 후 저장 시 변경된 설명이 onSave에 전달되어야 함", () => {
    const onSave = vi.fn()
    render(<WorkUnitEditor {...defaultProps()} onSave={onSave} />)
    const textarea = screen.getByPlaceholderText("작업 설명")
    fireEvent.change(textarea, { target: { value: "새로운 설명" } })
    fireEvent.click(screen.getByText("저장"))
    expect(onSave).toHaveBeenCalledWith(1, expect.objectContaining({ description: "새로운 설명" }))
  })

  it("설비 변경 후 저장 시 배열로 파싱되어 onSave에 전달되어야 함", () => {
    const onSave = vi.fn()
    render(<WorkUnitEditor {...defaultProps()} onSave={onSave} />)
    const input = screen.getByPlaceholderText("설비 (쉼표로 구분)")
    fireEvent.change(input, { target: { value: "드라이버, 렌치" } })
    fireEvent.click(screen.getByText("저장"))
    expect(onSave).toHaveBeenCalledWith(1, expect.objectContaining({
      equipments: ["드라이버", "렌치"],
    }))
  })
})
