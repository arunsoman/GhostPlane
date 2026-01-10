# NLB+ Project Structure

```
nlb/
├── README.md                       # Project overview, quick start
├── Makefile                        # Build, test, lint commands
├── docker-compose.yml              # Local dev stack (vLLM, Jaeger, etc.)
├── .github/
│   └── workflows/
│       ├── ci.yml                  # Lint, test, build on PR
│       └── release.yml             # Semantic release
│
├── docs/                           # 📚 DOCUMENTATION (First-Class)
│   ├── architecture/
│   │   └── adr/                    # Architecture Decision Records
│   │       └── 001-ebpf-data-plane.md
│   ├── api/
│   │   ├── openapi.yaml            # Management API spec
│   │   └── grpc/                   # Protobuf definitions
│   ├── runbooks/                   # Operational guides
│   │   └── incident-response.md
│   └── user-guide/                 # End-user docs (generated site)
│
├── cmd/                            # Entry points
│   └── nlb/
│       └── main.go                 # CLI entry point
│
├── pkg/                            # Go packages (Control Plane)
│   ├── proxy/                      # L7 reverse proxy
│   │   ├── proxy.go
│   │   ├── proxy_test.go           # Unit tests
│   │   └── proxy_integration_test.go
│   ├── ebpf/                       # eBPF loader & maps
│   │   ├── loader.go
│   │   ├── loader_test.go
│   │   └── programs/               # C eBPF source
│   │       └── xdp_lb.c
│   │
│   ├── security/                   # 🛡️ USP: UNIFIED SECURITY PLANE
│   │   ├── waf/                    # Context-aware WAF
│   │   │   ├── engine.go           # Rule engine
│   │   │   ├── rules/              # WAF rule definitions
│   │   │   └── context.go          # Application context detection
│   │   ├── ids/                    # Intrusion Detection System
│   │   │   ├── detector.go
│   │   │   └── signatures/         # Attack signatures
│   │   └── ddos/                   # DDoS Detection & Mitigation
│   │       ├── detector.go         # Flash crowd vs botnet detection
│   │       ├── ratelimit.go        # Adaptive rate limiting
│   │       └── mitigation.go       # Auto-mitigation actions
│   │
│   ├── migration/                  # 🔄 USP: ROSETTA STONE MIGRATION
│   │   ├── parsers/
│   │   │   ├── nginx.go            # Nginx config parser
│   │   │   ├── haproxy.go          # HAProxy config parser
│   │   │   └── traefik.go          # Traefik config parser
│   │   ├── translator.go           # Convert to NLB+ format
│   │   ├── shadow/                 # Shadow mode engine
│   │   │   ├── runner.go           # Run dual configs
│   │   │   └── comparator.go       # Compare results
│   │   └── migration_test.go
│   │
│   ├── config/                     # Config parsing & versioning
│   │   ├── config.go
│   │   ├── config_test.go
│   │   └── migrations/             # Config schema migrations
│   ├── audit/                      # Immutable audit log
│   │   ├── logger.go
│   │   └── logger_test.go
│   ├── telemetry/                  # OpenTelemetry setup
│   │   ├── tracing.go
│   │   └── metrics.go
│   └── api/                        # Management API handlers
│       ├── handlers.go
│       └── handlers_test.go
│
├── copilot/                        # 🤖 LLM COPILOT (Python)
│   ├── pyproject.toml              # Python deps
│   ├── src/
│   │   ├── agent.py                # LangGraph agent (main orchestrator)
│   │   │
│   │   ├── tools/                  # 🔧 USP: NETWORK COPILOT TOOLS
│   │   │   ├── metrics.py          # Query live metrics
│   │   │   ├── logs.py             # Query logs with correlation
│   │   │   ├── config.py           # Read/apply configs
│   │   │   ├── rca.py              # Root Cause Analysis engine
│   │   │   ├── config_gen.py       # Natural language -> YAML
│   │   │   ├── migration.py        # Call migration parsers
│   │   │   └── health.py           # Backend health checks
│   │   │
│   │   ├── prompts/                # System prompts
│   │   │   ├── rca_prompt.txt      # RCA reasoning template
│   │   │   ├── config_gen_prompt.txt
│   │   │   └── migration_prompt.txt
│   │   │
│   │   └── reasoning/              # Explainability
│   │       └── chain_logger.py     # Log LLM chain-of-thought
│   │
│   └── tests/
│       ├── test_agent.py
│       ├── test_rca.py             # Test RCA scenarios
│       ├── test_config_gen.py
│       └── test_tools.py
│
├── ml/                             # 🧠 ML SECURITY ENGINE
│   ├── models/                     # Pre-trained ONNX models
│   │   └── anomaly_detector.onnx
│   ├── training/                   # Model training scripts
│   │   └── train_anomaly.py
│   └── inference/                  # Go inference wrapper
│       ├── engine.go
│       └── engine_test.go
│
├── ui/                             # 💎 DASHBOARD (Next.js)
│   ├── package.json
│   ├── app/                        # App Router pages
│   │   ├── page.tsx                # Main dashboard
│   │   ├── copilot/                # 🤖 USP: Copilot Chat Interface
│   │   │   └── page.tsx
│   │   ├── migration/              # 🔄 USP: Migration Wizard
│   │   │   └── page.tsx
│   │   └── security/               # 🛡️ USP: Security Dashboard
│   │       └── page.tsx
│   │
│   ├── components/                 # Shadcn/UI components
│   │   ├── proxy/
│   │   │   ├── route-table.tsx     # L7 Route management
│   │   │   └── cert-manager.tsx    # SSL/TLS certificate UI
│   │   ├── ebpf/
│   │   │   ├── packet-flow.tsx     # L4 Traffic visualizer
│   │   │   └── xdp-stats.tsx       # NIC-level drop counters
│   │   ├── copilot/
│   │   │   ├── chat.tsx            # Copilot chat widget
│   │   │   └── reasoning-trail.tsx # Show LLM chain-of-thought
│   │   ├── migration/
│   │   │   ├── config-uploader.tsx
│   │   │   ├── shadow-mode-toggle.tsx
│   │   │   └── diff-viewer.tsx     # Visual config diff
│   │   ├── security/
│   │   │   ├── threat-feed.tsx     # Live security events (IDS)
│   │   │   ├── waf-rules-editor.tsx # WAF Configuration
│   │   │   └── ddos-shield.tsx     # DDoS Mitigation controls
│   │   ├── audit/
│   │   │   └── log-viewer.tsx      # Immutable audit trail UI
│   │   ├── telemetry/
│   │   │   └── real-time-graph.tsx # Canvas-based high-freq charts
│   │   └── topology/
│   │       └── network-graph.tsx   # React Flow topology
│   │
│   └── __tests__/                  # Jest/Playwright tests
│       ├── copilot.test.tsx
│       └── migration.test.tsx
│
└── test/                           # 🧪 TESTING (First-Class)
    ├── unit/                       # Co-located, but runnable here too
    ├── integration/                # Cross-component tests
    │   └── proxy_copilot_test.go
    ├── e2e/                        # End-to-end scenarios
    │   └── full_flow_test.go
    ├── chaos/                      # Chaos engineering tests
    │   └── latency_injection_test.go
    ├── contracts/                  # Consumer-driven contract tests
    │   └── api_contract_test.go
    └── fixtures/                   # Test data & mock configs
        ├── sample_config.yaml
        └── attack_traffic.pcap
```

---

## Key Design Decisions

| Principle | How It's Reflected |
| :--- | :--- |
| **Testability** | `*_test.go` files co-located. Dedicated `test/` folder for integration, e2e, chaos, and contracts. |
| **Auditability** | `pkg/audit/` for immutable logs. `docs/adr/` for Architecture Decision Records. |
| **Traceability** | `pkg/telemetry/` for OpenTelemetry. Correlation IDs flow through all packages. |
| **Docs as Code** | `docs/` is versioned with the codebase. `docs/api/openapi.yaml` is the source of truth. |
