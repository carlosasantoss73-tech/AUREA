from apps.tool_expert_factory.contracts import Evidence
from apps.tool_expert_factory.institutional_authority import (
    InstitutionalEvidenceRequest,
    require_authoritative_evidence,
)


def request():
    return InstitutionalEvidenceRequest("EXPERT", "trace-1", "verify")


class BibliotecarioStub:
    def get_authoritative_evidence(self, _request):
        return [Evidence("bibliotecario", "institutional", "verified fact", authoritative=True)]


class EmptyBibliotecario:
    def get_authoritative_evidence(self, _request):
        return []


class NonAuthoritativeBibliotecario:
    def get_authoritative_evidence(self, _request):
        return [Evidence("provider", "browser", "tool output", authoritative=False)]


def test_bibliotecario_port_accepts_only_authoritative_evidence():
    evidence = require_authoritative_evidence(BibliotecarioStub(), request())
    assert len(evidence) == 1
    assert evidence[0].authoritative is True


def test_bibliotecario_port_fails_closed_when_empty():
    try:
        require_authoritative_evidence(EmptyBibliotecario(), request())
    except RuntimeError as exc:
        assert str(exc) == "BIBLIOTECARIO_AUTHORITATIVE_EVIDENCE_NOT_FOUND"
    else:
        raise AssertionError("missing institutional evidence must block")


def test_bibliotecario_port_fails_closed_on_non_authoritative_output():
    try:
        require_authoritative_evidence(NonAuthoritativeBibliotecario(), request())
    except RuntimeError as exc:
        assert str(exc) == "BIBLIOTECARIO_RETURNED_NON_AUTHORITATIVE_EVIDENCE"
    else:
        raise AssertionError("non-authoritative evidence must block")
