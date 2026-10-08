# AUREA Procurement — Factory Reuse Matrix V1

| Capability | Factory source | Procurement use | Action |
|---|---|---|---|
| Agent contract | src/factory/agent-contract.ts | Domain manifest | REUSE |
| Evidence ledger | src/factory/evidence.ts | Requirement/evidence traceability | REUSE |
| Provider-neutral routing | src/factory/provider-router.ts | Reasoning/provider selection | REUSE |
| White Label | src/factory/white-label.ts | Client-specific branding | REUSE |
| Tool contract | src/factory/tool-contract.ts | Document/SOCE/normative tools | REUSE |
| Deterministic engine | src/factory/deterministic-engine.ts | Extend only for procurement comparisons | EXTEND |
| Factory validation | src/factory/agent-factory.ts | Package readiness | REUSE |
| Tenant configuration | Agent Contract TenantConfig | Client isolation | REUSE |
| Domain rules | AUREA Procurement | Ecuadorian procurement | CREATE |
| Procurement workflows | AUREA Procurement | Audit/evaluation flow | CREATE |
| Procurement validators | AUREA Procurement | Requirement-specific controls | CREATE |
| Normative knowledge | Procurement Knowledge Pack | Official legal sources | CREATE |
| SOCE integration | Tool/adapter layer | Process retrieval | CREATE ADAPTER |
| Red-team rules | Domain layer | Procurement adversarial review | CREATE |
| Report templates | Domain/output layer | Matrices/reports | CREATE |
