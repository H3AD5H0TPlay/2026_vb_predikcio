-- src/db/schema.sql

CREATE TABLE IF NOT EXISTS fifa_rankings (
    team_name TEXT PRIMARY KEY,
    fifa_points REAL NOT NULL,
    fifa_rank INTEGER NOT NULL,
    group_id TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_home TEXT NOT NULL,
    team_away TEXT NOT NULL,
    goals_home INTEGER NOT NULL,
    goals_away INTEGER NOT NULL,
    stage TEXT NOT NULL CHECK(stage IN ('group', 'r32', 'r16', 'qf', 'sf', 'final')),
    group_id TEXT,
    match_date DATE NOT NULL,
    yellow_home INTEGER DEFAULT 0,
    yellow_away INTEGER DEFAULT 0,
    red_home INTEGER DEFAULT 0,
    red_away INTEGER DEFAULT 0,
    aet BOOLEAN DEFAULT 0,
    penalties BOOLEAN DEFAULT 0,
    penalty_winner TEXT
);

CREATE TABLE IF NOT EXISTS team_state (
    team_name TEXT PRIMARY KEY,
    elo REAL NOT NULL,
    attack_strength REAL DEFAULT 1.0,
    defense_strength REAL DEFAULT 1.0,
    matches_played INTEGER DEFAULT 0,
    eliminated BOOLEAN DEFAULT 0,
    champion_prob REAL DEFAULT 0.0,
    finalist_prob REAL DEFAULT 0.0,
    sf_prob REAL DEFAULT 0.0,
    group_prob REAL DEFAULT 0.0
);
