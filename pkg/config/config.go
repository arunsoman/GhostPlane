package config

import (
	"fmt"
	"os"

	"gopkg.in/yaml.v3"
)

type Config struct {
	Version   string   `yaml:"version" json:"version"`
	Backends  []string `yaml:"backends" json:"backends"`
	ProxyAddr string   `yaml:"proxy_addr" json:"proxy_addr"`
	AdminAddr string   `yaml:"admin_addr" json:"admin_addr"`
}

func Load(path string) (*Config, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("failed to read config file: %v", err)
	}

	cfg := Default()
	if err := yaml.Unmarshal(data, cfg); err != nil {
		return nil, fmt.Errorf("failed to parse config file: %v", err)
	}

	return cfg, nil
}

func Default() *Config {
	return &Config{
		Version:   "v1",
		Backends:  []string{"http://localhost:8081", "http://localhost:8082"},
		ProxyAddr: ":8080",
		AdminAddr: ":8081",
	}
}
