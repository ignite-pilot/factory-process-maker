import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import RangeSelector from "../components/RangeSelector"

// jsdom은 getBoundingClientRect를 지원하지 않으므로 타임라인 엘리먼트에 직접 mock
function clickTimeline(el: HTMLElement, ratio: number) {
  Object.defineProperty(el, "getBoundingClientRect", {
    value: () => ({ left: 0, width: 100, top: 0, bottom: 20, right: 100, height: 20 }),
    configurable: true,
  })
  fireEvent.click(el, { clientX: ratio * 100 })
}

describe("RangeSelector — 클릭 마커", () => {
  const defaultProps = {
    duration: 60,
    currentTime: 0,
    onAdd: vi.fn(),
  }

  it("처음 렌더링 시 인라인 폼이 보이지 않아야 함", () => {
    render(<RangeSelector {...defaultProps} />)
    expect(screen.queryByPlaceholderText("예) 볼트 체결, 도장...")).not.toBeInTheDocument()
  })

  it("1번째 클릭 시 시작 시간이 설정되고 폼은 아직 보이지 않아야 함", () => {
    render(<RangeSelector {...defaultProps} />)
    const timeline = screen.getByTestId("timeline")
    clickTimeline(timeline, 0.2) // 60 * 0.2 = 12초
    expect(screen.queryByPlaceholderText("예) 볼트 체결, 도장...")).not.toBeInTheDocument()
    expect(screen.getByDisplayValue("00:12")).toBeInTheDocument()
  })

  it("2번째 클릭 시 끝 시간이 설정되고 인라인 폼이 나타나야 함", () => {
    render(<RangeSelector {...defaultProps} />)
    const timeline = screen.getByTestId("timeline")
    clickTimeline(timeline, 0.2) // 시작 12초
    clickTimeline(timeline, 0.5) // 끝 30초
    expect(screen.getByPlaceholderText("예) 볼트 체결, 도장...")).toBeInTheDocument()
  })

  it("끝점 클릭이 시작점보다 앞이면 두 값이 swap되어야 함", () => {
    render(<RangeSelector {...defaultProps} />)
    const timeline = screen.getByTestId("timeline")
    clickTimeline(timeline, 0.5) // 시작 30초
    clickTimeline(timeline, 0.2) // 끝 클릭이지만 12초 < 30초 → swap
    const inputs = screen.getAllByRole("textbox") as HTMLInputElement[]
    // 첫 번째 input이 시작(더 작은 값), 두 번째가 끝(더 큰 값)
    expect(inputs[0].value).toBe("00:12")
    expect(inputs[1].value).toBe("00:30")
  })

  it("3번째 클릭 시 마커가 초기화되고 폼이 사라져야 함", () => {
    render(<RangeSelector {...defaultProps} />)
    const timeline = screen.getByTestId("timeline")
    clickTimeline(timeline, 0.2)
    clickTimeline(timeline, 0.5)
    clickTimeline(timeline, 0.8) // 3번째 → 초기화 후 새 시작점 설정
    expect(screen.queryByPlaceholderText("예) 볼트 체결, 도장...")).not.toBeInTheDocument()
  })
})

describe("RangeSelector — 인라인 폼 제출", () => {
  const onAdd = vi.fn()
  const defaultProps = { duration: 60, currentTime: 0, onAdd }

  function setup() {
    const utils = render(<RangeSelector {...defaultProps} />)
    const timeline = screen.getByTestId("timeline")
    Object.defineProperty(timeline, "getBoundingClientRect", {
      value: () => ({ left: 0, width: 100, top: 0, bottom: 20, right: 100, height: 20 }),
      configurable: true,
    })
    fireEvent.click(timeline, { clientX: 20 }) // 시작 12초
    fireEvent.click(timeline, { clientX: 50 }) // 끝 30초
    return utils
  }

  it("제목 입력 후 버튼 클릭 시 onAdd가 올바른 인수로 호출되어야 함", () => {
    setup()
    const input = screen.getByPlaceholderText("예) 볼트 체결, 도장...")
    fireEvent.change(input, { target: { value: "볼트 체결" } })
    fireEvent.click(screen.getByText("+ 작업으로 추가"))
    expect(onAdd).toHaveBeenCalledWith(12, 30, "볼트 체결")
  })

  it("제목 입력 후 Enter 키로 제출할 수 있어야 함", () => {
    setup()
    const input = screen.getByPlaceholderText("예) 볼트 체결, 도장...")
    fireEvent.change(input, { target: { value: "도장" } })
    fireEvent.keyDown(input, { key: "Enter" })
    expect(onAdd).toHaveBeenCalledWith(12, 30, "도장")
  })

  it("제목이 비어 있으면 버튼이 비활성화되어야 함", () => {
    setup()
    const button = screen.getByText("+ 작업으로 추가")
    expect(button).toBeDisabled()
  })

  it("제출 성공 후 폼이 초기화되어야 함", () => {
    setup()
    const input = screen.getByPlaceholderText("예) 볼트 체결, 도장...")
    fireEvent.change(input, { target: { value: "볼트 체결" } })
    fireEvent.click(screen.getByText("+ 작업으로 추가"))
    expect(screen.queryByPlaceholderText("예) 볼트 체결, 도장...")).not.toBeInTheDocument()
  })
})
