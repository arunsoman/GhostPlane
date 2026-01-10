# eBPF Development Notes

## Building the XDP Program

The XDP program must be compiled to eBPF bytecode:

```bash
# Install dependencies (Arch Linux)
sudo pacman -S clang llvm bpf

# Generate Go bindings (done automatically via go:generate)
go generate ./pkg/ebpf

# This creates: xdp_bpfel.go, xdp_bpfel.o
```

## Testing

eBPF programs require root privileges:

```bash
# Run as root
sudo go test ./pkg/ebpf -v

# Or with capabilities
sudo setcap cap_net_admin,cap_bpf+ep ./bin/nlb
```

## Debugging

View loaded XDP programs:

```bash
# List XDP programs
sudo bpftool prog show

# Dump eBPF maps
sudo bpftool map dump name backend_pool
```

## Limitations

- Linux kernel 5.10+ required
- XDP not supported on all NICs (use generic XDP as fallback)
- Checksum offloading may need to be disabled
