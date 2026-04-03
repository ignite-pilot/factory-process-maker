import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import UploadModal from "../components/UploadModal"

describe("UploadModal", () => {
  const defaultProps = {
    onClose: vi.fn(),
    onUpload: vi.fn(),
    isPending: false,
  }

  it("렌더링되어야 함", () => {
    render(<UploadModal {...defaultProps} />)
    expect(screen.getByText("동영상 업로드")).toBeInTheDocument()
  })

  it("공정 이름 미입력 시 업로드 버튼 비활성화", () => {
    render(<UploadModal {...defaultProps} />)
    const uploadBtn = screen.getByText("업로드") as HTMLButtonElement
    expect(uploadBtn.disabled).toBe(true)
  })

  it("파일 미선택 시 업로드 버튼 비활성화", () => {
    render(<UploadModal {...defaultProps} />)
    fireEvent.change(screen.getByPlaceholderText("공정 이름을 입력하세요"), {
      target: { value: "공정A" },
    })
    const uploadBtn = screen.getByText("업로드") as HTMLButtonElement
    expect(uploadBtn.disabled).toBe(true)
  })

  it("공정 이름과 파일 선택 시 업로드 버튼 활성화", () => {
    render(<UploadModal {...defaultProps} />)
    fireEvent.change(screen.getByPlaceholderText("공정 이름을 입력하세요"), {
      target: { value: "공정A" },
    })
    const fileInput = document.querySelector("input[type='file']") as HTMLInputElement
    const file = new File(["content"], "test.mp4", { type: "video/mp4" })
    fireEvent.change(fileInput, { target: { files: [file] } })
    const uploadBtn = screen.getByText("업로드") as HTMLButtonElement
    expect(uploadBtn.disabled).toBe(false)
  })

  it("취소 버튼 클릭 시 onClose 호출", () => {
    const onClose = vi.fn()
    render(<UploadModal {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByText("취소"))
    expect(onClose).toHaveBeenCalled()
  })

  it("업로드 버튼 클릭 시 onUpload 호출", () => {
    const onUpload = vi.fn()
    render(<UploadModal {...defaultProps} onUpload={onUpload} />)
    fireEvent.change(screen.getByPlaceholderText("공정 이름을 입력하세요"), {
      target: { value: "공정A" },
    })
    const fileInput = document.querySelector("input[type='file']") as HTMLInputElement
    const file = new File(["content"], "test.mp4", { type: "video/mp4" })
    fireEvent.change(fileInput, { target: { files: [file] } })
    fireEvent.click(screen.getByText("업로드"))
    expect(onUpload).toHaveBeenCalledWith(file, "공정A", "")
  })

  it("isPending 중 업로드 버튼 비활성화", () => {
    render(<UploadModal {...defaultProps} isPending={true} />)
    const uploadBtn = screen.getByText("업로드 중...") as HTMLButtonElement
    expect(uploadBtn.disabled).toBe(true)
  })
})
