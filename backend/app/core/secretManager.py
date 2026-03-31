import json
import boto3
from botocore.exceptions import ClientError


def getSecretValue(secretName: str) -> dict:
    client = boto3.client("secretsmanager", region_name="ap-northeast-2")
    try:
        response = client.get_secret_value(SecretId=secretName)
    except ClientError as e:
        raise RuntimeError(f"Secret 로드 실패: {secretName} — {e}")
    try:
        return json.loads(response["SecretString"])
    except (json.JSONDecodeError, KeyError) as e:
        raise RuntimeError(f"Secret 파싱 실패: {secretName} — {e}")
