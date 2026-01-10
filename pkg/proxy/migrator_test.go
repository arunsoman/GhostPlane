package proxy

import (
	"reflect"
	"testing"
)

func TestMigrator_ParseNginx(t *testing.T) {
	m := NewMigrator()
	input := `
		server {
			location /api/v1 {
				proxy_pass http://backend1:8080;
			}
			location /static/ {
				proxy_set_header X-Real-IP $remote_addr;
				proxy_pass http://cdn_server;
			}
		}
	`
	expected := []ConfigRoute{
		{Path: "/api/v1", Targets: []string{"http://backend1:8080"}, Priority: 10},
		{Path: "/static/", Targets: []string{"http://cdn_server"}, Priority: 10},
	}

	results := m.ParseNginx(input)
	if !reflect.DeepEqual(results, expected) {
		t.Errorf("Nginx mismatch.\nExpected: %+v\nGot: %+v", expected, results)
	}
}

func TestMigrator_ParseApache(t *testing.T) {
	m := NewMigrator()
	input := `
		<VirtualHost *:80>
			ProxyPass "/app" "http://legacy_app:7070"
			ProxyPass /shop http://magento_node:8080
			ProxyPassReverse /shop http://magento_node:8080
		</VirtualHost>
	`
	expected := []ConfigRoute{
		{Path: "/app", Targets: []string{"http://legacy_app:7070"}, Priority: 10},
		{Path: "/shop", Targets: []string{"http://magento_node:8080"}, Priority: 10},
	}

	results := m.ParseApache(input)
	if !reflect.DeepEqual(results, expected) {
		t.Errorf("Apache mismatch.\nExpected: %+v\nGot: %+v", expected, results)
	}
}
