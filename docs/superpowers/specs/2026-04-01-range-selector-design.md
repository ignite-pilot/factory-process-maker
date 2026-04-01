# 구간 선택 작업 생성 기능 설계

## 개요

EditPage의 동영상 플레이어 아래에 구간 선택 UI를 추가하여, 사용자가 마우스로 시작점~끝점을 지정한 뒤 작업 단위를 바로 생성할 수 있게 한다.

## 결정 사항

| 항목 | 결정 |
|------|------|
| 구간 선택 방식 | 커스텀 타임라인 클릭 + 숫자 직접 입력 |
| 작업 생성 방식 | 인라인 폼 (플레이어 아래, 모달 없음) |
| 구현 방식 | EditPage에 독립 RangeSelector 컴포넌트 추가 (VideoPlayer 변경 없음) |

---

## 컴포넌트 설계

### 신규: `RangeSelector.tsx`

EditPage의 VideoPlayer 바로 아래 위치하는 독립 컴포넌트.

**Props:**
```ts
interface RangeSelectorProps {
  duration: number          // 동영상 총 길이 (초)
  currentTime: number       // VideoPlayer의 현재 재생 위치 (초) — onTimeUpdate로 전달
  onAdd: (startTime: number, endTime: number, title: string) => void
}
```

**내부 상태:**
```ts
startTime: number | null   // 시작점 (초)
endTime: number | null     // 끝점 (초)
title: string              // 작업 제목 입력값
```

**레이아웃 (위→아래):**
1. 섹션 레이블 — "✂ 구간 선택하여 작업 추가"
2. 커스텀 타임라인 바
3. 시간 입력 필드 행 (S 입력 ~ E 입력 | 길이 | 초기화)
4. 인라인 폼 (startTime과 endTime이 모두 설정된 경우에만 표시)

---

## 인터랙션 상세

### 커스텀 타임라인 바

- 클릭 위치를 동영상 시간으로 환산: `time = (clickX / barWidth) * duration`
- **1번째 클릭** → startTime 설정, S 마커(초록) 표시
- **2번째 클릭** → endTime 설정, E 마커(빨강) 표시. endTime < startTime이면 두 값을 swap
- **3번째 클릭** → 초기화 (startTime, endTime 모두 null)
- 선택 구간은 파란색 반투명으로 강조
- 현재 재생 위치는 회색 세로선으로 표시 (읽기 전용, VideoPlayer native controls와 연동)

### 시간 입력 필드

- MM:SS 포맷 표시 및 입력
- 유효하지 않은 입력(비어 있음, 범위 초과)은 이전 값으로 되돌림
- startTime 입력 변경 시 endTime이 startTime보다 작아지면 endTime도 함께 보정

### 인라인 폼

- startTime과 endTime이 모두 설정됐을 때만 렌더링
- 제목 입력 후 Enter 또는 "+ 작업으로 추가" 버튼으로 제출
- 제출 시 `onAdd(startTime, endTime, title)` 호출
- 제출 성공 후 상태 초기화 (startTime, endTime, title 모두 리셋)

---

## EditPage 수정

`VideoPlayer`에 `onTimeUpdate` 콜백을 연결하여 `currentTime`을 state로 관리하고, `RangeSelector`에 전달한다.

```tsx
const [currentTime, setCurrentTime] = useState(0)

// VideoPlayer
<VideoPlayer
  ref={videoPlayerRef}
  filePath={video.filePath}
  onTimeUpdate={setCurrentTime}
/>

// RangeSelector (VideoPlayer 바로 아래)
<RangeSelector
  duration={video.duration ?? 0}
  currentTime={currentTime}
  onAdd={(startTime, endTime, title) =>
    createWorkUnit.mutate({ sequence: ..., title, startTime, endTime })
  }
/>
```

`sequence` 값은 기존 작업 단위 중 최대 sequence + 1로 계산한다.

---

## 변경 파일 요약

| 파일 | 변경 종류 | 내용 |
|------|-----------|------|
| `src/components/RangeSelector.tsx` | 신규 | 커스텀 타임라인 + 인라인 폼 |
| `src/pages/EditPage.tsx` | 수정 | currentTime state 추가, RangeSelector 삽입 |
| `src/components/VideoPlayer.tsx` | 변경 없음 | — |
| 백엔드 | 변경 없음 | 기존 createWorkUnit API 그대로 사용 |

---

## 테스트 케이스

```ts
// RangeSelector
- 1번째 클릭 시 startTime이 설정되고 endTime은 null 유지
- 2번째 클릭 시 endTime이 설정되고 인라인 폼이 나타남
- endTime < startTime으로 클릭 시 두 값이 swap됨
- 3번째 클릭 시 startTime, endTime 모두 초기화
- MM:SS 입력 필드에 유효하지 않은 값 입력 시 이전 값으로 복원
- 제목 입력 후 "작업으로 추가" 클릭 시 onAdd 호출됨
- 제출 성공 후 startTime, endTime, title 초기화됨
```
