import pytest
import yaml
from src.tools.migration import migrate_nginx_config

def test_migrate_nginx_simple():
    nginx_conf = """
    upstream backend_nodes {
        server 10.0.0.1:8080;
        server 10.0.0.2:8080;
    }

    server {
        listen 80;
        server_name example.com;

        location /api {
            proxy_pass http://backend_nodes;
        }
    }
    """
    
    result_yaml = migrate_nginx_config(nginx_conf)
    config = yaml.safe_load(result_yaml)
    
    assert config["version"] == "v1"
    services = config["load_balancer"]["services"]
    assert len(services) == 1
    assert services[0]["route"] == "/api"
    assert "http://10.0.0.1:8080" in services[0]["backends"]
    assert "http://10.0.0.2:8080" in services[0]["backends"]

def test_migrate_nginx_no_upstream():
    nginx_conf = """
    server {
        listen 80;
        location / {
            proxy_pass http://direct_backend;
        }
    }
    """
    result_yaml = migrate_nginx_config(nginx_conf)
    config = yaml.safe_load(result_yaml)
    
    assert config["load_balancer"]["services"][0]["backends"] == ["http://direct_backend"]

def test_migration_parity_e2e():
    """
    E2E Nginx Migration Test as specified in the implementation plan.
    Checks for route parity.
    """
    nginx_conf = """
    server {
        listen 443;
        server_name api.nlb.plus;
        location /v1 {
            proxy_pass http://api_v1;
        }
        location /v2 {
            proxy_pass http://api_v2;
        }
    }
    """
    result_yaml = migrate_nginx_config(nginx_conf)
    config = yaml.safe_load(result_yaml)
    
    routes = [s["route"] for s in config["load_balancer"]["services"]]
    assert "/v1" in routes
    assert "/v2" in routes
    
    backends = [s["backends"][0] for s in config["load_balancer"]["services"]]
    assert "http://api_v1" in backends
    assert "http://api_v2" in backends
