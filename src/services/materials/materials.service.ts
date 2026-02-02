import { prisma } from '../../db/db.service.js';

export class MaterialsService {
    /**
     * Get base materials for dropdowns
     * Returns active materials with only id and name fields.
     */
    async getBaseMaterialsForDropdown() {
        return prisma.material.findMany({
            where: {
                isActive: true,
            },
            select: {
                id: true,
                name: true,
            },
            orderBy: {
                name: 'asc',
            },
        });
    }
}

export default new MaterialsService();