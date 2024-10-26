-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "caption" TEXT NOT NULL,
    "image" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
