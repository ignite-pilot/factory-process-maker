import { useRef, useState } from "react"

interface RangeSelectorProps {
  duration: number
  currentTime: number
  onAdd: (startTime: number, endTime: number, title: string) => void
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

export default function RangeSelector({ duration, currentTime, onAdd }: RangeSelectorProps) {
  const [startTime, setStartTime] = useState<number | null>(null)
  const [endTime, setEndTime] = useState<number | null>(null)
  const [title, setTitle] = useState("")
  const timelineRef = useRef<HTMLDivElement>(null)

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const time = Math.round(ratio * duration * 10) / 10

    if (startTime === null) {
      setStartTime(time)
    } else if (endTime === null) {
      if (time < startTime) {
        setEndTime(startTime)
        setStartTime(time)
      } else {
        setEndTime(time)
      }
    } else {
      // 3번째 클릭: 초기화 후 새 시작점
      setStartTime(time)
      setEndTime(null)
      setTitle("")
    }
  }

  const handleStartInput = (value: string) => {
    const parsed = fromMMSS(value)
    if (parsed === null || parsed < 0 || parsed > duration) return
    setStartTime(parsed)
    if (endTime !== null && endTime < parsed) setEndTime(parsed)
  }

  const handleEndInput = (value: string) => {
    const parsed = fromMMSS(value)
    if (parsed === null || parsed < 0 || parsed > duration) return
    setEndTime(Math.max(parsed, startTime ?? 0))
  }

  const handleReset = () => {
    setStartTime(null)
    setEndTime(null)
    setTitle("")
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
        onClick={handleTimelineClick}
        className="relative h-7 bg-slate-900 rounded border border-slate-600 cursor-crosshair mb-2 overflow-hidden"
      >
        {/* 현재 재생 위치 */}
        <div
          className="absolute top-0 w-px h-full bg-slate-400 opacity-50"
          style={{ left: `${currentRatio * 100}%` }}
        />
        {/* 선택 구간 강조 */}
        {startRatio !== null && endRatio !== null && (
          <div
            className="absolute top-0 h-full bg-blue-500 opacity-20"
            style={{ left: `${startRatio * 100}%`, width: `${(endRatio - startRatio) * 100}%` }}
          />
        )}
        {/* 시작 마커 */}
        {startRatio !== null && (
          <div
            className="absolute top-0 w-0.5 h-full bg-green-500"
            style={{ left: `${startRatio * 100}%` }}
          />
        )}
        {/* 끝 마커 */}
        {endRatio !== null && (
          <div
            className="absolute top-0 w-0.5 h-full bg-red-500"
            style={{ left: `${endRatio * 100}%` }}
          />
        )}
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 text-xs pointer-events-none">
          1클릭=시작 · 2클릭=끝 · 3클릭=초기화
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
          <span className="text-slate-400 text-xs">
            ({Math.round(endTime - startTime)}초)
          </span>
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
