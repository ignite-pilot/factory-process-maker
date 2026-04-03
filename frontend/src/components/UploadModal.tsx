import { useRef, useState } from "react"

interface Props {
  onClose: () => void
  onUpload: (file: File, processName: string, description: string) => void
  isPending: boolean
}

export default function UploadModal({ onClose, onUpload, isPending }: Props) {
  const [processName, setProcessName] = useState("")
  const [description, setDescription] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const canUpload = processName.trim().length > 0 && file !== null && !isPending

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null
    setFile(selected)
  }

  const handleSubmit = () => {
    if (!file) return
    onUpload(file, processName.trim(), description)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 flex flex-col gap-4">
        <h2 className="text-lg font-bold">동영상 업로드</h2>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            공정 이름 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={processName}
            onChange={e => setProcessName(e.target.value)}
            placeholder="공정 이름을 입력하세요"
            className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">설명</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="공정 설명을 입력하세요 (선택)"
            rows={3}
            className="border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            동영상 파일 <span className="text-red-500">*</span>
          </label>
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed rounded px-4 py-6 text-center text-sm text-gray-500 cursor-pointer hover:border-blue-400 hover:text-blue-500"
          >
            {file ? file.name : "클릭하여 파일 선택 (.mp4, .mov, .avi)"}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".mp4,.mov,.avi"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <div className="flex gap-2 justify-end mt-2">
          <button
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 text-sm rounded border hover:bg-gray-50 disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canUpload}
            className="px-4 py-2 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {isPending ? "업로드 중..." : "업로드"}
          </button>
        </div>
      </div>
    </div>
  )
}
