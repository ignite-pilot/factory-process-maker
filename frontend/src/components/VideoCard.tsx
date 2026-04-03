import { useNavigate } from "react-router-dom"
import type { VideoResponse } from "../api/client"
import { useDeleteVideo, useStartAnalysis } from "../hooks/useVideos"

const statusLabel: Record<string, string> = {
  pending: "대기중",
  analyzing: "분석중",
  done: "완료",
  failed: "실패",
}

const statusColor: Record<string, string> = {
  pending: "bg-gray-100 text-gray-600",
  analyzing: "bg-yellow-100 text-yellow-700",
  done: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
}

export default function VideoCard({ video }: { video: VideoResponse }) {
  const navigate = useNavigate()
  const startAnalysis = useStartAnalysis()
  const deleteVideo = useDeleteVideo()

  const handleAnalyze = () => {
    startAnalysis.mutate(video.id, {
      onSuccess: () => navigate(`/videos/${video.id}/analyzing`),
    })
  }

  const handleEdit = () => navigate(`/videos/${video.id}/edit`)

  const handleDelete = () => {
    if (confirm("이 동영상을 삭제하시겠습니까?")) {
      deleteVideo.mutate(video.id)
    }
  }

  return (
    <div className="border rounded-lg p-4 flex flex-col gap-2 bg-white shadow-sm">
      <div className="flex justify-between items-center">
        <div className="flex flex-col min-w-0">
          <span className="font-medium truncate">{video.fileName}</span>
          {video.processName && (
            <p className="text-xs text-gray-500 truncate">{video.processName}</p>
          )}
          {video.description && (
            <p className="text-xs text-gray-400 truncate">{video.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs px-2 py-1 rounded-full ${statusColor[video.status]}`}>
            {statusLabel[video.status]}
          </span>
          <button
            onClick={handleDelete}
            disabled={deleteVideo.isPending}
            className="text-gray-400 hover:text-red-500 disabled:opacity-50"
            title="삭제"
          >
            🗑
          </button>
        </div>
      </div>
      {video.duration && (
        <span className="text-sm text-gray-500">{video.duration.toFixed(1)}초</span>
      )}
      <div className="flex gap-2 mt-2">
        {video.status === "pending" && (
          <button
            onClick={handleAnalyze}
            disabled={startAnalysis.isPending}
            className="flex-1 bg-blue-600 text-white text-sm py-1 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            분석 시작
          </button>
        )}
        {video.status === "done" && (
          <button
            onClick={handleEdit}
            className="flex-1 bg-green-600 text-white text-sm py-1 rounded hover:bg-green-700"
          >
            편집
          </button>
        )}
        {video.status === "analyzing" && (
          <button
            onClick={() => navigate(`/videos/${video.id}/analyzing`)}
            className="flex-1 bg-yellow-500 text-white text-sm py-1 rounded hover:bg-yellow-600"
          >
            진행 확인
          </button>
        )}
      </div>
    </div>
  )
}
