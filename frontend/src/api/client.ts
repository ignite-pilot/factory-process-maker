import axios from "axios"

export interface AnalysisJobResponse {
  id: number
  videoId: number
  status: "queued" | "running" | "completed" | "failed"
  startedAt: string | null
  completedAt: string | null
  currentStep: "extracting" | "analyzing" | "building" | null
  totalFrames: number | null
  processedFrames: number | null
  estimatedSecondsLeft: number | null
}

export const apiClient = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"}/api`,
})

export interface VideoResponse {
  id: number
  fileName: string
  filePath: string
  duration: number | null
  status: "pending" | "analyzing" | "done" | "failed"
  createdAt: string
}

export interface WorkUnitFrameResponse {
  id: number
  workUnitId: number
  frameTime: number
  imagePath: string
}

export interface WorkUnitResponse {
  id: number
  videoId: number
  sequence: number
  title: string
  startTime: number
  endTime: number
  duration: number
  description: string | null
  equipments: string[] | null
  materials: string[] | null
  startFrame: number | null
  endFrame: number | null
  isManuallyEdited: boolean
  createdAt: string
  updatedAt: string
  frames: WorkUnitFrameResponse[]
}

export interface WorkUnitUpdateRequest {
  title?: string
  startTime?: number
  endTime?: number
  description?: string
  equipments?: string[]
  materials?: string[]
}

export interface WorkUnitCreateRequest {
  sequence: number
  title: string
  startTime: number
  endTime: number
  description?: string
  equipments?: string[]
  materials?: string[]
}

export const videosApi = {
  list: () => apiClient.get<VideoResponse[]>("/videos").then(r => r.data),
  get: (id: number) => apiClient.get<VideoResponse>(`/videos/${id}`).then(r => r.data),
  upload: (file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    return apiClient.post<VideoResponse>("/videos/upload", formData).then(r => r.data)
  },
  startAnalysis: (id: number) =>
    apiClient.post(`/videos/${id}/analyze`).then(r => r.data),
  getStatus: (id: number) =>
    apiClient.get<AnalysisJobResponse>(`/videos/${id}/status`).then(r => r.data),
  listWorkUnits: (id: number) =>
    apiClient.get<WorkUnitResponse[]>(`/videos/${id}/work-units`).then(r => r.data),
  createWorkUnit: (id: number, body: WorkUnitCreateRequest) =>
    apiClient.post<WorkUnitResponse>(`/videos/${id}/work-units`, body).then(r => r.data),
}

export const workUnitsApi = {
  update: (id: number, body: WorkUnitUpdateRequest) =>
    apiClient.put<WorkUnitResponse>(`/work-units/${id}`, body).then(r => r.data),
  delete: (id: number) =>
    apiClient.delete(`/work-units/${id}`).then(r => r.data),
  reorder: (orderedIds: number[]) =>
    apiClient.post("/work-units/reorder", { orderedIds }).then(r => r.data),
}
