from difflib import SequenceMatcher
from app.services.claudeAnalyzer import FrameAnalysisResult

SIMILARITY_THRESHOLD = 0.6
MIN_DURATION_SECONDS = 3.0


def _titleSimilarity(a: str, b: str) -> float:
    return SequenceMatcher(None, a, b).ratio()


def _jaccardSimilarity(a: list[str], b: list[str]) -> float:
    setA, setB = set(a), set(b)
    if not setA and not setB:
        return 1.0
    if not setA or not setB:
        return 0.0
    return len(setA & setB) / len(setA | setB)


def _groupDuration(group: list[FrameAnalysisResult]) -> float:
    if len(group) < 2:
        return 0.0
    return group[-1].frameTime - group[0].frameTime


def _groupSimilarity(groupA: list[FrameAnalysisResult], groupB: list[FrameAnalysisResult]) -> float:
    titleA = groupA[0].title
    titleB = groupB[0].title

    equipmentsA = list({e for r in groupA for e in r.equipments})
    equipmentsB = list({e for r in groupB for e in r.equipments})
    materialsA = list({m for r in groupA for m in r.materials})
    materialsB = list({m for r in groupB for m in r.materials})

    titleScore = _titleSimilarity(titleA, titleB)
    equipmentScore = _jaccardSimilarity(equipmentsA, equipmentsB)
    materialScore = _jaccardSimilarity(materialsA, materialsB)

    return titleScore * 0.6 + equipmentScore * 0.2 + materialScore * 0.2


class WorkUnitBuilder:
    def build(self, frameResults: list[FrameAnalysisResult]) -> list[dict]:
        if not frameResults:
            return []

        # 1단계: 연속된 동일 타이틀 그룹핑
        groups: list[list[FrameAnalysisResult]] = []
        currentGroup: list[FrameAnalysisResult] = [frameResults[0]]

        for result in frameResults[1:]:
            if result.title == currentGroup[-1].title:
                currentGroup.append(result)
            else:
                groups.append(currentGroup)
                currentGroup = [result]
        groups.append(currentGroup)

        # 2단계: 유사도 기반 인접 그룹 병합
        groups = self._mergeSimilarGroups(groups)

        # 3단계: 최소 3초 미만 그룹 인접 병합
        groups = self._mergeShortGroups(groups)

        return [self._groupToUnit(g, i + 1) for i, g in enumerate(groups)]

    def _mergeSimilarGroups(self, groups: list[list[FrameAnalysisResult]]) -> list[list[FrameAnalysisResult]]:
        if len(groups) <= 1:
            return groups

        merged = [groups[0]]
        for group in groups[1:]:
            similarity = _groupSimilarity(merged[-1], group)
            if similarity >= SIMILARITY_THRESHOLD:
                merged[-1] = merged[-1] + group
            else:
                merged.append(group)
        return merged

    def _mergeShortGroups(self, groups: list[list[FrameAnalysisResult]]) -> list[list[FrameAnalysisResult]]:
        """3초 미만 그룹을 더 유사한 인접 그룹과 반복 병합"""
        if len(groups) <= 1:
            return groups

        changed = True
        while changed:
            changed = False
            for i in range(len(groups)):
                if _groupDuration(groups[i]) >= MIN_DURATION_SECONDS:
                    continue
                if len(groups) == 1:
                    break

                # 더 유사한 인접 그룹 선택
                if i == 0:
                    mergeWith = 1
                elif i == len(groups) - 1:
                    mergeWith = i - 1
                else:
                    simPrev = _groupSimilarity(groups[i - 1], groups[i])
                    simNext = _groupSimilarity(groups[i], groups[i + 1])
                    mergeWith = i - 1 if simPrev >= simNext else i + 1

                lo, hi = min(i, mergeWith), max(i, mergeWith)
                merged = groups[lo] + groups[hi]
                groups = groups[:lo] + [merged] + groups[hi + 1:]
                changed = True
                break

        return groups

    def _groupToUnit(self, group: list[FrameAnalysisResult], sequence: int) -> dict:
        allEquipments = set()
        allMaterials = set()
        descriptions = []

        for r in group:
            allEquipments.update(r.equipments)
            allMaterials.update(r.materials)
            if r.description:
                descriptions.append(r.description)

        startTime = group[0].frameTime
        endTime = group[-1].frameTime
        return {
            "sequence": sequence,
            "title": group[0].title,
            "startTime": startTime,
            "endTime": endTime,
            "duration": endTime - startTime,
            "description": descriptions[0] if descriptions else "",
            "equipments": list(allEquipments),
            "materials": list(allMaterials),
            "startFrame": round(startTime),
            "endFrame": round(endTime),
        }
