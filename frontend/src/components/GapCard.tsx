interface GapCardProps {
  startTime: number
  endTime: number
  onPlayRange: (startTime: number, endTime: number) => void
  onAdd: (startTime: number, endTime: number) => void
  onAttachPrev: () => void
  onAttachNext: () => void
  onDismiss: () => void
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

export default function GapCard({ startTime, endTime, onPlayRange, onAdd, onAttachPrev, onAttachNext, onDismiss }: GapCardProps) {
  const duration = Math.round(endTime - startTime)

  return (
    <div className="border border-dashed border-gray-300 rounded-lg p-3 bg-gray-50">
      <div className="flex justify-between items-start mb-2">
        <div>
          <p className="text-xs font-medium text-gray-400">미정의 작업</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {formatTime(startTime)} ~ {formatTime(endTime)} ({duration}초)
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="text-xs text-gray-300 hover:text-gray-500 ml-2"
        >
          ✕
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => onPlayRange(startTime, endTime)}
          className="text-xs bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded"
        >
          ▶ 재생
        </button>
        <button
          onClick={() => onAdd(startTime, endTime)}
          className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded"
        >
          + 작업추가
        </button>
        <button
          onClick={onAttachPrev}
          className="text-xs bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200 px-2 py-0.5 rounded"
        >
          ↑ 위 작업 붙이기
        </button>
        <button
          onClick={onAttachNext}
          className="text-xs bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-200 px-2 py-0.5 rounded"
        >
          ↓ 아래 작업 붙이기
        </button>
      </div>
    </div>
  )
}
