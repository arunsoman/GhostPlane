# NLB+ System Architecture

## Overview
NLB+ is a hybrid Layer 4/7 Load Balancer built on the principle of **Control/Data Plane Separation**. It shifts the heavy lifting of packet forwarding to the Linux Kernel using eBPF, while maintaining a rich, user-friendly Control Plane in User Space.

![Component Diagram](https://mermaid.ink/img/pako:eNptkMFqwzAMhl_F6NRCvtBDe9hCODYGY5cduouM49QWq45sZylj7LP3yE066HqT_v-TTE-w5hwwg_at4f2AF4U9F_Qz2y94fX19vj3_3j_eP9_uH9_fl8cSz8UStJ4UjI4UjO-w1qTgrCCh0S_O0JGCs4IErScl6P2bgrOChE4_4Kwhodc_grOChF7_Ljh7SOj1H4Kzh4Re_yE4e0jo9R-Cs4eEXv8hOHtI6PUfoLNnhF7_ITh7SOj1H4Kzh4Re_yE4e0jo9R-Cs4eEXv8hOHtI6PUfgrOHhF7_ITh7SOj1H4Kzh4Re_yG4-0jo9R-Cu4-EXv8huPtI6PUfgrv_SeiN_xDc_U9Cb_yH4O4jodf_ILj7SOj1H4K7j4Re_yG4-0jo9R-Cu4-EXf8huPtIaP0fgrOPxE3_Ibj7SNz0H4K7j8RN_yE4-0jc9B-Cu4_ETf8hOPtI3PQfgfOPxE3_ITj7SNz0H4Gzj8RN_xE4-0jc9B-B84_ETf8ROPtI3PQfgfOPxE3_ETj_SNz0H4Hzj8RN_xE4_0jc9B-B84_ETf8ROP9I3PQfgfOPxE3_ETj_SNz0H4Hzj8RN_xE4_0jc9B-B84_ETf8ROP9I3PQfgfOPxE3/ETj/SNz0H4Hzj8RN/xE4/0jc9B+B84/ETf8ROP9I3PQfgfOPxE3/ETj/SNz0H4Hzj8RN/xE4/0jc9B+B84/ETf8ROP9I3PQfgfOPxE3/ETj/SNz0H4Kzj8RN/yE4+0jc9B+Cs4/ETf8BOPtI3PQfgrOPxE3/ATj7SNz0H4Kzj8RN/wE4+0jc9B+Cs4/ETf8BOPtI3PQfgrOPxE3/ATj7SNz0H4Kzj8RN/wE4+0jc9B+Cs4/ETf8BOPtI3PQfgrOPxE3/Ibj7SNz0H4K7j8RN/yG4+0jc9B+Cu4_ETf8huPtI3PQfgrOPxE3/Ibj7SNz0H4Kzj8RN/wE4-0jc9B-Cs4_ETf8BOPtI3PQfgrOPxE3/ATj7SNz0H4Kzj8RN/wE4-0jc9B-Cs4_ETf8BOPtI3PQfgrOPxE3/ATj7SNz0H4Kzj8RN/wE4-0jc9B-Cs4_ETf8BOPtI3PQfgrOPxE3/ATj7SNz0H4Kzj8RN/wE4-0jc9B-Cs4_ETf8BOPtI3PQfgrOPxE3/ATj7SNz0H4Kzj8RN/wE4-0jc9B-Cs4_ETf8BOPtI3PQfgrOPxE3/ATj7SNz0H4Kzj8RN/wE4-0jc9B-Cs4_ETf8BOPtI3PQfgrOPxE3/ATj7SNz0H4Kzj8RN/wE4-0jc9B-Cs4_ETf8BOPtI3PQfgrOPxE3/ATj7SNz0H4Kzj8RN/wE4-0jc9B-Cs4_ETf8BOPtI3PQfgrOPxE3/ATj7SNz0H4Kzj8RN/wE4-0jc9B-Cs4_ETf8BOPtI3PQfgrOPxE3/ATj7SNz0H4Kzj8RN/wE4-0jc9B-Cs4_ETf8BOPtI3PQfgrOPxE3/ATj7SNz0H4Kzj8RN/wE4-0jc9B-Cs4_ETf8BOPtI3PQfgrOPxE3/ATj7SNz0H4Kzj8RN/wE4-0jc9B-Cs4_ETf8hOPtI3PQfgrOPxE3/Ibj7SNz0H4Kzj8RN/wE4-0jc9B-Cc4_ETf8hOPtI3PQfgnOPxE3/IQ)

*(Diagram placeholder - Mermaid visualization recommended for future)*

## Core Components

### 1. Control Plane (Go)
The brain of the operation. It runs in user space and handles:
*   **Management API Service (`:8081`)**: REST/gRPC endpoints for configuration.
*   **Authentication (`pkg/auth`)**: JWT-based access control.
*   **Database (`pkg/db`)**: SQLite-based persistent storage for configuration and user data.
*   **Copilot Agent (`copilot/`)**: A Python/Go sidecar that analyzes metrics and suggests optimizations.

### 2. eBPF Data Plane (Kernel)
The muscle of the operation.
*   **XDP Hooks**: Attached to the Network Interface Card (NIC).
*   **Packet Processing**: Inspects headers, performs routing table lookups, and redirects packets.
*   **BPF Maps**: Shared memory structures allowing the Control Plane to update routing rules dynamically without reloading the kernel program.

### 3. Proxy Engine (`pkg/proxy`)
For Layer 7 (HTTP) traffic that requires inspection:
*   Traffic is passed from XDP to the userspace Proxy Engine via `AF_XDP` sockets (or standard socket fallback).
*   The Go Proxy parses HTTP, handles SSL Termination, and implements WAF rules.
*   Forwarding is done to backend services via standard TCP.

### 4. Setup & Telemetry
*   **Automated Audit**: The `pkg/setup` module scans the host kernel for eBPF features.
*   **Metrics**: OpenTelemetry integration enables real-time monitoring of RPS, Latency, and Drop Rates.

## Directory Map
See [Project Structure](../PROJECT_STRUCTURE.md) for a detailed breakdown of the codebase layout.

## Decision Log (ADRs)
We use Architecture Decision Records to track immutable design choices.
*   [ADR-001: eBPF Data Plane](adr/001-ebpf-data-plane.md)
*   [ADR-002: Implementation Strategy](adr/002-implementation-strategy.md)
