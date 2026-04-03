import { useState } from "react"
import type { WorkUnitResponse } from "../api/client"
import WorkUnitItem from "./WorkUnitItem"
import GapCard from "./GapCard"

const GAP_THRESHOLD_SECONDS = 1

interface WorkUnitListProps {
  workUnits: WorkUnitResponse[]
  selectedId: number | null
  onSelect: (id: number) => void
  onDelete: (id: number) => void
  onAdd: () => void
  onAddGap: (startTime: number, endTime: number) => void
  onPlayRange: (startTime: number, endTime: number) => void
}

export default function WorkUnitList({ workUnits, selectedId, onSelect, onDelete, onAdd, onAddGap, onPlayRange }: WorkUnitListProps) {
  const [dismissedGaps, setDismissedGaps] = useState<Set<string>>(new Set())

  const dismissGap = (key: string) => {
    setDismissedGaps(prev => new Set([...prev, key]))
  }

  const sorted = [...workUnits].sort((a, b) => a.startTime - b.startTime)

  const items: React.ReactNode[] = []
  sorted.forEach((wu, i) => {
    items.push(
      <WorkUnitItem
        key={wu.id}
        workUnit={wu}
        isSelected={wu.id === selectedId}
        onSelect={onSelect}
        onDelete={onDelete}
        onPlayRange={onPlayRange}
      />
    )

    if (i < sorted.length - 1) {
      const next = sorted[i + 1]
      const gapStart = wu.endTime
      const gapEnd = next.startTime
      const gapKey = `${gapStart}-${gapEnd}`
      if (gapEnd - gapStart > GAP_THRESHOLD_SECONDS && !dismissedGaps.has(gapKey)) {
        items.push(
          <GapCard
            key={gapKey}
            startTime={gapStart}
            endTime={gapEnd}
            onPlayRange={onPlayRange}
            onAdd={onAddGap}
            onDismiss={() => dismissGap(gapKey)}
          />
        )
      }
    }
  })

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
      {items}
    </div>
  )
}
