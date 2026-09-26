from apps.tool_expert_factory.knowledge_researcher import KnowledgeResearcher, SourceTier

def test_source_classification():
    r=KnowledgeResearcher()
    assert r.classify_url("https://playwright.dev/docs/getting-started-mcp",topic="mcp").tier==SourceTier.OFFICIAL
    assert r.classify_url("https://youtube.com/watch?v=x",topic="mcp").tier==SourceTier.VIDEO
    assert r.classify_url("https://reddit.com/r/example",topic="mcp").tier==SourceTier.SOCIAL

def test_non_official_never_becomes_authority():
    r=KnowledgeResearcher(); s=r.classify_url("https://youtube.com/watch?v=x",topic="mcp")
    finding=type("F",(),{"status":"FETCHED","source":s})()
    assert r.promotion_rule(finding)=="TROUBLESHOOTING_OR_LEARNING_EVIDENCE_ONLY"

def test_official_requires_validation():
    r=KnowledgeResearcher(); s=r.classify_url("https://playwright.dev/docs/getting-started-mcp",topic="mcp")
    finding=type("F",(),{"status":"FETCHED","source":s})()
    assert r.promotion_rule(finding)=="CANDIDATE_FOR_INSTITUTIONAL_VALIDATION"
