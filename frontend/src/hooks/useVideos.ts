import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { videosApi } from "../api/client"

export function useVideoList() {
  return useQuery({
    queryKey: ["videos"],
    queryFn: videosApi.list,
  })
}

export function useVideoDetail(id: number) {
  return useQuery({
    queryKey: ["videos", id],
    queryFn: () => videosApi.get(id),
  })
}

export function useUploadVideo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => videosApi.upload(file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["videos"] }),
  })
}

export function useStartAnalysis() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (videoId: number) => videosApi.startAnalysis(videoId),
    onSuccess: (_data, videoId) =>
      queryClient.invalidateQueries({ queryKey: ["videos", videoId] }),
  })
}

export function useDeleteVideo() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (videoId: number) => videosApi.delete(videoId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["videos"] }),
  })
}
