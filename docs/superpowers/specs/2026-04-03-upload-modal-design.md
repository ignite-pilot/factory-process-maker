# 업로드 모달 설계 문서

**날짜**: 2026-04-03  
**기능**: 공정 동영상 업로드 전 공정 정보 입력 모달

---

## 개요

기존에는 업로드 버튼 클릭 즉시 파일 선택 다이얼로그가 열렸다. 이를 변경하여, 업로드 전에 레이어 팝업을 표시하고 공정 이름과 설명을 입력받은 뒤 업로드한다.

---

## 1. 데이터 모델 변경

### `Video` 테이블 (백엔드)

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| `processName` | String(100) | nullable | 사용자 입력 공정 이름 |
| `description` | String(500) | nullable | 공정 설명 |

- `processName`이 없으면 `fileName` 확장자 제거 값을 기본값으로 사용
- `VideoResponse` 스키마에 두 필드 추가

---

## 2. 백엔드 변경

### `POST /videos/upload`

기존 `file: UploadFile` 외에 추가 폼 필드:
- `processName: str | None = None`
- `description: str | None = None`

`processName`이 `None`이면 `fileName`에서 확장자를 제거한 값으로 자동 설정.

---

## 3. 프론트엔드 변경

### 신규 컴포넌트: `UploadModal`

`frontend/src/components/UploadModal.tsx`

| 요소 | 설명 |
|------|------|
| 공정 이름 입력 (필수) | 비어 있으면 업로드 버튼 비활성화 |
| 설명 입력 (선택) | textarea |
| 파일 선택 영역 | 클릭 or 드래그 앤 드롭 |
| 취소 버튼 | 모달 닫기 |
| 업로드 버튼 | 공정 이름 + 파일 선택 시에만 활성화, 로딩 중 비활성화 |

### 변경 파일

- `VideoListPage.tsx` — 숨김 `<input type="file">` 및 직접 파일 핸들러 제거, 업로드 버튼 클릭 시 `UploadModal` 오픈
- `useVideos.ts` — `useUploadVideo` 시그니처 변경: `(file, processName, description?)` 추가
- `client.ts` — `videosApi.upload(file, processName, description?)` — multipart form에 필드 추가
- `VideoCard.tsx` — `processName` 있으면 파일명 아래 회색 소문자로 표시; `description` 있으면 그 아래 한 줄 더 표시

---

## 4. UX 흐름

```
[업로드 버튼 클릭]
      ↓
[UploadModal 오픈]
  - 공정 이름 입력 (필수)
  - 설명 입력 (선택)
  - 파일 선택
      ↓
[업로드 버튼 클릭] → API 호출 → 완료 → 모달 닫기 → 목록 새로고침
```

---

## 5. 테스트

- `UploadModal.test.tsx`: 렌더링, 공정 이름 미입력 시 버튼 비활성화, 파일 미선택 시 비활성화, 취소 동작
- `test_videos.py` (백엔드): `processName` 포함 업로드 성공, `processName` 없을 때 기본값 설정
