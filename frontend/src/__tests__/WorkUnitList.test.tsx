import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import WorkUnitList from "../components/WorkUnitList"
import type { WorkUnitResponse, WorkUnitUpdateRequest } from "../api/client"

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
  let onUpdate: (id: number, body: WorkUnitUpdateRequest) => void
  let onDelete: (id: number) => void
  let onAdd: () => void

  beforeEach(() => {
    onUpdate = vi.fn() as unknown as (id: number, body: WorkUnitUpdateRequest) => void
    onDelete = vi.fn() as unknown as (id: number) => void
    onAdd = vi.fn() as unknown as () => void
  })

  it("헤더 제목을 표시해야 함", () => {
    render(<WorkUnitList workUnits={[]} onUpdate={onUpdate} onDelete={onDelete} onAdd={onAdd} />)
    expect(screen.getByText("작업 단위 목록")).toBeInTheDocument()
  })

  it("작업 단위가 없을 때 빈 상태 메시지를 표시해야 함", () => {
    render(<WorkUnitList workUnits={[]} onUpdate={onUpdate} onDelete={onDelete} onAdd={onAdd} />)
    expect(screen.getByText("작업 단위가 없습니다.")).toBeInTheDocument()
  })

  it("작업 단위 목록을 렌더링해야 함", () => {
    const workUnits = [
      makeWorkUnit({ id: 1, sequence: 1, title: "작업 A" }),
      makeWorkUnit({ id: 2, sequence: 2, title: "작업 B" }),
    ]
    render(<WorkUnitList workUnits={workUnits} onUpdate={onUpdate} onDelete={onDelete} onAdd={onAdd} />)
    expect(screen.getByText("작업 A")).toBeInTheDocument()
    expect(screen.getByText("작업 B")).toBeInTheDocument()
  })

  it("작업 추가 버튼을 표시해야 함", () => {
    render(<WorkUnitList workUnits={[]} onUpdate={onUpdate} onDelete={onDelete} onAdd={onAdd} />)
    expect(screen.getByText("+ 작업 추가")).toBeInTheDocument()
  })

  it("작업 추가 버튼 클릭시 onAdd를 호출해야 함", () => {
    render(<WorkUnitList workUnits={[]} onUpdate={onUpdate} onDelete={onDelete} onAdd={onAdd} />)
    fireEvent.click(screen.getByText("+ 작업 추가"))
    expect(vi.mocked(onAdd)).toHaveBeenCalledTimes(1)
  })

  it("작업 단위가 있을 때 빈 상태 메시지를 표시하지 않아야 함", () => {
    const workUnits = [makeWorkUnit({ title: "작업 1" })]
    render(<WorkUnitList workUnits={workUnits} onUpdate={onUpdate} onDelete={onDelete} onAdd={onAdd} />)
    expect(screen.queryByText("작업 단위가 없습니다.")).not.toBeInTheDocument()
  })

  it("각 작업 단위의 삭제 버튼 클릭시 onDelete를 올바른 id로 호출해야 함", () => {
    const workUnits = [makeWorkUnit({ id: 42, title: "삭제 대상" })]
    render(<WorkUnitList workUnits={workUnits} onUpdate={onUpdate} onDelete={onDelete} onAdd={onAdd} />)
    fireEvent.click(screen.getByText("삭제"))
    expect(vi.mocked(onDelete)).toHaveBeenCalledWith(42)
  })
})
