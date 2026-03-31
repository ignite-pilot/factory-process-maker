import glob
import json
import os
import subprocess
from app.core.config import FRAMES_DIR


class FrameExtractor:
    def __init__(self, videoId: int, videoPath: str):
        self.videoId = videoId
        self.videoPath = videoPath

    def getOutputDir(self) -> str:
        return os.path.join(FRAMES_DIR, str(self.videoId))

    def extractFrames(self, intervalSeconds: int = 1) -> list[str]:
        outputDir = self.getOutputDir()
        os.makedirs(outputDir, exist_ok=True)
        outputPattern = os.path.join(outputDir, "frame_%04d.jpg")
        cmd = [
            "ffmpeg", "-i", self.videoPath,
            "-vf", f"fps=1/{intervalSeconds}",
            "-q:v", "2",
            outputPattern,
            "-y",
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(f"FFmpeg 프레임 추출 실패: {result.stderr}")
        return sorted(glob.glob(os.path.join(outputDir, "frame_*.jpg")))

    def getVideoDuration(self) -> float:
        cmd = [
            "ffprobe", "-v", "quiet",
            "-print_format", "json",
            "-show_format",
            self.videoPath,
        ]
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(f"FFprobe 실행 실패: {result.stderr}")
        data = json.loads(result.stdout)
        return float(data["format"]["duration"])
