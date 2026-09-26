"""AUREA Tool Expert Knowledge Researcher V2."""
from __future__ import annotations
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from enum import Enum
from hashlib import sha256
from urllib.request import Request, urlopen

class SourceTier(str, Enum):
    OFFICIAL="OFFICIAL"; COMMUNITY="COMMUNITY"; VIDEO="VIDEO"; SOCIAL="SOCIAL"; SECONDARY="SECONDARY"

@dataclass(frozen=True)
class KnowledgeSource:
    url:str; tier:SourceTier; publisher:str; topic:str; authoritative:bool; discovered_at:str

@dataclass(frozen=True)
class ResearchFinding:
    source:KnowledgeSource; status:str; digest:str; notes:str

class KnowledgeResearcher:
    agent_id="AUREA-KNOWLEDGE-RESEARCHER-V2"
    def __init__(self, timeout_seconds:int=15): self.timeout_seconds=timeout_seconds
    @staticmethod
    def now(): return datetime.now(timezone.utc).isoformat()
    def fetch(self, source:KnowledgeSource)->ResearchFinding:
        try:
            req=Request(source.url,headers={"User-Agent":"AUREA-Knowledge-Researcher/2.0"})
            with urlopen(req,timeout=self.timeout_seconds) as response: body=response.read(2_000_000)
            return ResearchFinding(source,"FETCHED",sha256(body).hexdigest(),f"HTTP content fetched ({len(body)} bytes).")
        except Exception as exc:
            return ResearchFinding(source,"BLOCKED","",f"{type(exc).__name__}: {exc}")
    @staticmethod
    def classify_url(url:str,*,topic:str,publisher:str="unknown")->KnowledgeSource:
        host=url.lower()
        if "youtube.com" in host or "youtu.be" in host: tier=SourceTier.VIDEO
        elif any(x in host for x in ("x.com","twitter.com","linkedin.com","reddit.com")): tier=SourceTier.SOCIAL
        elif "github.com" in host or "docs." in host or "developer." in host: tier=SourceTier.OFFICIAL
        else: tier=SourceTier.SECONDARY
        return KnowledgeSource(url,tier,publisher,topic,tier==SourceTier.OFFICIAL,KnowledgeResearcher.now())
    @staticmethod
    def promotion_rule(finding:ResearchFinding)->str:
        if finding.status!="FETCHED": return "REJECT"
        return "CANDIDATE_FOR_INSTITUTIONAL_VALIDATION" if finding.source.authoritative else "TROUBLESHOOTING_OR_LEARNING_EVIDENCE_ONLY"
    @staticmethod
    def as_record(finding:ResearchFinding):
        data=asdict(finding); data["promotion"]=KnowledgeResearcher.promotion_rule(finding); return data
