export const SEED_DATA = `
-- Disable FKs to allow the initial cross-reference insert
PRAGMA foreign_keys = OFF;

-- Insert placeholder Group
INSERT OR IGNORE INTO groups (
    gguid, owner_uguid, name, createdBy, lastModifiedBy
) VALUES (
    'default-group-guid', 'default-user-guid', 'My Group', 'default-user-guid', 'default-user-guid'
);

-- Insert placeholder User
INSERT OR IGNORE INTO users (
    uguid, gguid, firstName, lastName, email, role, createdBy, lastModifiedBy
) VALUES (
    'default-user-guid', 'default-group-guid', 'default', 'user', 'default@localhost.invalid', 'owner', 'default-user-guid', 'default-user-guid'
);

-- Re-enable FKs
PRAGMA foreign_keys = ON;
`;

export const SCHEMA_V1 = `
PRAGMA foreign_keys = ON;

-- 1. Groups Table
CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    gguid TEXT NOT NULL UNIQUE,
    owner_uguid TEXT NOT NULL,
    name TEXT NOT NULL,
    createDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    createdBy TEXT NOT NULL,
    lastModifiedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lastModifiedBy TEXT NOT NULL
);

-- 2. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    uguid TEXT NOT NULL UNIQUE,
    gguid TEXT NOT NULL,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    email TEXT NOT NULL,
    role TEXT CHECK(role IN ('owner', 'contributor', 'viewer')) NOT NULL,
    isActive INTEGER DEFAULT 1,
    createDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    createdBy TEXT NOT NULL,
    lastModifiedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lastModifiedBy TEXT NOT NULL,
    FOREIGN KEY(gguid) REFERENCES groups(gguid)
);

-- 3. Routines Header
CREATE TABLE IF NOT EXISTS routines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rguid TEXT NOT NULL UNIQUE,
    uguid TEXT NOT NULL,
    gguid TEXT NOT NULL,
    name TEXT NOT NULL,
    isActive INTEGER DEFAULT 1,
    duration INTEGER, 
    createDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    createdBy TEXT NOT NULL,
    lastModifiedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lastModifiedBy TEXT NOT NULL,
    FOREIGN KEY(uguid) REFERENCES users(uguid),
    FOREIGN KEY(gguid) REFERENCES groups(gguid) ON DELETE CASCADE
);

-- 4. Routine Schedules (Updated with End Boundaries)
CREATE TABLE IF NOT EXISTS routine_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sguid TEXT NOT NULL UNIQUE,
    rguid TEXT NOT NULL,
    type TEXT CHECK(type IN ('daily', 'weekdays', 'weekends', 'custom')) NOT NULL,
    customDays TEXT,
    isActive INTEGER DEFAULT 1,
    startDate TEXT NOT NULL,      -- YYYY-MM-DD
    startTime TEXT NOT NULL,      -- HH:mm
    endDate TEXT,                 -- YYYY-MM-DD (New Column)
    endTime TEXT,                 -- HH:mm (New Column)
    frequencyHours INTEGER,       
    maxOccurrences INTEGER,       
    createDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    createdBy TEXT NOT NULL,
    lastModifiedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lastModifiedBy TEXT NOT NULL,
    FOREIGN KEY(rguid) REFERENCES routines(rguid) ON DELETE CASCADE
);

-- 5. Routine Exceptions
CREATE TABLE IF NOT EXISTS routine_exceptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reguid TEXT NOT NULL UNIQUE,
    rguid TEXT NOT NULL,
    instanceDate TEXT NOT NULL,      -- YYYY-MM-DD
    instanceIndex INTEGER NOT NULL DEFAULT 0, 
    createDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    createdBy TEXT NOT NULL,
    FOREIGN KEY(rguid) REFERENCES routines(rguid) ON DELETE CASCADE
);

-- 6. Routine Instances
CREATE TABLE IF NOT EXISTS routine_instances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    riguid TEXT NOT NULL UNIQUE,
    sguid TEXT NOT NULL,
    isComplete INTEGER DEFAULT 0,
    instanceDate TEXT NOT NULL,
    startTime TEXT NOT NULL,
    duration INTEGER NOT NULL,
    createDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    createdBy TEXT NOT NULL,
    FOREIGN KEY(sguid) REFERENCES routine_schedules(sguid) ON DELETE CASCADE
);

-- 7. Ringtones Table
CREATE TABLE IF NOT EXISTS ringtones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rtguid TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    fileName TEXT NOT NULL,
    isActive INTEGER DEFAULT 1,
    createDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    createdBy TEXT NOT NULL,
    lastModifiedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lastModifiedBy TEXT NOT NULL
);
`;