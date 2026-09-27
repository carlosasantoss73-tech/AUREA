"""AUREA Tool Expert Knowledge Researcher V3.
The researcher broadens web discovery without weakening the Bibliotecario authority boundary.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from enum import Enum
from hashlib import sha256
from urllib.parse import urlparse
from urllib.request import Request, urlopen


class SourceTier(str, Enum):
    OFFICIAL = "OFFICIAL"
    COMMUNITY = "COMMUNITY"
    VIDEO = "VIDEO"
    SOCIAL = "SOCIAL"
    SECONDARY = "SECONDARY"


@dataclass(frozen=True)
class KnowledgeSource:
    url: str
    tier: SourceTier
    publisher: str
    topic: str
    authoritative: bool
    discovered_at: str


@dataclass(frozen=True)
class ResearchFinding:
    source: KnowledgeSource
    status: str
    digest: str
    notes: str


OFFICIAL_SOURCE_CATALOG: dict[str, tuple[str, ...]] = {
    "playwright-mcp": (
        "https://playwright.dev/docs/getting-started-mcp",
        "https://github.com/microsoft/playwright",
    ),
    "skyvern": (
        "https://github.com/Skyvern-AI/skyvern",
        "https://docs.skyvern.com/",
    ),
    "stagehand": (
        "https://github.com/browserbase/stagehand",
        "https://docs.stagehand.dev/",
    ),
    "browser-use": (
        "https://github.com/browser-use/browser-use",
        "https://docs.browser-use.com/",
    ),
    "model-context-protocol": (
        "https://modelcontextprotocol.io/",
        "https://github.com/modelcontextprotocol",
    ),
}


_OFFICIAL_HOSTS: dict[str, set[str]] = {
    "playwright-mcp": {"playwright.dev", "github.com"},
    "skyvern": {"docs.skyvern.com", "github.com"},
    "stagehand": {"docs.stagehand.dev", "github.com"},
    "browser-use": {"docs.browser-use.com", "github.com"},
    "model-context-protocol": {"modelcontextprotocol.io", "github.com"},
}


class KnowledgeResearcher:
    agent_id = "AUREA-KNOWLEDGE-RESEARCHER-V3"

    def __init__(self, timeout_seconds: int = 15):
        self.timeout_seconds = timeout_seconds

    @staticmethod
    def now() -> str:
        return datetime.now(timezone.utc).isoformat()

    @classmethod
    def official_sources(cls, topic: str) -> tuple[KnowledgeSource, ...]:
        urls = OFFICIAL_SOURCE_CATALOG.get(topic, ())
        return tuple(
            cls.classify_url(url, topic=topic, publisher=topic, official_topics=(topic,))
            for url in urls
        )

    def fetch(self, source: KnowledgeSource) -> ResearchFinding:
        try:
            req = Request(
                source.url,
                headers={"User-Agent": "AUREA-Knowledge-Researcher/3.0"},
            )
            with urlopen(req, timeout=self.timeout_seconds) as response:
                body = response.read(2_000_000)
            return ResearchFinding(
                source,
                "FETCHED",
                sha256(body).hexdigest(),
                f"HTTP content fetched ({len(body)} bytes).",
            )
        except Exception as exc:
            return ResearchFinding(
                source, "BLOCKED", "", f"{type(exc).__name__}: {exc}"
            )

    @classmethod
    def classify_url(
        cls,
        url: str,
        *,
        topic: str,
        publisher: str = "unknown",
        official_topics: tuple[str, ...] | None = None,
    ) -> KnowledgeSource:
        host = (urlparse(url).hostname or "").lower()
        official_hosts = set()
        for item in official_topics or ():
            official_hosts.update(_OFFICIAL_HOSTS.get(item, set()))

        if "youtube.com" in host or "youtu.be" in host:
            tier = SourceTier.VIDEO
        elif any(x in host for x in ("x.com", "twitter.com", "linkedin.com", "reddit.com")):
            tier = SourceTier.SOCIAL
        elif host in official_hosts:
            tier = SourceTier.OFFICIAL
        elif host == "github.com":
            tier = SourceTier.OFFICIAL if publisher != "unknown" else SourceTier.SECONDARY
        else:
            tier = SourceTier.SECONDARY

        return KnowledgeSource(
            url, tier, publisher, topic, tier == SourceTier.OFFICIAL, cls.now()
        )

    @staticmethod
    def promotion_rule(finding: ResearchFinding) -> str:
        if finding.status != "FETCHED":
            return "REJECT"
        return (
            "CANDIDATE_FOR_INSTITUTIONAL_VALIDATION"
            if finding.source.authoritative
            else "TROUBLESHOOTING_OR_LEARNING_EVIDENCE_ONLY"
        )

    @staticmethod
    def as_record(finding: ResearchFinding) -> dict[str, object]:
        data = asdict(finding)
        data["promotion"] = KnowledgeResearcher.promotion_rule(finding)
        return data
