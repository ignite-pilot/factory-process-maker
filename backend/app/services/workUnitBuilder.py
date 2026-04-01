from app.services.claudeAnalyzer import FrameAnalysisResult

MIN_DURATION_SECONDS = 10


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

        # 2단계: 짧은 그룹(MIN_DURATION_SECONDS 미만)을 이전 그룹에 병합
        groups = self._mergeShortGroups(groups)

        # 3단계: 인접한 동일 타이틀 그룹 재병합
        groups = self._mergeAdjacentSameTitle(groups)

        return [self._groupToUnit(g, i + 1) for i, g in enumerate(groups)]

    def _mergeShortGroups(self, groups: list[list[FrameAnalysisResult]]) -> list[list[FrameAnalysisResult]]:
        if len(groups) <= 1:
            return groups

        merged = [groups[0]]
        for group in groups[1:]:
            duration = group[-1].frameTime - group[0].frameTime
            if duration < MIN_DURATION_SECONDS and merged:
                merged[-1] = merged[-1] + group
            else:
                merged.append(group)
        return merged

    def _mergeAdjacentSameTitle(self, groups: list[list[FrameAnalysisResult]]) -> list[list[FrameAnalysisResult]]:
        if len(groups) <= 1:
            return groups

        merged = [groups[0]]
        for group in groups[1:]:
            if group[0].title == merged[-1][0].title:
                merged[-1] = merged[-1] + group
            else:
                merged.append(group)
        return merged

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
