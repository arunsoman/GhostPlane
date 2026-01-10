# ADR-001: eBPF Data Plane

## Status
Accepted

## Context
We need a high-performance data plane for L4 load balancing that can handle millions of packets per second with minimal latency.

## Decision
Use eBPF/XDP for kernel-level packet processing, with `cilium/ebpf` Go library for loading and managing programs.

## Consequences

### Positive
- Packet processing at NIC driver level (XDP) - zero user-space copy
- Can handle millions of packets/sec with minimal CPU
- Excellent for DDoS mitigation at L4

### Negative
- Linux-only (not portable to Windows/macOS)
- Requires kernel 5.10+
- More complex to develop and debug than user-space code

## Alternatives Considered
- Pure Go/Rust user-space proxy: Easier, but 10x slower for L4
- DPDK: Even faster, but requires dedicated cores and NICs
