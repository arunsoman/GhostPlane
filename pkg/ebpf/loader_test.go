package ebpf

import (
	"testing"
)

func TestNewLoader(t *testing.T) {
	loader := NewLoader("eth0", []string{"1.1.1.1"}, []uint16{80})
	if loader.iface != "eth0" {
		t.Errorf("Expected iface eth0, got %s", loader.iface)
	}
	if len(loader.backends) != 1 {
		t.Errorf("Expected 1 backend, got %d", len(loader.backends))
	}
	if len(loader.listeners) != 1 {
		t.Errorf("Expected 1 listener, got %d", len(loader.listeners))
	}
}

func TestLoader_PopulateBackends_InvalidIP(t *testing.T) {
	loader := NewLoader("lo", []string{"invalid-ip"}, nil)
	err := loader.populateBackends()
	if err == nil {
		t.Error("Expected error for invalid IP")
	}
}

func TestLoader_PopulateBackends_IPv6(t *testing.T) {
	loader := NewLoader("lo", []string{"2001:db8::1"}, nil)
	err := loader.populateBackends()
	if err == nil {
		t.Error("Expected error for IPv6 address (only IPv4 supported in XDP lb)")
	}
}

func TestLoader_PopulateBackends_Success(t *testing.T) {
	l := NewLoader("eth0", []string{"1.1.1.1", "2.2.2.2"}, nil)
	// populateBackends should return nil because l.objs is nil (test mode)
	if err := l.populateBackends(); err != nil {
		t.Errorf("populateBackends() error = %v", err)
	}
}

func TestLoader_Close(t *testing.T) {
	l := NewLoader("eth0", nil, nil)
	// Close with nil link and objs should pass
	if err := l.Close(); err != nil {
		t.Errorf("Close() error = %v", err)
	}
}
