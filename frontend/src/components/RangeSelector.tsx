import { useRef, useState } from "react"

interface RangeSelectorProps {
  duration: number
  currentTime: number
  onAdd: (startTime: number, endTime: number, title: string) => void
  onSeek: (time: number) => void
  onPlayRange: (startTime: number, endTime: number) => void
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

export default function RangeSelector({
  duration,
  currentTime,
  onAdd,
  onSeek,
  onPlayRange,
}: RangeSelectorProps) {
  const [startTime, setStartTime] = useState<number | null>(null)
  const [endTime, setEndTime] = useState<number | null>(null)
  const [title, setTitle] = useState("")
  const [isDragging, setIsDragging] = useState(false)
  const timelineRef = useRef<HTMLDivElement>(null)

  function ratioToTime(clientX: number, rect: DOMRect): number {
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    return Math.round(ratio * duration * 10) / 10
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const time = ratioToTime(e.clientX, rect)

    if (startTime === null || endTime !== null) {
      // idle 또는 둘 다 설정된 경우: 시작점 리셋
      setStartTime(time)
      setEndTime(null)
      setTitle("")
      onSeek(time)
    } else {
      // 시작점만 설정된 경우: 드래그 시작 → 끝점 설정
      setIsDragging(true)
      const clampedTime = Math.max(startTime, time)
      setEndTime(clampedTime)
      onSeek(clampedTime)
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || startTime === null) return
    const rect = e.currentTarget.getBoundingClientRect()
    const time = ratioToTime(e.clientX, rect)
    const clampedTime = Math.max(startTime, time)
    setEndTime(clampedTime)
    onSeek(clampedTime)
  }

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return
    const rect = e.currentTarget.getBoundingClientRect()
    const time = ratioToTime(e.clientX, rect)
    const clampedTime = Math.max(startTime ?? 0, time)
    setEndTime(clampedTime)
    onSeek(clampedTime)
    setIsDragging(false)
  }

  const handleMouseLeave = () => {
    if (isDragging) setIsDragging(false)
  }

  const handleStartInput = (value: string) => {
    const parsed = fromMMSS(value)
    if (parsed === null || parsed < 0 || parsed > duration) return
    setStartTime(parsed)
    if (endTime !== null && endTime < parsed) setEndTime(parsed)
    onSeek(parsed)
  }

  const handleEndInput = (value: string) => {
    const parsed = fromMMSS(value)
    if (parsed === null || parsed < 0 || parsed > duration) return
    const clamped = Math.max(parsed, startTime ?? 0)
    setEndTime(clamped)
    onSeek(clamped)
  }

  const handleReset = () => {
    setStartTime(null)
    setEndTime(null)
    setTitle("")
    setIsDragging(false)
  }

  const handleSubmit = () => {
    if (startTime === null || endTime === null || !title.trim()) return
    onAdd(startTime, endTime, title.trim())
    setStartTime(null)
    setEndTime(null)
    setTitle("")
  }

  const startRatio = startTime !== null && duration > 0 ? startTime / duration : null
  const endRatio = endTime !== null && duration > 0 ? endTime / duration : null
  const currentRatio = duration > 0 ? currentTime / duration : 0

  return (
    <div className="mt-3 bg-slate-800 border border-slate-700 rounded-lg p-3">
      <p className="text-slate-400 text-xs mb-2">✂ 구간 선택하여 작업 추가</p>

      {/* 커스텀 타임라인 */}
      <div
        ref={timelineRef}
        data-testid="timeline"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        className="relative h-7 bg-slate-900 rounded border border-slate-600 cursor-crosshair mb-2 overflow-hidden select-none"
      >
        {/* 현재 재생 위치 */}
        <div
          className="absolute top-0 w-px h-full bg-slate-400 opacity-50 pointer-events-none"
          style={{ left: `${currentRatio * 100}%` }}
        />
        {/* 선택 구간 강조 */}
        {startRatio !== null && endRatio !== null && (
          <div
            className="absolute top-0 h-full bg-blue-500 opacity-20 pointer-events-none"
            style={{ left: `${startRatio * 100}%`, width: `${(endRatio - startRatio) * 100}%` }}
          />
        )}
        {/* 시작 마커 */}
        {startRatio !== null && (
          <div
            className="absolute top-0 w-0.5 h-full bg-green-500 pointer-events-none"
            style={{ left: `${startRatio * 100}%` }}
          />
        )}
        {/* 끝 마커 */}
        {endRatio !== null && (
          <div
            className="absolute top-0 w-0.5 h-full bg-red-500 pointer-events-none"
            style={{ left: `${endRatio * 100}%` }}
          />
        )}
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none">
          {startTime === null
            ? "클릭=시작점"
            : endTime === null
              ? "드래그 또는 클릭=끝점"
              : "클릭=초기화 후 재설정"}
        </span>
      </div>

      {/* 시간 입력 행 */}
      <div className="flex items-center gap-2 mb-2">
        <span className="bg-green-900 text-green-300 text-xs px-1.5 py-0.5 rounded">S</span>
        <input
          type="text"
          value={startTime !== null ? toMMSS(startTime) : ""}
          onChange={e => handleStartInput(e.target.value)}
          placeholder="--:--"
          className="w-16 bg-slate-900 border border-green-700 rounded px-2 py-1 text-green-300 text-xs text-center"
        />
        <span className="text-slate-500 text-xs">~</span>
        <span className="bg-red-900 text-red-300 text-xs px-1.5 py-0.5 rounded">E</span>
        <input
          type="text"
          value={endTime !== null ? toMMSS(endTime) : ""}
          onChange={e => handleEndInput(e.target.value)}
          placeholder="--:--"
          className="w-16 bg-slate-900 border border-red-700 rounded px-2 py-1 text-red-300 text-xs text-center"
        />
        {startTime !== null && endTime !== null && (
          <>
            <span className="text-slate-400 text-xs">
              ({Math.round(endTime - startTime)}초)
            </span>
            <button
              onClick={() => onPlayRange(startTime, endTime)}
              className="ml-1 bg-emerald-700 hover:bg-emerald-600 text-white text-xs px-2 py-1 rounded flex items-center gap-1"
              title="구간만 재생"
            >
              ▶ 구간 재생
            </button>
          </>
        )}
        <button
          onClick={handleReset}
          className="ml-auto text-slate-500 text-xs hover:text-slate-300"
        >
          초기화
        </button>
      </div>

      {/* 인라인 폼 — 시작·끝 모두 설정됐을 때만 표시 */}
      {startTime !== null && endTime !== null && (
        <div className="bg-slate-900 border border-blue-700 rounded p-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              placeholder="예) 볼트 체결, 도장..."
              className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleSubmit}
              disabled={!title.trim()}
              className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              + 작업으로 추가
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
