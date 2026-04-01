import { forwardRef, useImperativeHandle, useRef } from "react"

interface VideoPlayerProps {
  filePath: string
  onTimeUpdate?: (currentTime: number) => void
}

export interface VideoPlayerHandle {
  seekTo: (time: number) => void
}

const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  ({ filePath, onTimeUpdate }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null)

    useImperativeHandle(ref, () => ({
      seekTo: (time: number) => {
        if (videoRef.current) {
          videoRef.current.currentTime = time
          videoRef.current.play()
        }
      },
    }))

    return (
      <div className="w-full bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          src={`${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"}/${filePath}`}
          controls
          className="w-full"
          onTimeUpdate={() => onTimeUpdate?.(videoRef.current?.currentTime ?? 0)}
        />
      </div>
    )
  }
)

VideoPlayer.displayName = "VideoPlayer"

export default VideoPlayer
