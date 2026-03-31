import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import type { WorkUnitCreateRequest, WorkUnitUpdateRequest } from "../api/client"
import { videosApi, workUnitsApi } from "../api/client"

export function useWorkUnits(videoId: number) {
  return useQuery({
    queryKey: ["work-units", videoId],
    queryFn: () => videosApi.listWorkUnits(videoId),
  })
}

export function useUpdateWorkUnit(videoId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: WorkUnitUpdateRequest }) =>
      workUnitsApi.update(id, body),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["work-units", videoId] }),
  })
}

export function useDeleteWorkUnit(videoId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => workUnitsApi.delete(id),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["work-units", videoId] }),
  })
}

export function useCreateWorkUnit(videoId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: WorkUnitCreateRequest) =>
      videosApi.createWorkUnit(videoId, body),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["work-units", videoId] }),
  })
}

export function useReorderWorkUnits(videoId: number) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (orderedIds: number[]) => workUnitsApi.reorder(orderedIds),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["work-units", videoId] }),
  })
}
