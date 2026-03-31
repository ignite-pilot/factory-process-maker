import { useEffect } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import { videosApi } from "../api/client"

export function useAnalysisPolling(videoId: number) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const { data } = useQuery({
    queryKey: ["analysis-status", videoId],
    queryFn: () => videosApi.getStatus(videoId),
    refetchInterval: 3000,
  })

  useEffect(() => {
    if (data?.status === "completed") {
      queryClient.invalidateQueries({ queryKey: ["videos", videoId] })
      navigate(`/videos/${videoId}/edit`)
    }
  }, [data?.status, videoId, navigate, queryClient])

  return data
}
