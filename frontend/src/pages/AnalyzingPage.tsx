import { useParams } from "react-router-dom"
import { useAnalysisPolling } from "../hooks/useAnalysis"

export default function AnalyzingPage() {
  const { id } = useParams<{ id: string }>()
  const videoId = Number(id)
  const status = useAnalysisPolling(videoId)

  const statusMessage: Record<string, string> = {
    queued: "분석 대기 중...",
    running: "AI가 영상을 분석하고 있습니다...",
    completed: "분석 완료! 편집 페이지로 이동합니다.",
    failed: "분석에 실패했습니다.",
  }

  return (
    <div className="max-w-xl mx-auto p-6 mt-20 text-center">
      <div className="text-4xl mb-6">⚙️</div>
      <h2 className="text-xl font-semibold mb-2">공정 분석 중</h2>
      <p className="text-gray-500">
        {status ? statusMessage[status.status] : "상태를 불러오는 중..."}
      </p>
      {status?.status === "failed" && (
        <p className="text-red-500 mt-4">오류가 발생했습니다. 다시 시도해주세요.</p>
      )}
    </div>
  )
}
