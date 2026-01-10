# eBPF Compilation Issue - Known Limitation

## Problem
The current Arch Linux BPF headers (`/usr/include/bpf/bpf_helper_defs.h`) have type definition issues with `__u32` and `__u64` when compiling with clang for BPF target.

## Root Cause
The system headers expect kernel-specific type definitions that aren't available in userspace compilation.

## Workaround Options

### Option 1: Use vmlinux.h (Recommended for Production)
Generate vmlinux.h from your running kernel:
```bash
bpftool btf dump file /sys/kernel/btf/vmlinux format c > vmlinux.h
```

Then use it in the XDP program instead of individual linux headers.

### Option 2: Skip eBPF for Now
Since this is Sprint 1 and we're building the foundation, we can:
1. Focus on the L7 proxy first (pure Go, no eBPF)
2. Return to eBPF data plane in Sprint 2 with proper kernel headers

### Option 3: Use Pre-compiled eBPF Object
Compile the eBPF program on a system with proper headers, then commit the `.o` file.

## Decision for NLB+
**We'll proceed with Option 2** - implement the L7 proxy first, then circle back to eBPF with vmlinux.h.

This aligns with our "API-First" strategy - the L7 proxy will provide the data needed for Copilot demos.
