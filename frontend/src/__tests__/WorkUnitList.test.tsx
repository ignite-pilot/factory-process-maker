import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import WorkUnitList from "../components/WorkUnitList"
import type { WorkUnitResponse } from "../api/client"

const makeWorkUnit = (overrides: Partial<WorkUnitResponse> = {}): WorkUnitResponse => ({
  id: 1,
  videoId: 10,
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

describe("WorkUnitList", () => {
  let onDelete: (id: number) => void
  let onAdd: () => void
  let onPlayRange: (startTime: number, endTime: number) => void

  beforeEach(() => {
    onDelete = vi.fn()
    onAdd = vi.fn()
    onPlayRange = vi.fn()
  })

  const defaultProps = (workUnits: WorkUnitResponse[] = []) => ({
    workUnits,
    selectedId: null,
    onSelect: vi.fn(),
    onDelete,
    onAdd,
    onPlayRange,
  })

  it("헤더 제목을 표시해야 함", () => {
    render(<WorkUnitList {...defaultProps()} />)
    expect(screen.getByText("작업 단위 목록")).toBeInTheDocument()
  })

  it("작업 단위가 없을 때 빈 상태 메시지를 표시해야 함", () => {
    render(<WorkUnitList {...defaultProps()} />)
    expect(screen.getByText("작업 단위가 없습니다.")).toBeInTheDocument()
  })

  it("작업 단위 목록을 렌더링해야 함", () => {
    const workUnits = [
      makeWorkUnit({ id: 1, sequence: 1, title: "작업 A" }),
      makeWorkUnit({ id: 2, sequence: 2, title: "작업 B" }),
    ]
    render(<WorkUnitList {...defaultProps(workUnits)} />)
    expect(screen.getByText("작업 A")).toBeInTheDocument()
    expect(screen.getByText("작업 B")).toBeInTheDocument()
  })

  it("작업 추가 버튼을 표시해야 함", () => {
    render(<WorkUnitList {...defaultProps()} />)
    expect(screen.getByText("+ 작업 추가")).toBeInTheDocument()
  })

  it("작업 추가 버튼 클릭 시 onAdd를 호출해야 함", () => {
    render(<WorkUnitList {...defaultProps()} />)
    fireEvent.click(screen.getByText("+ 작업 추가"))
    expect(vi.mocked(onAdd)).toHaveBeenCalledTimes(1)
  })

  it("작업 단위가 있을 때 빈 상태 메시지를 표시하지 않아야 함", () => {
    render(<WorkUnitList {...defaultProps([makeWorkUnit({ title: "작업 1" })])} />)
    expect(screen.queryByText("작업 단위가 없습니다.")).not.toBeInTheDocument()
  })

  it("각 작업 단위의 삭제 버튼 클릭 시 onDelete를 올바른 id로 호출해야 함", () => {
    render(<WorkUnitList {...defaultProps([makeWorkUnit({ id: 42, title: "삭제 대상" })])} />)
    fireEvent.click(screen.getByText("삭제"))
    expect(vi.mocked(onDelete)).toHaveBeenCalledWith(42)
  })

  it("▶ 재생 버튼 클릭 시 onPlayRange를 호출해야 함", () => {
    const wu = makeWorkUnit({ id: 5, startTime: 10, endTime: 40 })
    render(<WorkUnitList {...defaultProps([wu])} />)
    fireEvent.click(screen.getByText("▶ 재생"))
    expect(vi.mocked(onPlayRange)).toHaveBeenCalledWith(10, 40)
  })
})
