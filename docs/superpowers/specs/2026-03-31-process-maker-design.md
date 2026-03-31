# Process Maker — 공장 공정 동영상 작업 단위 분석 시스템 설계 문서

**작성일:** 2026-03-31  
**프로젝트:** https://github.com/ignite-pilot/process-maker

---

## 1. 개요

공장 공정을 녹화한 동영상을 AI로 분석하여 작업 단위로 자동 분리하고, 각 작업의 소요 시간, 사용 설비, 주요 자재를 추출한다. AI가 생성한 초안을 사람이 웹 UI에서 검토·수정한 후 MySQL DB에 최종 저장한다.

---

## 2. 전체 아키텍처

```
[웹 브라우저 (React)]
        ↕ REST API
[FastAPI 백엔드]
        ↕
  ┌─────┴──────┐
[파일 스토리지]  [MySQL DB]
(업로드된 영상)  (작업 분석 결과)
        ↕
[분석 워커]
  - FFmpeg: 프레임 추출
  - Claude Vision API: 프레임 분석
  - 작업 단위 구성 로직
```

**주요 흐름:**
1. 사용자가 웹 UI에서 동영상 업로드
2. 백엔드가 FFmpeg으로 1초 간격 프레임 추출
3. Claude Vision API로 각 프레임 분석 (작업 내용, 설비, 자재 감지)
4. 분석 결과를 작업 단위로 그루핑하여 MySQL 저장
5. 웹 UI에서 타임라인 형태로 초안 표시
6. 사람이 프레임 위치/작업 설명/시간 수정 후 최종 저장

---

## 3. 데이터 모델 (MySQL)

### videos
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGINT PK | |
| fileName | VARCHAR | 원본 파일명 |
| filePath | VARCHAR | 서버 저장 경로 |
| duration | FLOAT | 영상 길이 (초) |
| status | ENUM | pending / analyzing / done / failed |
| createdAt | DATETIME | |

### analysis_jobs
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGINT PK | |
| videoId | BIGINT FK | |
| status | ENUM | queued / running / completed / failed |
| startedAt | DATETIME | |
| completedAt | DATETIME | |

### work_units
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGINT PK | |
| videoId | BIGINT FK | |
| sequence | INT | 작업 순서 |
| title | VARCHAR | 작업명 |
| startTime | FLOAT | 시작 시간 (초) |
| endTime | FLOAT | 종료 시간 (초) |
| duration | FLOAT | 소요 시간 (초) |
| description | TEXT | 작업 설명 |
| equipments | JSON | 사용 설비 목록 |
| materials | JSON | 사용 자재 목록 |
| startFrame | INT | 시작 프레임 번호 |
| endFrame | INT | 종료 프레임 번호 |
| isManuallyEdited | BOOLEAN | 사람이 수정 여부 |
| createdAt | DATETIME | |
| updatedAt | DATETIME | |

### work_unit_frames
각 작업 단위의 대표 썸네일 프레임을 저장한다 (작업 단위당 1~3개).

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | BIGINT PK | |
| workUnitId | BIGINT FK | |
| frameTime | FLOAT | 프레임 시간 (초) |
| imagePath | VARCHAR | 추출 이미지 경로 |

---

## 4. 백엔드 (FastAPI + Python)

### API 엔드포인트

```
POST   /api/videos/upload                  # 동영상 업로드
GET    /api/videos                         # 동영상 목록
GET    /api/videos/{id}                    # 동영상 상세

POST   /api/videos/{id}/analyze            # 분석 시작
GET    /api/videos/{id}/status             # 분석 진행 상태 (폴링)

GET    /api/videos/{id}/work-units         # 작업 단위 목록 조회
POST   /api/videos/{id}/work-units         # 작업 단위 수동 추가
PUT    /api/work-units/{id}                # 작업 단위 수정
POST   /api/work-units/reorder             # 순서 변경
DELETE /api/work-units/{id}                # 작업 단위 삭제
```

### 분석 워커 컴포넌트

- **FrameExtractor**: FFmpeg으로 1초 간격 프레임 추출, 이미지 파일로 저장
- **ClaudeAnalyzer**: 프레임 배치를 Claude Vision API로 분석, 작업 내용/설비/자재 추출
- **WorkUnitBuilder**: 연속적으로 유사한 작업 프레임을 그루핑하여 작업 단위 구성
- 분석은 **FastAPI BackgroundTasks**로 비동기 실행 (UI 블로킹 없음)

### 설정 및 인증

- MySQL 접속 정보: AWS Secret Manager `prod/ignite-pilot/mysql-realpilot`에서 로드
- Claude API Key: 환경 변수 `ANTHROPIC_API_KEY`

---

## 5. 프론트엔드 (React + TypeScript)

**기술 스택:** React, TypeScript, TailwindCSS, React Query

### 주요 화면

#### 1. 동영상 목록 페이지 (`/`)
- 업로드된 동영상 카드 목록
- 새 동영상 업로드 버튼
- 분석 상태 배지 (대기중 / 분석중 / 완료)

#### 2. 분석 진행 페이지 (`/videos/{id}/analyzing`)
- 분석 진행률 표시 (폴링으로 상태 업데이트)
- 완료 시 편집 페이지로 자동 이동

#### 3. 작업 단위 편집 페이지 (`/videos/{id}/edit`)
- 상단: 동영상 플레이어
- 하단: 작업 단위 타임라인 목록
  - 각 항목: 시작/종료 시간, 작업명, 설명, 설비, 자재
  - 프레임 위치 조정 (시작/종료 시간 직접 입력)
  - 작업 설명/설비/자재 인라인 편집
  - 작업 단위 추가/삭제
- 최종 저장 버튼

---

## 6. 프로젝트 구조

```
process-maker/
├── backend/
│   ├── app/
│   │   ├── api/          # FastAPI 라우터
│   │   ├── models/       # SQLAlchemy 모델
│   │   ├── schemas/      # Pydantic 스키마
│   │   ├── services/     # 비즈니스 로직
│   │   │   ├── frameExtractor.py
│   │   │   ├── claudeAnalyzer.py
│   │   │   └── workUnitBuilder.py
│   │   └── core/         # 설정, DB 연결, Secret Manager
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── api/
│   └── package.json
└── docs/
    └── superpowers/specs/
```

---

## 7. 에러 처리

- 분석 실패 시 `analysis_jobs.status = failed` 저장, 재시도 가능
- Claude API 호출 실패 시 해당 프레임 스킵 후 계속 진행
- 업로드 파일 크기 제한: 2GB
- 지원 포맷: mp4, mov, avi

---

## 8. 테스트 전략

- **단위 테스트:** FrameExtractor, ClaudeAnalyzer, WorkUnitBuilder 각각 독립 테스트
- **통합 테스트:** API 엔드포인트 → DB 저장 흐름 테스트
- **프론트엔드 테스트:** React Testing Library로 편집 UI 컴포넌트 테스트
- **Mock:** Claude API는 테스트 시 Mock 응답 사용

---

## 9. GitHub

- 저장소: https://github.com/ignite-pilot/process-maker
- 브랜치 전략: `main` (프로덕션), `develop` (개발), feature 브랜치
