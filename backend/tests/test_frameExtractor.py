import os
import pytest
from unittest.mock import patch, MagicMock
from app.services.frameExtractor import FrameExtractor


def test_getOutputDir_returnsCorrectPath():
    extractor = FrameExtractor(videoId=1, videoPath="uploads/test.mp4")
    assert extractor.getOutputDir() == "frames/1"


def test_extractFrames_callsFFmpegWithCorrectArgs():
    extractor = FrameExtractor(videoId=1, videoPath="uploads/test.mp4")
    with patch("app.services.frameExtractor.subprocess.run") as mockRun:
        mockRun.return_value = MagicMock(returncode=0)
        with patch("app.services.frameExtractor.os.makedirs"):
            with patch("app.services.frameExtractor.glob.glob") as mockGlob:
                mockGlob.return_value = ["frames/1/frame_0001.jpg"]
                result = extractor.extractFrames(intervalSeconds=1)

    args = mockRun.call_args[0][0]
    assert "ffmpeg" in args
    assert "-vf" in args
    assert "fps=1/1" in args
    assert result == ["frames/1/frame_0001.jpg"]


def test_extractFrames_raisesOnFFmpegError():
    extractor = FrameExtractor(videoId=1, videoPath="uploads/test.mp4")
    with patch("app.services.frameExtractor.subprocess.run") as mockRun:
        mockRun.return_value = MagicMock(returncode=1, stderr="error")
        with patch("app.services.frameExtractor.os.makedirs"):
            with pytest.raises(RuntimeError, match="FFmpeg"):
                extractor.extractFrames()


def test_getVideoDuration_parsesFFprobeOutput():
    extractor = FrameExtractor(videoId=1, videoPath="uploads/test.mp4")
    with patch("app.services.frameExtractor.subprocess.run") as mockRun:
        mockRun.return_value = MagicMock(
            returncode=0, stdout='{"format": {"duration": "120.5"}}'
        )
        duration = extractor.getVideoDuration()
    assert duration == 120.5
