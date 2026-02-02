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
                materialVariants: {
                    where: {
                        isActive: true
                    },
                    select: {
                        regularPrice: true,
                        preferredPrice: true,
                    }
                }
            },
            orderBy: {
                name: 'asc',
            },
        }).then(materials => {
            return materials.map(material => {
                const minRegularPrice = material.materialVariants.length > 0
                    ? Math.min(...material.materialVariants.map(v => v.regularPrice.toNumber()))
                    : null;
                const minPreferredPrice = material.materialVariants.length > 0
                    ? Math.min(...material.materialVariants.map(v => v.preferredPrice.toNumber()))
                    : null;

                return {
                    id: material.id,
                    name: material.name,
                    minRegularPrice: minRegularPrice,
                    minPreferredPrice: minPreferredPrice,
                };
            });
        });
    }
}

export default new MaterialsService();
