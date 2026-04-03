import { useRef, useState } from "react"
import type { WorkUnitResponse, WorkUnitUpdateRequest } from "../api/client"

interface WorkUnitEditorProps {
  workUnit: WorkUnitResponse
  duration: number
  currentTime: number
  onSeek: (time: number) => void
  onPlayRange: (startTime: number, endTime: number) => void
  onSave: (id: number, body: WorkUnitUpdateRequest) => void
  onCancel: () => void
}

function toMMSS(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
}

function fromMMSS(str: string): number | null {
  const match = str.match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  return parseInt(match[1]) * 60 + parseInt(match[2])
}

export default function WorkUnitEditor({
  workUnit,
  duration,
  currentTime,
  onSeek,
  onPlayRange,
  onSave,
  onCancel,
}: WorkUnitEditorProps) {
  const [startTime, setStartTime] = useState(workUnit.startTime)
  const [endTime, setEndTime] = useState(workUnit.endTime)
  const [title, setTitle] = useState(workUnit.title)
  const [description, setDescription] = useState(workUnit.description ?? "")
  const [equipments, setEquipments] = useState((workUnit.equipments ?? []).join(", "))
  const [materials, setMaterials] = useState((workUnit.materials ?? []).join(", "))

  const [isDragging, setIsDragging] = useState(false)
  const timelineRef = useRef<HTMLDivElement>(null)

  const startRatio = duration > 0 ? startTime / duration : 0
  const endRatio = duration > 0 ? endTime / duration : 0
  const currentRatio = duration > 0 ? currentTime / duration : 0

  function ratioToTime(clientX: number, rect: DOMRect): number {
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return Math.round(ratio * duration * 10) / 10
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const time = ratioToTime(e.clientX, rect)
    setStartTime(time)
    setEndTime(time)
    setIsDragging(true)
    onSeek(time)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return
    const rect = e.currentTarget.getBoundingClientRect()
    const time = ratioToTime(e.clientX, rect)
    const clamped = Math.max(startTime, time)
    setEndTime(clamped)
    onSeek(clamped)
  }

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return
    const rect = e.currentTarget.getBoundingClientRect()
    const time = ratioToTime(e.clientX, rect)
    const clamped = Math.max(startTime, time)
    setEndTime(clamped)
    onSeek(clamped)
    setIsDragging(false)
  }

  const handleMouseLeave = () => {
    if (isDragging) setIsDragging(false)
  }

  const handleStartInput = (value: string) => {
    const parsed = fromMMSS(value)
    if (parsed === null || parsed < 0 || parsed > duration) return
    setStartTime(parsed)
    if (endTime < parsed) setEndTime(parsed)
    onSeek(parsed)
  }

  const handleEndInput = (value: string) => {
    const parsed = fromMMSS(value)
    if (parsed === null || parsed < 0 || parsed > duration) return
    const clamped = Math.max(parsed, startTime)
    setEndTime(clamped)
    onSeek(clamped)
  }

  const handleSave = () => {
    if (!title.trim()) return
    onSave(workUnit.id, {
      title: title.trim(),
      startTime,
      endTime,
      description: description.trim() || undefined,
      equipments: equipments.split(",").map(s => s.trim()).filter(Boolean),
      materials: materials.split(",").map(s => s.trim()).filter(Boolean),
    })
  }

  return (
    <div className="mt-3 bg-slate-800 border border-blue-700 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-blue-300 text-xs font-medium">✏ 작업 단위 편집 — #{workUnit.sequence}</p>
        <button onClick={onCancel} className="text-slate-500 text-xs hover:text-slate-300">
          닫기
        </button>
      </div>

      {/* 타임라인 */}
      <div
        ref={timelineRef}
        data-testid="editor-timeline"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        className="relative h-7 bg-slate-900 rounded border border-slate-600 cursor-crosshair mb-2 overflow-hidden select-none"
      >
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none">
          {isDragging ? "드래그=끝점" : "클릭·드래그=구간 설정"}
        </span>
        <div
          className="absolute top-0 w-px h-full bg-slate-400 opacity-50 pointer-events-none"
          style={{ left: `${currentRatio * 100}%` }}
        />
        <div
          className="absolute top-0 h-full bg-blue-500 opacity-25 pointer-events-none"
          style={{ left: `${startRatio * 100}%`, width: `${(endRatio - startRatio) * 100}%` }}
        />
        <div
          className="absolute top-0 w-0.5 h-full bg-green-500 pointer-events-none"
          style={{ left: `${startRatio * 100}%` }}
        />
        <div
          className="absolute top-0 w-0.5 h-full bg-red-500 pointer-events-none"
          style={{ left: `${endRatio * 100}%` }}
        />
      </div>

      {/* 시간 입력 */}
      <div className="flex items-center gap-2 mb-3">
        <span className="bg-green-900 text-green-300 text-xs px-1.5 py-0.5 rounded">S</span>
        <input
          type="text"
          value={toMMSS(startTime)}
          onChange={e => handleStartInput(e.target.value)}
          className="w-16 bg-slate-900 border border-green-700 rounded px-2 py-1 text-green-300 text-xs text-center"
        />
        <span className="text-slate-500 text-xs">~</span>
        <span className="bg-red-900 text-red-300 text-xs px-1.5 py-0.5 rounded">E</span>
        <input
          type="text"
          value={toMMSS(endTime)}
          onChange={e => handleEndInput(e.target.value)}
          className="w-16 bg-slate-900 border border-red-700 rounded px-2 py-1 text-red-300 text-xs text-center"
        />
        <span className="text-slate-400 text-xs">({Math.round(endTime - startTime)}초)</span>
        <button
          onClick={() => onPlayRange(startTime, endTime)}
          className="ml-1 bg-emerald-700 hover:bg-emerald-600 text-white text-xs px-2 py-1 rounded"
        >
          ▶ 구간 재생
        </button>
      </div>

      {/* 작업명 */}
      <div className="mb-2">
        <label className="text-slate-400 text-xs mb-1 block">작업명</label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          placeholder="작업명"
        />
      </div>

      {/* 설명 */}
      <div className="mb-2">
        <label className="text-slate-400 text-xs mb-1 block">설명</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={2}
          className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-none"
          placeholder="작업 설명"
        />
      </div>

      {/* 설비 */}
      <div className="mb-2">
        <label className="text-slate-400 text-xs mb-1 block">설비</label>
        <input
          type="text"
          value={equipments}
          onChange={e => setEquipments(e.target.value)}
          className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          placeholder="설비 (쉼표로 구분)"
        />
      </div>

      {/* 자재 */}
      <div className="mb-3">
        <label className="text-slate-400 text-xs mb-1 block">자재</label>
        <input
          type="text"
          value={materials}
          onChange={e => setMaterials(e.target.value)}
          className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
          placeholder="자재 (쉼표로 구분)"
        />
      </div>

      {/* 저장/취소 */}
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={!title.trim()}
          className="flex-1 bg-blue-600 text-white text-sm py-1.5 rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          저장
        </button>
        <button
          onClick={onCancel}
          className="px-4 bg-slate-700 text-slate-300 text-sm py-1.5 rounded hover:bg-slate-600"
        >
          취소
        </button>
      </div>
    </div>
  )
}
