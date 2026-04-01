import base64
import json
from dataclasses import dataclass, field
import anthropic
from app.core.config import getAnthropicApiKey

ANALYSIS_PROMPT = """
이 이미지는 공장 공정 동영상의 한 프레임입니다.
이 프레임에서 수행 중인 작업을 분석하여 아래 JSON 형식으로만 응답하세요.
다른 텍스트는 절대 포함하지 마세요.

title 규칙:
- 2~5글자의 짧고 표준화된 작업명을 사용하세요.
- 동일한 종류의 작업은 항상 동일한 title을 사용하세요.
- 예시: "부품 조립", "볼트 체결", "검사", "이동", "부품 운반", "용접", "도장", "절삭", "세척", "포장"
- 세부 묘사(색상, 방향 등)는 title에 포함하지 말고 description에 작성하세요.

{
  "title": "작업명 (2~5글자, 표준화)",
  "description": "작업 설명 (1~2문장)",
  "equipments": ["사용 설비1", "사용 설비2"],
  "materials": ["사용 자재1", "사용 자재2"]
}
"""


@dataclass
class FrameAnalysisResult:
    frameTime: float
    title: str
    description: str
    equipments: list[str] = field(default_factory=list)
    materials: list[str] = field(default_factory=list)


class ClaudeAnalyzer:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=getAnthropicApiKey())

    def analyzeFrame(self, framePath: str, frameTime: float) -> FrameAnalysisResult:
        with open(framePath, "rb") as f:
            imageData = base64.standard_b64encode(f.read()).decode("utf-8")

        try:
            response = self.client.messages.create(
                model="claude-opus-4-6",
                max_tokens=512,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": "image/jpeg",
                                    "data": imageData,
                                },
                            },
                            {"type": "text", "text": ANALYSIS_PROMPT},
                        ],
                    }
                ],
            )
            rawText = response.content[0].text.strip()
            if rawText.startswith("```"):
                rawText = rawText.split("```", 2)[1]
                if rawText.startswith("json"):
                    rawText = rawText[4:]
                rawText = rawText.rsplit("```", 1)[0].strip()
            parsed = json.loads(rawText)
            return FrameAnalysisResult(
                frameTime=frameTime,
                title=parsed.get("title", "알 수 없음"),
                description=parsed.get("description", ""),
                equipments=parsed.get("equipments", []),
                materials=parsed.get("materials", []),
            )
        except (json.JSONDecodeError, KeyError, IndexError):
            return FrameAnalysisResult(
                frameTime=frameTime,
                title="알 수 없음",
                description="",
                equipments=[],
                materials=[],
            )
