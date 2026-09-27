from apps.tool_expert_factory.contracts import ExpertRequest
from apps.tool_expert_factory.openai_adapter import execute_openai


def test_openai_blocks_without_secret(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    result = execute_openai(ExpertRequest("expert-openai", "test objective", "trace-openai-001"))
    assert result.status == "BLOCKED"
    assert "openai_api_key_missing" in result.blockers


def test_openai_maps_real_response(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-secret")

    class Response:
        def __enter__(self):
            return self
        def __exit__(self, *args):
            return False
        def __iter__(self):
            return iter([])
        def read(self):
            return b"{}"

    def fake_urlopen(request, timeout):
        class JsonResponse:
            def __enter__(self): return self
            def __exit__(self, *args): return False
            def __iter__(self): return iter([])
        import json
        return _Response({"output":[{"content":[{"type":"output_text","text":"AUREA test response"}]}]})

    class _Response:
        def __init__(self, body): self.body=body
        def __enter__(self): return self
        def __exit__(self, *args): return False

    import apps.tool_expert_factory.openai_adapter as adapter
    monkeypatch.setattr(adapter.urllib.request, "urlopen", fake_urlopen)
    result = execute_openai(ExpertRequest("expert-openai", "test objective", "trace-openai-002"))
    assert result.status == "EXECUTED"
    assert result.result == "AUREA test response"
    assert result.evidence[0].authoritative is False
