import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import WorkUnitCreator from "../components/WorkUnitCreator"

const defaultProps = () => ({
  nextSequence: 3,
  defaultStartTime: 60,
  defaultEndTime: 70,
  duration: 300,
  currentTime: 30,
  onSeek: vi.fn(),
  onPlayRange: vi.fn(),
  onCreate: vi.fn(),
  onCancel: vi.fn(),
})

describe("WorkUnitCreator", () => {
  it("헤더에 새 작업 추가 문구가 표시되어야 함", () => {
    render(<WorkUnitCreator {...defaultProps()} />)
    expect(screen.getByText("+ 새 작업 단위 추가")).toBeInTheDocument()
  })

  it("작업명이 비어 있으면 추가 버튼이 비활성화되어야 함", () => {
    render(<WorkUnitCreator {...defaultProps()} />)
    const addBtn = screen.getByTestId("creator-submit")
    expect(addBtn).toBeDisabled()
  })

  it("작업명 입력 후 추가 버튼이 활성화되어야 함", () => {
    render(<WorkUnitCreator {...defaultProps()} />)
    fireEvent.change(screen.getByPlaceholderText("예) 볼트 체결, 도장..."), {
      target: { value: "도장 작업" },
    })
    expect(screen.getByTestId("creator-submit")).not.toBeDisabled()
  })

  it("작업명 입력 후 추가 시 onCreate가 올바른 인수로 호출되어야 함", () => {
    const onCreate = vi.fn()
    render(<WorkUnitCreator {...defaultProps()} onCreate={onCreate} />)
    fireEvent.change(screen.getByPlaceholderText("예) 볼트 체결, 도장..."), {
      target: { value: "도장 작업" },
    })
    fireEvent.click(screen.getByTestId("creator-submit"))
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({
      sequence: 3,
      title: "도장 작업",
      startTime: 60,
      endTime: 70,
    }))
  })

  it("Enter 키로 추가할 수 있어야 함", () => {
    const onCreate = vi.fn()
    render(<WorkUnitCreator {...defaultProps()} onCreate={onCreate} />)
    const input = screen.getByPlaceholderText("예) 볼트 체결, 도장...")
    fireEvent.change(input, { target: { value: "조립" } })
    fireEvent.keyDown(input, { key: "Enter" })
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({ title: "조립" }))
  })

  it("닫기 버튼 클릭 시 onCancel이 호출되어야 함", () => {
    const onCancel = vi.fn()
    render(<WorkUnitCreator {...defaultProps()} onCancel={onCancel} />)
    fireEvent.click(screen.getByText("닫기"))
    expect(onCancel).toHaveBeenCalled()
  })

  it("취소 버튼 클릭 시 onCancel이 호출되어야 함", () => {
    const onCancel = vi.fn()
    render(<WorkUnitCreator {...defaultProps()} onCancel={onCancel} />)
    fireEvent.click(screen.getByRole("button", { name: "취소" }))
    expect(onCancel).toHaveBeenCalled()
  })

  it("구간 재생 버튼 클릭 시 onPlayRange가 호출되어야 함", () => {
    const onPlayRange = vi.fn()
    render(<WorkUnitCreator {...defaultProps()} onPlayRange={onPlayRange} />)
    fireEvent.click(screen.getByText("▶ 구간 재생"))
    expect(onPlayRange).toHaveBeenCalledWith(60, 70)
  })

  it("설비와 자재를 배열로 파싱하여 onCreate에 전달해야 함", () => {
    const onCreate = vi.fn()
    render(<WorkUnitCreator {...defaultProps()} onCreate={onCreate} />)
    fireEvent.change(screen.getByPlaceholderText("예) 볼트 체결, 도장..."), {
      target: { value: "작업" },
    })
    fireEvent.change(screen.getByPlaceholderText("설비 (쉼표로 구분)"), {
      target: { value: "드라이버, 렌치" },
    })
    fireEvent.change(screen.getByPlaceholderText("자재 (쉼표로 구분)"), {
      target: { value: "볼트, 너트" },
    })
    fireEvent.click(screen.getByTestId("creator-submit"))
    expect(onCreate).toHaveBeenCalledWith(expect.objectContaining({
      equipments: ["드라이버", "렌치"],
      materials: ["볼트", "너트"],
    }))
  })

  it("타임라인 드래그로 onSeek가 호출되어야 함", () => {
    const onSeek = vi.fn()
    render(<WorkUnitCreator {...defaultProps()} onSeek={onSeek} />)
    const timeline = screen.getByTestId("creator-timeline")
    Object.defineProperty(timeline, "getBoundingClientRect", {
      value: () => ({ left: 0, width: 100, top: 0, bottom: 20, right: 100, height: 20 }),
      configurable: true,
    })
    fireEvent.mouseDown(timeline, { clientX: 30 }) // 30% → 90초
    expect(onSeek).toHaveBeenCalled()
  })
})
