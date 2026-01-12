export interface Template {
    metadata: {
        id: string;
        name: string;
        category: string;
        difficulty: string;
        description: string;
        icon: string;
        tags: string[];
        author: string;
        version: string;
    };
    architecture: {
        layers: string[];
        components: string[];
        diagram: string;
    };
    parameters: Parameter[];
}

export interface Parameter {
    name: string;
    type: 'ip' | 'ip_list' | 'integer' | 'string' | 'boolean' | 'enum';
    required: boolean;
    description: string;
    default?: any;
    secret?: boolean;
    options?: string[];
}

export interface DeploymentStatus {
    id: string;
    status: 'pending' | 'deploying' | 'active' | 'failed' | 'dry-run';
    progress: number;
    errors?: string[];
}
