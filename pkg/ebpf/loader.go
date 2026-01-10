package ebpf

import (
	"fmt"
	"net"

	"github.com/cilium/ebpf/link"
)

//go:generate go run github.com/cilium/ebpf/cmd/bpf2go -cc clang xdp ./programs/xdp_lb.c -- -O2 -g -Wall -Werror

// Loader handles loading and attaching eBPF programs
type Loader struct {
	objs      *xdpObjects
	link      link.Link
	iface     string
	backends  []string
	listeners []uint16
}

// NewLoader creates a new eBPF loader
func NewLoader(iface string, backends []string, listeners []uint16) *Loader {
	return &Loader{
		iface:     iface,
		backends:  backends,
		listeners: listeners,
	}
}

// Load compiles and loads the XDP program
func (l *Loader) Load() error {
	// Load pre-compiled eBPF objects
	objs := xdpObjects{}
	if err := loadXdpObjects(&objs, nil); err != nil {
		return fmt.Errorf("loading objects: %w", err)
	}
	l.objs = &objs

	// Populate backend pool
	if err := l.populateBackends(); err != nil {
		return fmt.Errorf("populating backends: %w", err)
	}

	// Populate listeners
	for _, port := range l.listeners {
		if err := l.AddListener(port); err != nil {
			return fmt.Errorf("adding listener %d: %w", port, err)
		}
	}

	// Attach XDP program to interface
	iface, err := net.InterfaceByName(l.iface)
	if err != nil {
		return fmt.Errorf("getting interface %s: %w", l.iface, err)
	}

	link, err := link.AttachXDP(link.XDPOptions{
		Program:   objs.XdpLoadBalancer,
		Interface: iface.Index,
	})
	if err != nil {
		return fmt.Errorf("attaching XDP: %w", err)
	}
	l.link = link

	fmt.Printf("✅ XDP program attached to %s\n", l.iface)
	return nil
}

// populateBackends fills the backend_pool eBPF map
func (l *Loader) populateBackends() error {
	for i, backend := range l.backends {
		ip := net.ParseIP(backend)
		if ip == nil {
			return fmt.Errorf("invalid IP: %s", backend)
		}

		// Convert to uint32 (network byte order)
		ipv4 := ip.To4()
		if ipv4 == nil {
			return fmt.Errorf("not an IPv4 address: %s", backend)
		}

		ipUint32 := uint32(ipv4[0])<<24 | uint32(ipv4[1])<<16 | uint32(ipv4[2])<<8 | uint32(ipv4[3])

		if l.objs == nil {
			continue // Skip map updates if objects aren't loaded (for testing)
		}
		key := uint32(i)
		if err := l.objs.BackendPool.Put(&key, &ipUint32); err != nil {
			return fmt.Errorf("adding backend %s: %w", backend, err)
		}
	}

	if l.objs == nil {
		return nil
	}
	// Initialize round-robin counter
	key := uint32(0)
	counter := uint32(0)
	if err := l.objs.RrCounter.Put(&key, &counter); err != nil {
		return fmt.Errorf("initializing counter: %w", err)
	}

	fmt.Printf("✅ Loaded %d backends into eBPF map\n", len(l.backends))
	return nil
}

// Close detaches the XDP program and cleans up
func (l *Loader) Close() error {
	if l.link != nil {
		l.link.Close()
	}
	if l.objs != nil {
		l.objs.Close()
	}
	return nil
}

// AddListener adds a port to the frontend_listeners map
func (l *Loader) AddListener(port uint16) error {
	if l.objs == nil {
		return nil
	}
	// XDP/eBPF uses network byte order (Big Endian) for ports
	key := (port << 8) | (port >> 8)
	val := uint32(1)
	if err := l.objs.FrontendListeners.Put(&key, &val); err != nil {
		return fmt.Errorf("adding listener %d: %w", port, err)
	}
	return nil
}

// RemoveListener removes a port from the frontend_listeners map
func (l *Loader) RemoveListener(port uint16) error {
	if l.objs == nil {
		return nil
	}
	key := (port << 8) | (port >> 8)
	if err := l.objs.FrontendListeners.Delete(&key); err != nil {
		return fmt.Errorf("removing listener %d: %w", port, err)
	}
	return nil
}

// Stats represents the metrics collected from the XDP program
type Stats struct {
	Processed  uint64
	Redirected uint64
	Dropped    uint64
	Passed     uint64
	Aborted    uint64
}

// GetStats reads performance metrics from the per-CPU xdp_stats map
func (l *Loader) GetStats() (Stats, error) {
	if l.objs == nil {
		return Stats{}, nil
	}

	var stats Stats
	// Map indices: 0:PROCESSED, 1:REDIRECTED, 2:DROPPED, 3:PASSED, 4:ABORTED
	indices := []uint32{0, 1, 2, 3, 4}
	ptrs := []*uint64{&stats.Processed, &stats.Redirected, &stats.Dropped, &stats.Passed, &stats.Aborted}

	for i, idx := range indices {
		var perCPU []uint64
		if err := l.objs.XdpStats.Lookup(idx, &perCPU); err != nil {
			return stats, err
		}
		// Sum across all CPUs
		for _, val := range perCPU {
			*ptrs[i] += val
		}
	}

	return stats, nil
}
