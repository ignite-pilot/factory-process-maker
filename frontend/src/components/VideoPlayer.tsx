import { useRef } from "react"

interface VideoPlayerProps {
  filePath: string
  onTimeUpdate?: (currentTime: number) => void
}

export default function VideoPlayer({ filePath, onTimeUpdate }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  return (
    <div className="w-full bg-black rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        src={`http://localhost:8000/${filePath}`}
        controls
        className="w-full"
        onTimeUpdate={() => onTimeUpdate?.(videoRef.current?.currentTime ?? 0)}
      />
    </div>
  )
}
