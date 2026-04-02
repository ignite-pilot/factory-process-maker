import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import WorkUnitItem from "../components/WorkUnitItem"
import type { WorkUnitResponse } from "../api/client"

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
  let onSelect: (id: number) => void
  let onDelete: (id: number) => void
  let onPlayRange: (startTime: number, endTime: number) => void

  beforeEach(() => {
    onSelect = vi.fn()
    onDelete = vi.fn()
    onPlayRange = vi.fn()
  })

  const defaultProps = () => ({
    workUnit: mockWorkUnit,
    isSelected: false,
    onSelect,
    onDelete,
    onPlayRange,
  })

  it("작업 제목을 렌더링해야 함", () => {
    render(<WorkUnitItem {...defaultProps()} />)
    expect(screen.getByText("조립 작업")).toBeInTheDocument()
  })

  it("순서 번호를 표시해야 함", () => {
    render(<WorkUnitItem {...defaultProps()} />)
    expect(screen.getByText("#1")).toBeInTheDocument()
  })

  it("시간 범위를 포맷하여 표시해야 함", () => {
    render(<WorkUnitItem {...defaultProps()} />)
    expect(screen.getByText(/0:00 ~ 0:30/)).toBeInTheDocument()
  })

  it("설명을 표시해야 함", () => {
    render(<WorkUnitItem {...defaultProps()} />)
    expect(screen.getByText("부품 조립")).toBeInTheDocument()
  })

  it("설비 목록을 표시해야 함", () => {
    render(<WorkUnitItem {...defaultProps()} />)
    expect(screen.getByText("설비: 드라이버, 렌치")).toBeInTheDocument()
  })

  it("자재 목록을 표시해야 함", () => {
    render(<WorkUnitItem {...defaultProps()} />)
    expect(screen.getByText("자재: 볼트, 너트")).toBeInTheDocument()
  })

  it("수동 편집 표시 - isManuallyEdited가 false이면 표시 안함", () => {
    render(<WorkUnitItem {...defaultProps()} />)
    expect(screen.queryByText("수동 편집됨")).not.toBeInTheDocument()
  })

  it("수동 편집 표시 - isManuallyEdited가 true이면 표시함", () => {
    render(<WorkUnitItem {...defaultProps()} workUnit={{ ...mockWorkUnit, isManuallyEdited: true }} />)
    expect(screen.getByText("수동 편집됨")).toBeInTheDocument()
  })

  it("카드 클릭 시 onSelect를 호출해야 함", () => {
    render(<WorkUnitItem {...defaultProps()} />)
    fireEvent.click(screen.getByText("조립 작업"))
    expect(vi.mocked(onSelect)).toHaveBeenCalledWith(mockWorkUnit.id)
  })

  it("▶ 재생 버튼 클릭 시 onPlayRange를 호출해야 함", () => {
    render(<WorkUnitItem {...defaultProps()} />)
    fireEvent.click(screen.getByText("▶ 재생"))
    expect(vi.mocked(onPlayRange)).toHaveBeenCalledWith(mockWorkUnit.startTime, mockWorkUnit.endTime)
  })

  it("▶ 재생 버튼 클릭 시 onSelect를 호출하지 않아야 함", () => {
    render(<WorkUnitItem {...defaultProps()} />)
    fireEvent.click(screen.getByText("▶ 재생"))
    expect(vi.mocked(onSelect)).not.toHaveBeenCalled()
  })

  it("삭제 버튼 클릭 시 onDelete를 호출해야 함", () => {
    render(<WorkUnitItem {...defaultProps()} />)
    fireEvent.click(screen.getByText("삭제"))
    expect(vi.mocked(onDelete)).toHaveBeenCalledWith(mockWorkUnit.id)
  })

  it("isSelected가 true이면 blue 테두리 클래스가 적용되어야 함", () => {
    const { container } = render(<WorkUnitItem {...defaultProps()} isSelected={true} />)
    expect(container.firstChild).toHaveClass("border-blue-500")
  })

  it("설비가 없을 때 설비 항목을 표시하지 않아야 함", () => {
    render(<WorkUnitItem {...defaultProps()} workUnit={{ ...mockWorkUnit, equipments: null }} />)
    expect(screen.queryByText(/설비:/)).not.toBeInTheDocument()
  })

  it("자재가 없을 때 자재 항목을 표시하지 않아야 함", () => {
    render(<WorkUnitItem {...defaultProps()} workUnit={{ ...mockWorkUnit, materials: null }} />)
    expect(screen.queryByText(/자재:/)).not.toBeInTheDocument()
  })

  it("설명이 없을 때 설명을 표시하지 않아야 함", () => {
    render(<WorkUnitItem {...defaultProps()} workUnit={{ ...mockWorkUnit, description: null }} />)
    expect(screen.queryByText("부품 조립")).not.toBeInTheDocument()
  })
})
