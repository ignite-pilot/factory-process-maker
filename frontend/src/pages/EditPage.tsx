import { useParams } from "react-router-dom"
import VideoPlayer from "../components/VideoPlayer"
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
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-xl font-bold mb-4 truncate">{video.fileName}</h1>
      <div className="mb-6">
        <VideoPlayer filePath={video.filePath} />
      </div>
      <WorkUnitList
        workUnits={workUnits ?? []}
        onUpdate={(id, body) => updateWorkUnit.mutate({ id, body })}
        onDelete={(id) => deleteWorkUnit.mutate(id)}
        onAdd={handleAdd}
      />
    </div>
  )
}
