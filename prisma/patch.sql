BEGIN TRANSACTION;

-- 1) Переименуем старую таблицу
ALTER TABLE players_fifa RENAME TO players_fifa_old;

-- 2) Создадим новую с синтетическим PK
CREATE TABLE players_fifa (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  player_id        INTEGER,
  age              REAL,
  date_of_birth    TEXT,
  first_name       TEXT,
  club             TEXT,
  shirt_number     INTEGER,
  position         TEXT,
  full_name        TEXT,
  last_name        TEXT,
  fifa_goals       INTEGER DEFAULT 0,
  fifa_physic      INTEGER DEFAULT 100,
  height           INTEGER DEFAULT 170,
  gk_skill         INTEGER DEFAULT 100,
  rb_skill         INTEGER DEFAULT 100,
  cb_skill         INTEGER DEFAULT 100,
  lb_skill         INTEGER DEFAULT 100,
  rwb_skill        INTEGER DEFAULT 100,
  dm_skill         INTEGER DEFAULT 100,
  lwb_skill        INTEGER DEFAULT 100,
  rm_skill         INTEGER DEFAULT 100,
  cm_skill         INTEGER DEFAULT 100,
  lm_skill         INTEGER DEFAULT 100,
  rw_skill         INTEGER DEFAULT 100,
  am_skill         INTEGER DEFAULT 100,
  lw_skill         INTEGER DEFAULT 100,
  st_skill         INTEGER DEFAULT 100,
  stamina          INTEGER DEFAULT 100,
  defending        INTEGER DEFAULT 100,
  shooting         INTEGER DEFAULT 100,
  pass             INTEGER DEFAULT 100,
  goalkeeper_save  INTEGER DEFAULT 100
);

-- 3) Перельём данные (порядок колонок соблюдён)
INSERT INTO players_fifa (
  player_id, age, date_of_birth, first_name, club, shirt_number, position, full_name, last_name,
  fifa_goals, fifa_physic, height, gk_skill, rb_skill, cb_skill, lb_skill, rwb_skill, dm_skill,
  lwb_skill, rm_skill, cm_skill, lm_skill, rw_skill, am_skill, lw_skill, st_skill, stamina,
  defending, shooting, pass, goalkeeper_save
)
SELECT
  player_id, age, date_of_birth, first_name, club, shirt_number, position, full_name, last_name,
  fifa_goals, fifa_physic, height, gk_skill, rb_skill, cb_skill, lb_skill, rwb_skill, dm_skill,
  lwb_skill, rm_skill, cm_skill, lm_skill, rw_skill, am_skill, lw_skill, st_skill, stamina,
  defending, shooting, pass, goalkeeper_save
FROM players_fifa_old;

-- 4) (опционально) удалить старую
DROP TABLE players_fifa_old;

COMMIT;
