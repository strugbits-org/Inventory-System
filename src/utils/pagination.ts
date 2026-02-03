import { PrismaClient } from '@prisma/client';

export async function paginate<T>(
  model: any, // This will be like db.prisma.materialVariant (or any other Prisma model)
  params: {
    page: number;
    limit: number;
    where?: any; // Prisma's WhereInput
    orderBy?: any; // Prisma's OrderByWithRelationInput (or array of orderBy)
    include?: any; // Prisma's Include
    select?: any; // Prisma's Select
  }
) {
  const { page, limit, where, orderBy, include, select } = params;
  const skip = (page - 1) * limit;

  const [totalRecords, data] = await Promise.all([
    model.count({ where }),
    model.findMany({
      skip,
      take: limit,
      where,
      orderBy,
      include,
      select,
    }),
  ]);

  const totalPages = Math.ceil(totalRecords / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  return {
    data,
    meta: {
      currentPage: page,
      limit,
      totalRecords,
      totalPages,
      hasNextPage,
      hasPrevPage,
    },
  };
}
