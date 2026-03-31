import { useRef } from "react"
import VideoCard from "../components/VideoCard"
import { useUploadVideo, useVideoList } from "../hooks/useVideos"

export default function VideoListPage() {
  const { data: videos, isLoading } = useVideoList()
  const uploadVideo = useUploadVideo()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) uploadVideo.mutate(file)
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">공정 동영상 분석</h1>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadVideo.isPending}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {uploadVideo.isPending ? "업로드 중..." : "동영상 업로드"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp4,.mov,.avi"
          className="hidden"
          onChange={handleFileChange}
        />
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
    </div>
  )
}
