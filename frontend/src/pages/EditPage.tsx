import { useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import VideoPlayer from "../components/VideoPlayer"
import type { VideoPlayerHandle } from "../components/VideoPlayer"
import WorkUnitList from "../components/WorkUnitList"
import WorkUnitEditor from "../components/WorkUnitEditor"
import WorkUnitCreator from "../components/WorkUnitCreator"
import RangeSelector from "../components/RangeSelector"
import { useVideoDetail } from "../hooks/useVideos"
import {
  useCreateWorkUnit,
  useDeleteWorkUnit,
  useUpdateWorkUnit,
  useWorkUnits,
} from "../hooks/useWorkUnits"

type LeftPanelMode = "range-selector" | "creator" | "editor"

export default function EditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const videoId = Number(id)

  const { data: video } = useVideoDetail(videoId)
  const { data: workUnits } = useWorkUnits(videoId)
  const updateWorkUnit = useUpdateWorkUnit(videoId)
  const deleteWorkUnit = useDeleteWorkUnit(videoId)
  const createWorkUnit = useCreateWorkUnit(videoId)

  const videoPlayerRef = useRef<VideoPlayerHandle>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [panelMode, setPanelMode] = useState<LeftPanelMode>("range-selector")
  const [currentTime, setCurrentTime] = useState(0)
  const playRangeEndRef = useRef<number | null>(null)

  const selectedWorkUnit = workUnits?.find(wu => wu.id === selectedId) ?? null

  const handleSelect = (id: number) => {
    const workUnit = workUnits?.find(wu => wu.id === id)
    if (!workUnit) return
    setSelectedId(id)
    setPanelMode("editor")
    handlePlayRange(workUnit.startTime, workUnit.endTime)
  }

  const handleAdd = () => {
    playRangeEndRef.current = null
    videoPlayerRef.current?.pause()
    const last = workUnits?.[workUnits.length - 1]
    videoPlayerRef.current?.seekOnly(last?.endTime ?? 0)
    setSelectedId(null)
    setPanelMode("creator")
  }

  const handleRangeAdd = (startTime: number, endTime: number, title: string) => {
    const maxSeq = workUnits?.reduce((max, wu) => Math.max(max, wu.sequence), 0) ?? 0
    createWorkUnit.mutate({ sequence: maxSeq + 1, title, startTime, endTime })
  }

  const handleSeek = (time: number) => {
    videoPlayerRef.current?.seekOnly(time)
  }

  const handlePlayRange = (startTime: number, endTime: number) => {
    playRangeEndRef.current = endTime
    videoPlayerRef.current?.seekTo(startTime)
  }

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time)
    if (playRangeEndRef.current !== null && time >= playRangeEndRef.current) {
      videoPlayerRef.current?.pause()
      playRangeEndRef.current = null
    }
  }

  const handleEditSave = (id: number, body: Parameters<typeof updateWorkUnit.mutate>[0]["body"]) => {
    updateWorkUnit.mutate({ id, body })
    setSelectedId(null)
    setPanelMode("range-selector")
  }

  const handleEditCancel = () => {
    setSelectedId(null)
    setPanelMode("range-selector")
  }

  const handleCreatorCreate = (body: Parameters<typeof createWorkUnit.mutate>[0]) => {
    createWorkUnit.mutate(body)
    setPanelMode("range-selector")
  }

  const handleCreatorCancel = () => {
    setPanelMode("range-selector")
  }

  const lastUnit = workUnits?.[workUnits.length - 1]
  const nextSequence = (lastUnit?.sequence ?? 0) + 1
  const defaultStartTime = lastUnit?.endTime ?? 0
  const defaultEndTime = defaultStartTime + 10

  if (!video) return <p className="p-6 text-gray-500">불러오는 중...</p>

  return (
    <div className="max-w-6xl mx-auto p-6 h-screen flex flex-col">
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => navigate("/")}
          className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1 shrink-0"
        >
          ← 목록으로
        </button>
        <h1 className="text-xl font-bold truncate">{video.fileName}</h1>
      </div>
      <div className="flex gap-6 flex-1 min-h-0">
        <div className="w-1/2 sticky top-6 self-start">
          <VideoPlayer
            ref={videoPlayerRef}
            filePath={video.filePath}
            onTimeUpdate={handleTimeUpdate}
          />
          {panelMode === "editor" && selectedWorkUnit ? (
            <WorkUnitEditor
              key={selectedWorkUnit.id}
              workUnit={selectedWorkUnit}
              duration={video.duration ?? 0}
              currentTime={currentTime}
              onSeek={handleSeek}
              onPlayRange={handlePlayRange}
              onSave={handleEditSave}
              onCancel={handleEditCancel}
            />
          ) : panelMode === "creator" ? (
            <WorkUnitCreator
              nextSequence={nextSequence}
              defaultStartTime={defaultStartTime}
              defaultEndTime={defaultEndTime}
              duration={video.duration ?? 0}
              currentTime={currentTime}
              onSeek={handleSeek}
              onPlayRange={handlePlayRange}
              onCreate={handleCreatorCreate}
              onCancel={handleCreatorCancel}
            />
          ) : (
            <RangeSelector
              duration={video.duration ?? 0}
              currentTime={currentTime}
              onAdd={handleRangeAdd}
              onSeek={handleSeek}
              onPlayRange={handlePlayRange}
            />
          )}
        </div>
        <div className="w-1/2 overflow-y-auto">
          <WorkUnitList
            workUnits={workUnits ?? []}
            selectedId={selectedId}
            onSelect={handleSelect}
            onDelete={(id) => deleteWorkUnit.mutate(id)}
            onAdd={handleAdd}
            onPlayRange={handlePlayRange}
          />
        </div>
      </div>
    </div>
  )
}
