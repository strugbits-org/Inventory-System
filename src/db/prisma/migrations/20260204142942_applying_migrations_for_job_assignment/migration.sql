-- CreateTable
CREATE TABLE "_JobAssignments" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_JobAssignments_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_JobAssignments_B_index" ON "_JobAssignments"("B");

-- AddForeignKey
ALTER TABLE "_JobAssignments" ADD CONSTRAINT "_JobAssignments_A_fkey" FOREIGN KEY ("A") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_JobAssignments" ADD CONSTRAINT "_JobAssignments_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
