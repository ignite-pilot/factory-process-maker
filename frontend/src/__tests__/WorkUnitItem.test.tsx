import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import WorkUnitItem from "../components/WorkUnitItem"
import type { WorkUnitResponse, WorkUnitUpdateRequest } from "../api/client"

const mockWorkUnit: WorkUnitResponse = {
  id: 1,
  videoId: 10,
  sequence: 1,
  title: "조립 작업",
  startTime: 0,
  endTime: 30,
  duration: 30,
  description: "부품 조립",
  equipments: ["드라이버", "렌치"],
  materials: ["볼트", "너트"],
  startFrame: null,
  endFrame: null,
  isManuallyEdited: false,
  createdAt: "2026-03-31T00:00:00Z",
  updatedAt: "2026-03-31T00:00:00Z",
  frames: [],
}

describe("WorkUnitItem", () => {
  let onUpdate: (id: number, body: WorkUnitUpdateRequest) => void
  let onDelete: (id: number) => void

  beforeEach(() => {
    onUpdate = vi.fn() as unknown as (id: number, body: WorkUnitUpdateRequest) => void
    onDelete = vi.fn() as unknown as (id: number) => void
  })

  it("작업 제목을 렌더링해야 함", () => {
    render(<WorkUnitItem workUnit={mockWorkUnit} onUpdate={onUpdate} onDelete={onDelete} />)
    expect(screen.getByText("조립 작업")).toBeInTheDocument()
  })

  it("순서 번호를 표시해야 함", () => {
    render(<WorkUnitItem workUnit={mockWorkUnit} onUpdate={onUpdate} onDelete={onDelete} />)
    expect(screen.getByText("#1")).toBeInTheDocument()
  })

  it("시간 범위를 포맷하여 표시해야 함", () => {
    render(<WorkUnitItem workUnit={mockWorkUnit} onUpdate={onUpdate} onDelete={onDelete} />)
    expect(screen.getByText(/0:00 ~ 0:30/)).toBeInTheDocument()
  })

  it("설명을 표시해야 함", () => {
    render(<WorkUnitItem workUnit={mockWorkUnit} onUpdate={onUpdate} onDelete={onDelete} />)
    expect(screen.getByText("부품 조립")).toBeInTheDocument()
  })

  it("설비 목록을 표시해야 함", () => {
    render(<WorkUnitItem workUnit={mockWorkUnit} onUpdate={onUpdate} onDelete={onDelete} />)
    expect(screen.getByText("설비: 드라이버, 렌치")).toBeInTheDocument()
  })

  it("자재 목록을 표시해야 함", () => {
    render(<WorkUnitItem workUnit={mockWorkUnit} onUpdate={onUpdate} onDelete={onDelete} />)
    expect(screen.getByText("자재: 볼트, 너트")).toBeInTheDocument()
  })

  it("수동 편집 표시 - isManuallyEdited가 false이면 표시 안함", () => {
    render(<WorkUnitItem workUnit={mockWorkUnit} onUpdate={onUpdate} onDelete={onDelete} />)
    expect(screen.queryByText("수동 편집됨")).not.toBeInTheDocument()
  })

  it("수동 편집 표시 - isManuallyEdited가 true이면 표시함", () => {
    const editedUnit = { ...mockWorkUnit, isManuallyEdited: true }
    render(<WorkUnitItem workUnit={editedUnit} onUpdate={onUpdate} onDelete={onDelete} />)
    expect(screen.getByText("수동 편집됨")).toBeInTheDocument()
  })

  it("수정 버튼 클릭시 편집 모드로 전환해야 함", () => {
    render(<WorkUnitItem workUnit={mockWorkUnit} onUpdate={onUpdate} onDelete={onDelete} />)
    fireEvent.click(screen.getByText("수정"))
    expect(screen.getByPlaceholderText("작업명")).toBeInTheDocument()
  })

  it("편집 모드에서 취소 버튼 클릭시 뷰 모드로 복귀해야 함", () => {
    render(<WorkUnitItem workUnit={mockWorkUnit} onUpdate={onUpdate} onDelete={onDelete} />)
    fireEvent.click(screen.getByText("수정"))
    fireEvent.click(screen.getByText("취소"))
    expect(screen.getByText("조립 작업")).toBeInTheDocument()
    expect(screen.queryByPlaceholderText("작업명")).not.toBeInTheDocument()
  })

  it("저장 버튼 클릭시 onUpdate를 호출해야 함", () => {
    render(<WorkUnitItem workUnit={mockWorkUnit} onUpdate={onUpdate} onDelete={onDelete} />)
    fireEvent.click(screen.getByText("수정"))
    fireEvent.click(screen.getByText("저장"))
    expect(vi.mocked(onUpdate)).toHaveBeenCalledWith(mockWorkUnit.id, expect.objectContaining({
      title: "조립 작업",
      startTime: 0,
      endTime: 30,
    }))
  })

  it("삭제 버튼 클릭시 onDelete를 호출해야 함", () => {
    render(<WorkUnitItem workUnit={mockWorkUnit} onUpdate={onUpdate} onDelete={onDelete} />)
    fireEvent.click(screen.getByText("삭제"))
    expect(vi.mocked(onDelete)).toHaveBeenCalledWith(mockWorkUnit.id)
  })

  it("편집 모드에서 제목 변경 후 저장하면 변경된 값으로 onUpdate 호출해야 함", () => {
    render(<WorkUnitItem workUnit={mockWorkUnit} onUpdate={onUpdate} onDelete={onDelete} />)
    fireEvent.click(screen.getByText("수정"))
    const titleInput = screen.getByPlaceholderText("작업명")
    fireEvent.change(titleInput, { target: { value: "수정된 작업" } })
    fireEvent.click(screen.getByText("저장"))
    expect(vi.mocked(onUpdate)).toHaveBeenCalledWith(mockWorkUnit.id, expect.objectContaining({
      title: "수정된 작업",
    }))
  })

  it("설비가 없을 때 설비 항목을 표시하지 않아야 함", () => {
    const unitWithoutEquipments = { ...mockWorkUnit, equipments: null }
    render(<WorkUnitItem workUnit={unitWithoutEquipments} onUpdate={onUpdate} onDelete={onDelete} />)
    expect(screen.queryByText(/설비:/)).not.toBeInTheDocument()
  })

  it("자재가 없을 때 자재 항목을 표시하지 않아야 함", () => {
    const unitWithoutMaterials = { ...mockWorkUnit, materials: null }
    render(<WorkUnitItem workUnit={unitWithoutMaterials} onUpdate={onUpdate} onDelete={onDelete} />)
    expect(screen.queryByText(/자재:/)).not.toBeInTheDocument()
  })

  it("설명이 없을 때 설명을 표시하지 않아야 함", () => {
    const unitWithoutDescription = { ...mockWorkUnit, description: null }
    render(<WorkUnitItem workUnit={unitWithoutDescription} onUpdate={onUpdate} onDelete={onDelete} />)
    expect(screen.queryByText("부품 조립")).not.toBeInTheDocument()
  })
})
