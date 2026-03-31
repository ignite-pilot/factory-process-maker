import { useState } from "react"
import type { WorkUnitResponse, WorkUnitUpdateRequest } from "../api/client"

interface WorkUnitItemProps {
  workUnit: WorkUnitResponse
  onUpdate: (id: number, body: WorkUnitUpdateRequest) => void
  onDelete: (id: number) => void
}

export default function WorkUnitItem({ workUnit, onUpdate, onDelete }: WorkUnitItemProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(workUnit.title)
  const [startTime, setStartTime] = useState(workUnit.startTime)
  const [endTime, setEndTime] = useState(workUnit.endTime)
  const [description, setDescription] = useState(workUnit.description ?? "")
  const [equipments, setEquipments] = useState((workUnit.equipments ?? []).join(", "))
  const [materials, setMaterials] = useState((workUnit.materials ?? []).join(", "))

  const handleSave = () => {
    onUpdate(workUnit.id, {
      title,
      startTime,
      endTime,
      description,
      equipments: equipments.split(",").map(s => s.trim()).filter(Boolean),
      materials: materials.split(",").map(s => s.trim()).filter(Boolean),
    })
    setIsEditing(false)
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs text-gray-400">#{workUnit.sequence}</span>
        <div className="flex gap-2">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="text-xs text-blue-600 hover:underline"
          >
            {isEditing ? "취소" : "수정"}
          </button>
          <button
            onClick={() => onDelete(workUnit.id)}
            className="text-xs text-red-500 hover:underline"
          >
            삭제
          </button>
        </div>
      </div>

      {isEditing ? (
        <div className="flex flex-col gap-2">
          <input
            className="border rounded px-2 py-1 text-sm w-full"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="작업명"
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-500">시작(초)</label>
              <input
                type="number"
                className="border rounded px-2 py-1 text-sm w-full"
                value={startTime}
                onChange={e => setStartTime(Number(e.target.value))}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-500">종료(초)</label>
              <input
                type="number"
                className="border rounded px-2 py-1 text-sm w-full"
                value={endTime}
                onChange={e => setEndTime(Number(e.target.value))}
              />
            </div>
          </div>
          <textarea
            className="border rounded px-2 py-1 text-sm w-full"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="작업 설명"
            rows={2}
          />
          <input
            className="border rounded px-2 py-1 text-sm w-full"
            value={equipments}
            onChange={e => setEquipments(e.target.value)}
            placeholder="설비 (쉼표로 구분)"
          />
          <input
            className="border rounded px-2 py-1 text-sm w-full"
            value={materials}
            onChange={e => setMaterials(e.target.value)}
            placeholder="자재 (쉼표로 구분)"
          />
          <button
            onClick={handleSave}
            className="bg-blue-600 text-white text-sm py-1 rounded hover:bg-blue-700"
          >
            저장
          </button>
        </div>
      ) : (
        <div>
          <p className="font-semibold">{workUnit.title}</p>
          <p className="text-xs text-gray-500 mt-1">
            {formatTime(workUnit.startTime)} ~ {formatTime(workUnit.endTime)} ({workUnit.duration.toFixed(1)}초)
          </p>
          {workUnit.description && (
            <p className="text-sm text-gray-600 mt-1">{workUnit.description}</p>
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
      )}
    </div>
  )
}
