import { useState } from "react"
import VideoCard from "../components/VideoCard"
import UploadModal from "../components/UploadModal"
import { useUploadVideo, useVideoList } from "../hooks/useVideos"

export default function VideoListPage() {
  const { data: videos, isLoading } = useVideoList()
  const uploadVideo = useUploadVideo()
  const [showModal, setShowModal] = useState(false)

  const handleUpload = (file: File, processName: string, description: string) => {
    uploadVideo.mutate(
      { file, processName, description: description || undefined },
      { onSuccess: () => setShowModal(false) },
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">공정 동영상 분석</h1>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          동영상 업로드
        </button>
      </div>

      {isLoading && <p className="text-gray-500">불러오는 중...</p>}

      {videos?.length === 0 && (
        <p className="text-center text-gray-400 mt-20">
          업로드된 동영상이 없습니다. 동영상을 업로드하세요.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {videos?.map(video => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>

      {showModal && (
        <UploadModal
          onClose={() => setShowModal(false)}
          onUpload={handleUpload}
          isPending={uploadVideo.isPending}
        />
      )}
    </div>
  )
}
