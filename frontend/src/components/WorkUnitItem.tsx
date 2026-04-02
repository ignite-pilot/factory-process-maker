import type { WorkUnitResponse } from "../api/client"

interface WorkUnitItemProps {
  workUnit: WorkUnitResponse
  isSelected: boolean
  onSelect: (id: number) => void
  onDelete: (id: number) => void
  onPlayRange: (startTime: number, endTime: number) => void
}

export default function WorkUnitItem({ workUnit, isSelected, onSelect, onDelete, onPlayRange }: WorkUnitItemProps) {
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  return (
    <div
      className={`border rounded-lg p-4 bg-white shadow-sm cursor-pointer transition-colors ${
        isSelected ? "border-blue-500 bg-blue-50" : "hover:border-gray-300"
      }`}
      onClick={() => onSelect(workUnit.id)}
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs text-gray-400">#{workUnit.sequence}</span>
        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => onPlayRange(workUnit.startTime, workUnit.endTime)}
            className="text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-2 py-0.5 rounded"
          >
            ▶ 재생
          </button>
          <button
            onClick={() => onDelete(workUnit.id)}
            className="text-xs text-red-500 hover:underline"
          >
            삭제
          </button>
        </div>
      </div>
      <div>
        <p className="font-semibold">{workUnit.title}</p>
        <p className="text-xs text-gray-500 mt-1">
          {formatTime(workUnit.startTime)} ~ {formatTime(workUnit.endTime)} ({workUnit.duration.toFixed(1)}초)
        </p>
        {workUnit.description && (
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{workUnit.description}</p>
        )}
        {workUnit.equipments && workUnit.equipments.length > 0 && (
          <p className="text-xs text-gray-500 mt-1">설비: {workUnit.equipments.join(", ")}</p>
        )}
        {workUnit.materials && workUnit.materials.length > 0 && (
          <p className="text-xs text-gray-500">자재: {workUnit.materials.join(", ")}</p>
        )}
        {workUnit.isManuallyEdited && (
          <span className="text-xs text-blue-400">수동 편집됨</span>
        )}
      </div>
    </div>
  )
}
