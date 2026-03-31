import pytest
from unittest.mock import patch, MagicMock, mock_open
from app.services.claudeAnalyzer import ClaudeAnalyzer, FrameAnalysisResult


def test_analyzeFrame_returnsFrameAnalysisResult():
    analyzer = ClaudeAnalyzer()
    mockResponse = MagicMock()
    mockResponse.content = [MagicMock(text='{"title": "부품 조립", "description": "볼트 체결 작업", "equipments": ["전동드라이버"], "materials": ["볼트 M8"]}')]

    with patch("builtins.open", mock_open(read_data=b"fake_image_data")):
        with patch.object(analyzer.client.messages, "create", return_value=mockResponse):
            result = analyzer.analyzeFrame(framePath="frames/1/frame_0001.jpg", frameTime=1.0)

    assert isinstance(result, FrameAnalysisResult)
    assert result.title == "부품 조립"
    assert result.frameTime == 1.0
    assert "전동드라이버" in result.equipments


def test_analyzeFrame_handlesInvalidJson():
    analyzer = ClaudeAnalyzer()
    mockResponse = MagicMock()
    mockResponse.content = [MagicMock(text="분석할 수 없습니다")]

    with patch("builtins.open", mock_open(read_data=b"fake_image_data")):
        with patch.object(analyzer.client.messages, "create", return_value=mockResponse):
            result = analyzer.analyzeFrame(framePath="frames/1/frame_0001.jpg", frameTime=2.0)

    assert result.title == "알 수 없음"
    assert result.frameTime == 2.0


def test_analyzeFrame_returnsCorrectFrameTime():
    analyzer = ClaudeAnalyzer()
    mockResponse = MagicMock()
    mockResponse.content = [MagicMock(text='{"title": "검사", "description": "품질 검사", "equipments": [], "materials": []}')]

    with patch("builtins.open", mock_open(read_data=b"fake_image_data")):
        with patch.object(analyzer.client.messages, "create", return_value=mockResponse):
            result = analyzer.analyzeFrame(framePath="frames/1/frame_0005.jpg", frameTime=5.0)

    assert result.frameTime == 5.0
    assert result.title == "검사"
