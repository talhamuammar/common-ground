CREATE TABLE "Follow" (
  "followerId" INTEGER NOT NULL,
  "followingId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Follow_pkey" PRIMARY KEY ("followerId", "followingId")
);

CREATE TABLE "Friendship" (
  "friendOneId" INTEGER NOT NULL,
  "friendTwoId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Friendship_pkey" PRIMARY KEY ("friendOneId", "friendTwoId")
);

CREATE INDEX "Follow_followingId_idx" ON "Follow"("followingId");
CREATE INDEX "Friendship_friendTwoId_idx" ON "Friendship"("friendTwoId");

ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followerId_fkey" FOREIGN KEY ("followerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_followingId_fkey" FOREIGN KEY ("followingId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_friendOneId_fkey" FOREIGN KEY ("friendOneId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_friendTwoId_fkey" FOREIGN KEY ("friendTwoId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Follow" ADD CONSTRAINT "Follow_no_self" CHECK ("followerId" <> "followingId");
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_ordered_pair" CHECK ("friendOneId" < "friendTwoId");
