export interface JobTemplate {
    name: string;
    description: string;
    requirements: {
        materialType: string;
        requiredCount: number;
    }[];
}

export const jobTemplates: { [key: string]: JobTemplate } = {
    'standard': {
        name: 'Standard Job',
        description: 'A standard job requiring a base coat, top coat, and broadcast.',
        requirements: [
            { materialType: 'base coat', requiredCount: 1 },
            { materialType: 'top coat', requiredCount: 1 },
            { materialType: 'broadcast', requiredCount: 1 },
        ],
    },
};
