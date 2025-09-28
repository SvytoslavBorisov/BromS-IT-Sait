-- CreateTable
CREATE TABLE "players_fifa" (
    "id" TEXT NOT NULL,
    "player_id" INTEGER,
    "age" DOUBLE PRECISION,
    "date_of_birth" TEXT,
    "first_name" TEXT,
    "teamId" TEXT,
    "shirt_number" INTEGER,
    "position" TEXT,
    "full_name" TEXT,
    "last_name" TEXT,
    "fifa_goals" INTEGER DEFAULT 0,
    "fifa_physic" INTEGER DEFAULT 100,
    "height" INTEGER DEFAULT 170,
    "gk_skill" INTEGER DEFAULT 100,
    "rb_skill" INTEGER DEFAULT 100,
    "cb_skill" INTEGER DEFAULT 100,
    "lb_skill" INTEGER DEFAULT 100,
    "rwb_skill" INTEGER DEFAULT 100,
    "dm_skill" INTEGER DEFAULT 100,
    "lwb_skill" INTEGER DEFAULT 100,
    "rm_skill" INTEGER DEFAULT 100,
    "cm_skill" INTEGER DEFAULT 100,
    "lm_skill" INTEGER DEFAULT 100,
    "rw_skill" INTEGER DEFAULT 100,
    "am_skill" INTEGER DEFAULT 100,
    "lw_skill" INTEGER DEFAULT 100,
    "st_skill" INTEGER DEFAULT 100,
    "stamina" INTEGER DEFAULT 100,
    "defending" INTEGER DEFAULT 100,
    "shooting" INTEGER DEFAULT 100,
    "pass" INTEGER DEFAULT 100,
    "goalkeeper_save" INTEGER DEFAULT 100,

    CONSTRAINT "players_fifa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "title" TEXT,
    "liga" TEXT,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "players_fifa" ADD CONSTRAINT "players_fifa_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
