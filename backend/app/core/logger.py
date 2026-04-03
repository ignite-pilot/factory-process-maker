import logging
import os
import boto3
from botocore.exceptions import ClientError

LOG_GROUP = os.environ.get("CLOUDWATCH_LOG_GROUP", "/factory-process-maker")
LOG_STREAM = os.environ.get("CLOUDWATCH_LOG_STREAM", "app")
AWS_REGION = os.environ.get("AWS_DEFAULT_REGION", "ap-northeast-2")


def _setupCloudWatchHandler(logger: logging.Logger) -> None:
    try:
        import watchtower
        client = boto3.client("logs", region_name=AWS_REGION)
        handler = watchtower.CloudWatchLogHandler(
            log_group=LOG_GROUP,
            stream_name=LOG_STREAM,
            boto3_client=client,
        )
        handler.setLevel(logging.DEBUG)
        logger.addHandler(handler)
    except Exception as e:
        logger.warning(f"CloudWatch 핸들러 초기화 실패 (로컬 로깅만 사용): {e}")


def getLogger(name: str = "factory-process-maker") -> logging.Logger:
    logger = logging.getLogger(name)
    if not logger.handlers:
        logger.setLevel(logging.DEBUG)

        # 콘솔 핸들러 (항상 활성)
        consoleHandler = logging.StreamHandler()
        consoleHandler.setLevel(logging.INFO)
        formatter = logging.Formatter("[%(asctime)s] %(levelname)s %(name)s: %(message)s")
        consoleHandler.setFormatter(formatter)
        logger.addHandler(consoleHandler)

        # CloudWatch 핸들러 (AWS 환경에서만 활성)
        if os.environ.get("AWS_EXECUTION_ENV") or os.environ.get("AWS_DEFAULT_REGION"):
            _setupCloudWatchHandler(logger)

    return logger


logger = getLogger()
