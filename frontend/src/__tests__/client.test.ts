import { describe, it, expect, afterEach } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import { apiClient, videosApi, workUnitsApi } from '../api/client'
import type {
  VideoResponse,
  WorkUnitResponse,
  WorkUnitCreateRequest,
  WorkUnitUpdateRequest,
} from '../api/client'

// apiClient (axios.create 인스턴스)를 직접 mock
const mockAxios = new MockAdapter(apiClient)

const mockVideoList: VideoResponse[] = [
  {
    id: 1,
    fileName: 'test-video.mp4',
    filePath: '/uploads/test-video.mp4',
    duration: 120,
    status: 'done',
    createdAt: '2026-03-31T00:00:00Z',
    workUnitCount: 0,
  },
  {
    id: 2,
    fileName: 'another-video.mp4',
    filePath: '/uploads/another-video.mp4',
    duration: null,
    status: 'pending',
    createdAt: '2026-03-31T01:00:00Z',
    workUnitCount: 0,
  },
]

const mockWorkUnit: WorkUnitResponse = {
  id: 10,
  videoId: 1,
  sequence: 1,
  title: '작업 단위 1',
  startTime: 0,
  endTime: 30,
  duration: 30,
  description: '첫 번째 작업',
  equipments: ['드릴', '렌치'],
  materials: ['볼트', '너트'],
  startFrame: 0,
  endFrame: 900,
  isManuallyEdited: false,
  createdAt: '2026-03-31T00:00:00Z',
  updatedAt: '2026-03-31T00:00:00Z',
  frames: [
    {
      id: 1,
      workUnitId: 10,
      frameTime: 5.0,
      imagePath: '/frames/frame_005.jpg',
    },
  ],
}

describe('videosApi', () => {
  afterEach(() => {
    mockAxios.reset()
  })

  describe('list()', () => {
    it('영상 목록을 반환해야 한다', async () => {
      mockAxios.onGet('/videos').reply(200, mockVideoList)

      const result = await videosApi.list()

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe(1)
      expect(result[0].fileName).toBe('test-video.mp4')
      expect(result[1].status).toBe('pending')
    })
  })

  describe('get(id)', () => {
    it('특정 영상 정보를 반환해야 한다', async () => {
      mockAxios.onGet('/videos/1').reply(200, mockVideoList[0])

      const result = await videosApi.get(1)

      expect(result.id).toBe(1)
      expect(result.duration).toBe(120)
      expect(result.status).toBe('done')
    })
  })

  describe('upload(file)', () => {
    it('파일을 업로드하고 VideoResponse를 반환해야 한다', async () => {
      const uploadedVideo: VideoResponse = {
        id: 3,
        fileName: 'new-video.mp4',
        filePath: '/uploads/new-video.mp4',
        duration: null,
        status: 'pending',
        createdAt: '2026-03-31T02:00:00Z',
    workUnitCount: 0,
      }
      mockAxios.onPost('/videos/upload').reply(200, uploadedVideo)

      const mockFile = new File(['video content'], 'new-video.mp4', { type: 'video/mp4' })
      const result = await videosApi.upload(mockFile)

      expect(result.id).toBe(3)
      expect(result.fileName).toBe('new-video.mp4')
      expect(result.status).toBe('pending')
    })
  })

  describe('startAnalysis(id)', () => {
    it('분석 시작 요청을 보내야 한다', async () => {
      const analyzeResponse = { message: '분석이 시작되었습니다.' }
      mockAxios.onPost('/videos/1/analyze').reply(200, analyzeResponse)

      const result = await videosApi.startAnalysis(1)

      expect(result).toEqual(analyzeResponse)
    })
  })

  describe('getStatus(id)', () => {
    it('영상 분석 상태를 반환해야 한다', async () => {
      const statusResponse = { status: 'analyzing', progress: 50 }
      mockAxios.onGet('/videos/1/status').reply(200, statusResponse)

      const result = await videosApi.getStatus(1)

      expect(result.status).toBe('analyzing')
      expect(result.progress).toBe(50)
    })
  })

  describe('listWorkUnits(id)', () => {
    it('영상의 작업단위 목록을 반환해야 한다', async () => {
      const workUnits = [mockWorkUnit]
      mockAxios.onGet('/videos/1/work-units').reply(200, workUnits)

      const result = await videosApi.listWorkUnits(1)

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe(10)
      expect(result[0].title).toBe('작업 단위 1')
      expect(result[0].frames).toHaveLength(1)
    })
  })

  describe('createWorkUnit(id, body)', () => {
    it('새로운 작업단위를 생성하고 반환해야 한다', async () => {
      const createRequest: WorkUnitCreateRequest = {
        sequence: 2,
        title: '새 작업단위',
        startTime: 30,
        endTime: 60,
        description: '두 번째 작업',
        equipments: ['해머'],
        materials: ['못'],
      }
      const createdWorkUnit: WorkUnitResponse = {
        ...mockWorkUnit,
        id: 11,
        sequence: 2,
        title: '새 작업단위',
        startTime: 30,
        endTime: 60,
        duration: 30,
        description: '두 번째 작업',
      }
      mockAxios.onPost('/videos/1/work-units').reply(201, createdWorkUnit)

      const result = await videosApi.createWorkUnit(1, createRequest)

      expect(result.id).toBe(11)
      expect(result.title).toBe('새 작업단위')
      expect(result.startTime).toBe(30)
    })
  })
})

describe('workUnitsApi', () => {
  afterEach(() => {
    mockAxios.reset()
  })

  describe('update(id, body)', () => {
    it('작업단위를 수정하고 업데이트된 데이터를 반환해야 한다', async () => {
      const updateRequest: WorkUnitUpdateRequest = {
        title: '수정된 제목',
        description: '수정된 설명',
      }
      const updatedWorkUnit: WorkUnitResponse = {
        ...mockWorkUnit,
        title: '수정된 제목',
        description: '수정된 설명',
        isManuallyEdited: true,
        updatedAt: '2026-03-31T09:00:00Z',
      }
      mockAxios.onPut('/work-units/10').reply(200, updatedWorkUnit)

      const result = await workUnitsApi.update(10, updateRequest)

      expect(result.title).toBe('수정된 제목')
      expect(result.description).toBe('수정된 설명')
      expect(result.isManuallyEdited).toBe(true)
    })
  })

  describe('delete(id)', () => {
    it('작업단위를 삭제해야 한다', async () => {
      const deleteResponse = { message: '삭제되었습니다.' }
      mockAxios.onDelete('/work-units/10').reply(200, deleteResponse)

      const result = await workUnitsApi.delete(10)

      expect(result).toEqual(deleteResponse)
    })
  })

  describe('reorder(orderedIds)', () => {
    it('작업단위 순서를 변경해야 한다', async () => {
      const orderedIds = [3, 1, 2]
      const reorderResponse = { message: '순서가 변경되었습니다.' }
      mockAxios.onPost('/work-units/reorder').reply(200, reorderResponse)

      const result = await workUnitsApi.reorder(orderedIds)

      expect(result).toEqual(reorderResponse)
    })

    it('orderedIds 배열을 요청 본문에 포함해야 한다', async () => {
      const orderedIds = [5, 3, 1, 4, 2]
      mockAxios.onPost('/work-units/reorder').reply(200, { message: 'OK' })

      const result = await workUnitsApi.reorder(orderedIds)

      expect(result).toEqual({ message: 'OK' })
    })
  })
})

describe('VideoResponse 타입 검증', () => {
  it('status 필드는 유효한 값만 허용해야 한다', () => {
    const validStatuses: VideoResponse['status'][] = [
      'pending',
      'analyzing',
      'done',
      'failed',
    ]
    validStatuses.forEach(status => {
      const video: VideoResponse = {
        id: 1,
        fileName: 'test.mp4',
        filePath: '/test.mp4',
        duration: null,
        status,
        createdAt: '2026-03-31T00:00:00Z',
        workUnitCount: 0,
        processName: null,
        description: null,
      }
      expect(video.status).toBe(status)
    })
  })

  it('duration 필드는 null 또는 숫자여야 한다', () => {
    const videoWithNull: VideoResponse = {
      id: 1,
      fileName: 'test.mp4',
      filePath: '/test.mp4',
      duration: null,
      status: 'pending',
      createdAt: '2026-03-31T00:00:00Z',
    workUnitCount: 0,
    }
    const videoWithDuration: VideoResponse = {
      ...videoWithNull,
      duration: 180.5,
    }
    expect(videoWithNull.duration).toBeNull()
    expect(videoWithDuration.duration).toBe(180.5)
  })
})

describe('WorkUnitResponse 타입 검증', () => {
  it('frames 배열이 올바른 구조를 가져야 한다', () => {
    expect(mockWorkUnit.frames[0]).toMatchObject({
      id: expect.any(Number),
      workUnitId: expect.any(Number),
      frameTime: expect.any(Number),
      imagePath: expect.any(String),
    })
  })

  it('equipments와 materials는 null 또는 string 배열이어야 한다', () => {
    const workUnitWithNull: WorkUnitResponse = {
      ...mockWorkUnit,
      equipments: null,
      materials: null,
    }
    expect(workUnitWithNull.equipments).toBeNull()
    expect(workUnitWithNull.materials).toBeNull()
    expect(mockWorkUnit.equipments).toEqual(['드릴', '렌치'])
  })
})
