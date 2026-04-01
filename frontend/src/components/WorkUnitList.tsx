import type { WorkUnitResponse, WorkUnitUpdateRequest } from "../api/client"
import WorkUnitItem from "./WorkUnitItem"

interface WorkUnitListProps {
  workUnits: WorkUnitResponse[]
  selectedId: number | null
  onSelect: (id: number) => void
  onUpdate: (id: number, body: WorkUnitUpdateRequest) => void
  onDelete: (id: number) => void
  onAdd: () => void
}

export default function WorkUnitList({ workUnits, selectedId, onSelect, onUpdate, onDelete, onAdd }: WorkUnitListProps) {
  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex justify-between items-center">
        <h2 className="font-semibold text-lg">작업 단위 목록</h2>
        <button
          onClick={onAdd}
          className="text-sm bg-gray-100 px-3 py-1 rounded hover:bg-gray-200"
        >
          + 작업 추가
        </button>
      </div>
      {workUnits.length === 0 && (
        <p className="text-gray-400 text-sm text-center py-6">작업 단위가 없습니다.</p>
      )}
      {workUnits.map(wu => (
        <WorkUnitItem
          key={wu.id}
          workUnit={wu}
          isSelected={wu.id === selectedId}
          onSelect={onSelect}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}
