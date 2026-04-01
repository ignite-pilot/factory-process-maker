import { useRef, useState } from "react"
import { useParams } from "react-router-dom"
import VideoPlayer from "../components/VideoPlayer"
import type { VideoPlayerHandle } from "../components/VideoPlayer"
import WorkUnitList from "../components/WorkUnitList"
import { useVideoDetail } from "../hooks/useVideos"
import {
  useCreateWorkUnit,
  useDeleteWorkUnit,
  useUpdateWorkUnit,
  useWorkUnits,
} from "../hooks/useWorkUnits"

export default function EditPage() {
  const { id } = useParams<{ id: string }>()
  const videoId = Number(id)

  const { data: video } = useVideoDetail(videoId)
  const { data: workUnits } = useWorkUnits(videoId)
  const updateWorkUnit = useUpdateWorkUnit(videoId)
  const deleteWorkUnit = useDeleteWorkUnit(videoId)
  const createWorkUnit = useCreateWorkUnit(videoId)

  const videoPlayerRef = useRef<VideoPlayerHandle>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const handleSelect = (id: number) => {
    setSelectedId(id)
    const workUnit = workUnits?.find(wu => wu.id === id)
    if (workUnit) {
      videoPlayerRef.current?.seekTo(workUnit.startTime)
    }
  }

  const handleAdd = () => {
    const lastUnit = workUnits?.[workUnits.length - 1]
    createWorkUnit.mutate({
      sequence: (lastUnit?.sequence ?? 0) + 1,
      title: "새 작업",
      startTime: lastUnit?.endTime ?? 0,
      endTime: (lastUnit?.endTime ?? 0) + 10,
    })
  }

  if (!video) return <p className="p-6 text-gray-500">불러오는 중...</p>

  return (
    <div className="max-w-6xl mx-auto p-6 h-screen flex flex-col">
      <h1 className="text-xl font-bold mb-4 truncate">{video.fileName}</h1>
      <div className="flex gap-6 flex-1 min-h-0">
        <div className="w-1/2 sticky top-6 self-start">
          <VideoPlayer ref={videoPlayerRef} filePath={video.filePath} />
        </div>
        <div className="w-1/2 overflow-y-auto">
          <WorkUnitList
            workUnits={workUnits ?? []}
            selectedId={selectedId}
            onSelect={handleSelect}
            onUpdate={(id, body) => updateWorkUnit.mutate({ id, body })}
            onDelete={(id) => deleteWorkUnit.mutate(id)}
            onAdd={handleAdd}
          />
        </div>
      </div>
    </div>
  )
}
