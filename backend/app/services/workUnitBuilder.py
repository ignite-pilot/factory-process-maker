from app.services.claudeAnalyzer import FrameAnalysisResult


class WorkUnitBuilder:
    def build(self, frameResults: list[FrameAnalysisResult]) -> list[dict]:
        if not frameResults:
            return []

        units = []
        currentGroup: list[FrameAnalysisResult] = [frameResults[0]]

        for result in frameResults[1:]:
            if result.title == currentGroup[-1].title:
                currentGroup.append(result)
            else:
                units.append(self._groupToUnit(currentGroup, len(units) + 1))
                currentGroup = [result]

        units.append(self._groupToUnit(currentGroup, len(units) + 1))
        return units

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
