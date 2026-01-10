import re
import yaml

def parse_nginx_config(config_text: str) -> dict:
    """
    Simulates parsing Nginx config to extract key metadata for NLB+.
    In a real scenario, this would use a robust parser or LLM.
    """
    metadata = {
        "upstreams": [],
        "servers": []
    }
    
    # Extract upstreams
    upstream_matches = re.finditer(r'upstream\s+(\w+)\s*\{(.*?)\}', config_text, re.DOTALL)
    for match in upstream_matches:
        name = match.group(1)
        body = match.group(2)
        # Match server IP:PORT;
        servers = re.findall(r'server\s+([\d\.\:]+)', body)
        metadata["upstreams"].append({"name": name, "servers": servers})
        
    # Extract servers - searching for top-level server blocks
    # This is a simplification: it matches until a closing brace that is followed by 'server' or end of string
    server_matches = re.finditer(r'server\s*\{(.*?)\}(?=\s*server|\s*$)', config_text, re.DOTALL)
    for match in server_matches:
        body = match.group(1)
        listen = re.search(r'listen\s+(\d+)', body)
        server_name = re.search(r'server_name\s+([\w\.]+)', body)
        
        locations = []
        # Match location path { ... }
        loc_matches = re.finditer(r'location\s+([/\w\*]+)\s*\{(.*?)\}', body, re.DOTALL)
        for l_match in loc_matches:
            path = l_match.group(1)
            l_body = l_match.group(2)
            proxy_pass = re.search(r'proxy_pass\s+http://(\w+)', l_body)
            if proxy_pass:
                locations.append({"path": path, "backend": proxy_pass.group(1)})
                
        if locations: # Only add if we found something useful
            metadata["servers"].append({
                "port": int(listen.group(1)) if listen else 80,
                "host": server_name.group(1) if server_name else "localhost",
                "routes": locations
            })
        
    return metadata

def translate_to_nlb_plus(nginx_metadata: dict) -> str:
    """
    Translates Nginx metadata into NLB+ YAML configuration.
    """
    nlb_config = {
        "version": "v1",
        "load_balancer": {
            "services": []
        }
    }
    
    for server in nginx_metadata["servers"]:
        for route in server["routes"]:
            # Find upstream matching the backend
            backend_url = f"http://{route['backend']}"
            for upstream in nginx_metadata["upstreams"]:
                if upstream["name"] == route["backend"]:
                    # In NLB+, we might map this to multiple endpoints
                    backend_url = [f"http://{s}" for s in upstream["servers"]]
                    break
            
            nlb_config["load_balancer"]["services"].append({
                "name": f"svc-{route['backend']}",
                "route": route["path"],
                "backends": backend_url if isinstance(backend_url, list) else [backend_url]
            })
            
    return yaml.dump(nlb_config, sort_keys=False)

def migrate_nginx_config(config_text: str) -> str:
    """
    The main tool function for the Copilot agent.
    """
    metadata = parse_nginx_config(config_text)
    return translate_to_nlb_plus(metadata)
