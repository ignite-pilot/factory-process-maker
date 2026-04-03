import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import GapCard from "../components/GapCard"

describe("GapCard", () => {
  const defaultProps = {
    startTime: 10,
    endTime: 20,
    onPlayRange: vi.fn(),
    onAdd: vi.fn(),
    onDismiss: vi.fn(),
  }

  it("미정의 작업 레이블을 표시해야 함", () => {
    render(<GapCard {...defaultProps} />)
    expect(screen.getByText("미정의 작업")).toBeInTheDocument()
  })

  it("갭 시간 범위를 표시해야 함", () => {
    render(<GapCard {...defaultProps} startTime={65} endTime={130} />)
    expect(screen.getByText(/1:05 ~ 2:10/)).toBeInTheDocument()
  })

  it("갭 지속시간을 초 단위로 표시해야 함", () => {
    render(<GapCard {...defaultProps} startTime={0} endTime={15} />)
    expect(screen.getByText(/15초/)).toBeInTheDocument()
  })

  it("재생 버튼 클릭 시 onPlayRange를 갭 시간으로 호출해야 함", () => {
    const onPlayRange = vi.fn()
    render(<GapCard {...defaultProps} onPlayRange={onPlayRange} />)
    fireEvent.click(screen.getByText("▶ 재생"))
    expect(onPlayRange).toHaveBeenCalledWith(10, 20)
  })

  it("작업추가 버튼 클릭 시 onAdd를 갭 시간으로 호출해야 함", () => {
    const onAdd = vi.fn()
    render(<GapCard {...defaultProps} onAdd={onAdd} />)
    fireEvent.click(screen.getByText("+ 작업추가"))
    expect(onAdd).toHaveBeenCalledWith(10, 20)
  })

  it("삭제 버튼 클릭 시 onDismiss를 호출해야 함", () => {
    const onDismiss = vi.fn()
    render(<GapCard {...defaultProps} onDismiss={onDismiss} />)
    fireEvent.click(screen.getByText("삭제"))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
