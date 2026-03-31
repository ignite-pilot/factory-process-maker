import pytest
from unittest.mock import patch, MagicMock
from botocore.exceptions import ClientError


def test_getSecretValueReturnsDict():
    """getSecretValue가 파싱된 딕셔너리를 반환한다."""
    mockResponse = {"SecretString": '{"host": "db.example.com", "username": "admin"}'}
    mockClient = MagicMock()
    mockClient.get_secret_value.return_value = mockResponse

    with patch("boto3.client", return_value=mockClient):
        from app.core.secretManager import getSecretValue
        result = getSecretValue("test-secret")
        assert result == {"host": "db.example.com", "username": "admin"}


def test_getSecretValueCallsCorrectSecret():
    """getSecretValue가 올바른 SecretId로 API를 호출한다."""
    mockResponse = {"SecretString": '{"key": "value"}'}
    mockClient = MagicMock()
    mockClient.get_secret_value.return_value = mockResponse

    with patch("boto3.client", return_value=mockClient):
        from app.core.secretManager import getSecretValue
        getSecretValue("my-secret-name")
        mockClient.get_secret_value.assert_called_once_with(SecretId="my-secret-name")


def test_getSecretValueRaisesRuntimeErrorOnClientError():
    """ClientError 발생 시 RuntimeError를 raise한다."""
    mockClient = MagicMock()
    mockClient.get_secret_value.side_effect = ClientError(
        {"Error": {"Code": "ResourceNotFoundException", "Message": "not found"}},
        "GetSecretValue",
    )

    with patch("boto3.client", return_value=mockClient):
        from app.core.secretManager import getSecretValue
        with pytest.raises(RuntimeError, match="Secret 로드 실패"):
            getSecretValue("nonexistent-secret")


def test_getSecretValueUsesApNortheast2Region():
    """boto3 클라이언트가 ap-northeast-2 리전으로 생성된다."""
    mockResponse = {"SecretString": '{}'}
    mockClient = MagicMock()
    mockClient.get_secret_value.return_value = mockResponse

    with patch("boto3.client", return_value=mockClient) as mockBoto3:
        from app.core.secretManager import getSecretValue
        getSecretValue("any-secret")
        mockBoto3.assert_called_once_with("secretsmanager", region_name="ap-northeast-2")
