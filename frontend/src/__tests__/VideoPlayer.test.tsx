import { describe, it, expect, vi } from "vitest"
import { render, fireEvent } from "@testing-library/react"
import VideoPlayer from "../components/VideoPlayer"

describe("VideoPlayer", () => {
  it("렌더링되어야 함", () => {
    render(<VideoPlayer filePath="videos/test.mp4" />)
    const videoEl = document.querySelector("video")
    expect(videoEl).toBeInTheDocument()
  })

  it("올바른 src URL을 설정해야 함", () => {
    render(<VideoPlayer filePath="videos/test.mp4" />)
    const videoEl = document.querySelector("video") as HTMLVideoElement
    expect(videoEl.src).toBe("http://localhost:8000/videos/test.mp4")
  })

  it("controls 속성이 있어야 함", () => {
    render(<VideoPlayer filePath="videos/test.mp4" />)
    const videoEl = document.querySelector("video") as HTMLVideoElement
    expect(videoEl.controls).toBe(true)
  })

  it("onTimeUpdate 콜백이 없어도 오류 없이 동작해야 함", () => {
    expect(() => render(<VideoPlayer filePath="videos/test.mp4" />)).not.toThrow()
  })

  it("onTimeUpdate 콜백이 timeupdate 이벤트 시 호출되어야 함", () => {
    const onTimeUpdate = vi.fn()
    render(<VideoPlayer filePath="videos/test.mp4" onTimeUpdate={onTimeUpdate} />)
    const videoEl = document.querySelector("video") as HTMLVideoElement
    fireEvent.timeUpdate(videoEl)
    expect(onTimeUpdate).toHaveBeenCalled()
  })
})
