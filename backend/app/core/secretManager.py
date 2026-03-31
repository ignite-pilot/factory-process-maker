import json
import boto3
from botocore.exceptions import ClientError


def getSecretValue(secretName: str) -> dict:
    client = boto3.client("secretsmanager", region_name="ap-northeast-2")
    try:
        response = client.get_secret_value(SecretId=secretName)
    except ClientError as e:
        raise RuntimeError(f"Secret 로드 실패: {secretName} — {e}")
    return json.loads(response["SecretString"])
