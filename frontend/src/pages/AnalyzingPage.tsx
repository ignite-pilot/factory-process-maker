import { useNavigate, useParams } from "react-router-dom"
import { useAnalysisPolling } from "../hooks/useAnalysis"

const STEPS = [
  { key: "extracting", label: "프레임 추출 중" },
  { key: "analyzing", label: "AI 분석 중" },
  { key: "building", label: "작업 단위 생성 중" },
] as const

function getStepIndex(currentStep: string | null | undefined): number {
  if (!currentStep) return -1
  return STEPS.findIndex(s => s.key === currentStep)
}

function formatSeconds(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}초`
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}분 ${s}초`
}

export default function AnalyzingPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const videoId = Number(id)
  const status = useAnalysisPolling(videoId)

  const currentStepIndex = getStepIndex(status?.currentStep)
  const totalFrames = status?.totalFrames ?? 0
  const processedFrames = status?.processedFrames ?? 0
  const percent = totalFrames > 0 ? Math.round((processedFrames / totalFrames) * 100) : 0

  return (
    <div className="max-w-xl mx-auto p-6">
      <button
        onClick={() => navigate("/")}
        className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1 mb-16"
      >
        ← 목록으로
      </button>
      <div className="text-center">
      <div className="text-4xl mb-6">⚙️</div>
      <h2 className="text-xl font-semibold mb-6">공정 분석 중</h2>

      {(!status || status.status === "queued") && (
        <p className="text-gray-500 mb-4">분석 대기 중...</p>
      )}

      {status?.status === "failed" && (
        <>
          <p className="text-gray-500 mb-2">분석에 실패했습니다.</p>
          <p className="text-red-500 mt-4">오류가 발생했습니다. 다시 시도해주세요.</p>
        </>
      )}

      {(status?.status === "running" || status?.status === "completed") && (
        <div className="text-left space-y-2">
          {STEPS.map((step, index) => {
            const isDone = currentStepIndex > index
            const isCurrent = currentStepIndex === index
            return (
              <div
                key={step.key}
                className={`flex flex-col gap-2 p-3 rounded-lg ${isCurrent ? "bg-blue-50" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`text-lg w-5 text-center ${isDone ? "text-green-500" : isCurrent ? "text-blue-500" : "text-gray-300"}`}>
                    {isDone ? "✓" : isCurrent ? "→" : String(index + 1)}
                  </span>
                  <span className={`font-medium ${isDone ? "text-gray-400 line-through" : isCurrent ? "text-blue-700" : "text-gray-400"}`}>
                    {step.label}
                  </span>
                </div>

                {isCurrent && step.key === "analyzing" && totalFrames > 0 && (
                  <div className="ml-8 space-y-1">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>{processedFrames} / {totalFrames} 프레임 ({percent}%)</span>
                      {status?.estimatedSecondsLeft != null && status.estimatedSecondsLeft > 0 && (
                        <span>예상 남은 시간: {formatSeconds(status.estimatedSecondsLeft)}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      </div>
    </div>
  )
}
