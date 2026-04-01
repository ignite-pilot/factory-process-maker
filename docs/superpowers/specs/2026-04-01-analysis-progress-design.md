# 분석 진행 상황 표시 설계

## 개요

동영상 분석 중 사용자가 현재 어느 단계인지, 몇 프레임이 처리됐는지, 예상 남은 시간을 알 수 있도록 진행 상황 표시 기능을 추가한다.

## 요구사항

- A) 프레임 카운트 및 퍼센트 표시 (127 / 375 프레임, 34%)
- B) 단계별 진행 표시 (프레임 추출 → AI 분석 → 작업 단위 생성)
- C) 예상 남은 시간

## 아키텍처

### 인메모리 진행 상황 저장소

`backend/app/api/videos.py`에 모듈 수준 딕셔너리 추가:

```python
_progressStore: dict[int, dict] = {}
```

키: `jobId` (int)  
값:
```python
{
    "currentStep": str,        # "extracting" | "analyzing" | "building"
    "totalFrames": int,        # 전체 프레임 수 (추출 완료 후 확정)
    "processedFrames": int,    # 현재까지 분석 완료된 프레임 수
    "stepStartedAt": float,    # 현재 step 시작 시각 (time.time())
    "analyzingStartedAt": float | None  # AI 분석 시작 시각 (ETA 계산용)
}
```

서버 재시작 시 분석 프로세스도 함께 종료되므로 인메모리 저장으로 충분하다.

### runAnalysis 업데이트 흐름

```
1. 프레임 추출 전
   → _progressStore[jobId] = { currentStep: "extracting", totalFrames: 0, processedFrames: 0, ... }

2. 프레임 추출 완료 후
   → totalFrames = len(framePaths)
   → currentStep = "analyzing"
   → analyzingStartedAt = time.time()

3. 프레임마다 Claude 분석 완료 후
   → processedFrames += 1

4. WorkUnit 생성 시작 시
   → currentStep = "building"

5. 완료/실패 시
   → _progressStore에서 jobId 제거
```

### API 응답 확장

기존 `GET /videos/{videoId}/status` 응답에 progress 필드 추가:

```json
{
  "id": 5,
  "videoId": 3,
  "status": "running",
  "startedAt": "2026-04-01T10:00:00",
  "completedAt": null,
  "currentStep": "analyzing",
  "totalFrames": 375,
  "processedFrames": 127,
  "estimatedSecondsLeft": 82
}
```

`estimatedSecondsLeft` 계산:
```
경과시간 = now - analyzingStartedAt
초당처리속도 = processedFrames / 경과시간
남은프레임 = totalFrames - processedFrames
estimatedSecondsLeft = 남은프레임 / 초당처리속도
```

`status`가 "queued"이거나 progress 데이터가 없으면 progress 필드는 모두 `null` 반환.

### 스키마 변경

`AnalysisJobResponse` 스키마에 필드 추가:

```python
currentStep: str | None = None
totalFrames: int | None = None
processedFrames: int | None = None
estimatedSecondsLeft: float | None = None
```

## 프론트엔드

### AnalyzingPage.tsx 변경

폴링 간격: 3초 → 1초

UI 레이아웃:
```
[ ✓ 프레임 추출 완료          ]
[ → AI 분석 중                ]
[   ████████░░░░░░  34%       ]
[   127 / 375 프레임           ]
[   예상 남은 시간: 1분 22초   ]
[   작업 단위 생성             ]
```

단계 상태:
- 완료된 단계: 체크 아이콘 + 흐린 텍스트
- 현재 단계: 화살표 아이콘 + 강조 텍스트 + 프로그레스 바
- 미완료 단계: 번호 아이콘 + 회색 텍스트

단계 매핑:
| currentStep | 1단계 | 2단계 | 3단계 |
|-------------|-------|-------|-------|
| "extracting" | 진행 중 | 대기 | 대기 |
| "analyzing"  | 완료 | 진행 중 | 대기 |
| "building"   | 완료 | 완료 | 진행 중 |
| null (queued) | 대기 | 대기 | 대기 |

예상 시간 포맷:
- 60초 미만: "N초"
- 60초 이상: "N분 M초"
- `estimatedSecondsLeft`가 null이면 미표시

### useAnalysis.ts 변경

`refetchInterval`: 3000 → 1000

## 테스트

### 백엔드

- `test_progressStore_updatesOnEachFrame`: 프레임마다 `processedFrames` 증가 확인
- `test_statusEndpoint_returnsProgressFields`: progress 필드 포함 응답 확인
- `test_estimatedSecondsLeft_calculation`: ETA 계산 정확도 확인
- `test_progressStore_clearedOnCompletion`: 완료 후 store에서 제거 확인

### 프론트엔드

- `AnalyzingPage` 단계별 렌더링 확인 (extracting / analyzing / building)
- 프로그레스 바 퍼센트 계산 확인
- 예상 시간 포맷 확인 (초 / 분:초)

## 변경 파일 목록

**백엔드**
- `backend/app/api/videos.py` — `_progressStore` 추가, `runAnalysis` 업데이트, status 엔드포인트 확장
- `backend/app/schemas/schemas.py` — `AnalysisJobResponse` 필드 추가
- `backend/tests/test_api.py` — 진행 상황 관련 테스트 추가

**프론트엔드**
- `frontend/src/pages/AnalyzingPage.tsx` — 단계별 UI + 프로그레스 바 + ETA
- `frontend/src/hooks/useAnalysis.ts` — 폴링 간격 1초로 단축
