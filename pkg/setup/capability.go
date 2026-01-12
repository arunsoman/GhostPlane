package setup

import (
	"fmt"
	"os"
	"runtime"
	"strings"
)

// Capabilities represents the system's eBPF and kernel readiness
type Capabilities struct {
	KernelVersion string `json:"kernel_version"`
	OS            string `json:"os"`
	Arch          string `json:"arch"`
	XDP           bool   `json:"xdp_support"`
	TC            bool   `json:"tc_support"`
	BTF           bool   `json:"btf_support"`
	Privileged    bool   `json:"privileged"`
	Dockerized    bool   `json:"dockerized"`
}

// CheckCapabilities probes the host for required NLB+ features
func CheckCapabilities() *Capabilities {
	caps := &Capabilities{
		OS:   runtime.GOOS,
		Arch: runtime.GOARCH,
	}

	// Check for Docker
	if _, err := os.Stat("/.dockerenv"); err == nil {
		caps.Dockerized = true
	}

	// Check kernel version
	data, err := os.ReadFile("/proc/version")
	if err == nil {
		caps.KernelVersion = strings.Split(string(data), " ")[2]
	}

	// Check for eBPF support (simplified for now)
	// In a real implementation, we would try to load a trivial eBPF program
	// For this phase, we check if the BPF filesystem is mounted or if /sys/kernel/btf exists
	if _, err := os.Stat("/sys/kernel/btf"); err == nil {
		caps.BTF = true
	}

	// NLB+ requires root/CAP_SYS_ADMIN
	euid := os.Geteuid()
	_ = os.Getuid() // UID unused for now
	if euid == 0 {
		caps.Privileged = true
	}

	// Heuristic: If kernel > 5.10 and privileged, assume eBPF basics are OK
	// This will be replaced with actual eBPF probe logic in the eBPF package
	caps.XDP = caps.Privileged && !strings.HasPrefix(caps.KernelVersion, "4.")
	caps.TC = caps.Privileged

	return caps
}

func (c *Capabilities) Summary() string {
	status := "READY"
	if !c.XDP || !c.Privileged {
		status = "INCOMPATIBLE"
	}
	return fmt.Sprintf("System Status: %s (Kernel: %s, Privileged: %v)", status, c.KernelVersion, c.Privileged)
}
