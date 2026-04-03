import base64
import json
from dataclasses import dataclass, field
import anthropic
from app.core.config import getAnthropicApiKey

ANALYSIS_PROMPT = """
이 이미지는 자동차 부품 조립 공장 공정 동영상의 한 프레임입니다.
이 프레임에서 수행 중인 작업을 분석하여 아래 JSON 형식으로만 응답하세요.
다른 텍스트는 절대 포함하지 마세요.

동사 판단 기준 (반드시 지킬 것):
- "조립": 작업자의 손 안에 부품이 실제로 들려 있고 지그·작업대·차체에 결합하는 행위. 손에 부품이 없으면 절대 조립이 아님.
- "검사": 완성된 부품·조립 상태를 눈으로 확인하거나 기구로 측정하는 행위. 손에 부품을 들고 있지 않아도 됨.
- "부품 준비": 선반·박스·팔레트에서 부품을 꺼내거나 집어드는 행위.
- "운반": 부품이나 작업자가 한 위치에서 다른 위치로 이동하는 행위.
- "체결": 손에 공구(드라이버·렌치 등)를 들고 볼트·너트·클립을 조이는 행위.
- "적재": 완성 부품을 거치대·팔레트·컨베이어에 올려두는 행위.

title 규칙:
- "동사" 또는 "[부품명] + 동사" 형식으로 작성하세요 (최대 12글자).
- 부품명은 화면에서 100% 확실히 식별될 때만 포함하세요. 조금이라도 애매하면 생략하세요.
  예: 확실 → "리어 범퍼 조립" / 애매 → "조립"
- 세부 묘사(색상, 방향, 수량 등)는 title에 넣지 말고 description에 작성하세요.

equipments·materials 규칙 (매우 중요):
- 작업자가 지금 이 순간 실제로 손에 들거나 직접 사용 중인 설비·부품만 기록하세요.
- 배경에 보이거나, 작업대 위에 놓여 있거나, 주변에 있을 뿐 현재 작업에 쓰이지 않는 것은 절대 포함하지 마세요.
- equipments: 현재 동작에 쓰는 기계·공구 (예: 드라이버, 토크렌치, 조립 지그)
- materials: 현재 손으로 다루고 있는 부품·자재 (예: 볼트, 범퍼, 클립)

{
  "title": "작업명 (최대 12글자)",
  "description": "작업 설명 (1~2문장)",
  "equipments": ["현재 직접 사용 중인 설비/공구만"],
  "materials": ["현재 손으로 다루는 부품/자재만"]
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
