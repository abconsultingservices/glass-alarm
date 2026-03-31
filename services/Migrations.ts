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

-- 4. Routine Schedules
CREATE TABLE IF NOT EXISTS routine_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sguid TEXT NOT NULL UNIQUE,
    rguid TEXT NOT NULL,
    uguid TEXT NOT NULL,             -- Added
    gguid TEXT NOT NULL,             -- Added
    type TEXT CHECK(type IN ('daily', 'weekdays', 'weekends', 'custom')) NOT NULL,
    customDays TEXT,
    isActive INTEGER DEFAULT 1,
    startDate TEXT NOT NULL,
    startTime TEXT NOT NULL,
    endDate TEXT,
    endTime TEXT,
    frequencyHours INTEGER,       
    maxOccurrences INTEGER,       
    createDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    createdBy TEXT NOT NULL,
    lastModifiedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lastModifiedBy TEXT NOT NULL,
    FOREIGN KEY(rguid) REFERENCES routines(rguid) ON DELETE CASCADE,
    FOREIGN KEY(uguid) REFERENCES users(uguid),
    FOREIGN KEY(gguid) REFERENCES groups(gguid) ON DELETE CASCADE
);

-- 5. Routine Exceptions
CREATE TABLE IF NOT EXISTS routine_exceptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reguid TEXT NOT NULL UNIQUE,
    rguid TEXT NOT NULL,
    uguid TEXT NOT NULL,             -- Added
    gguid TEXT NOT NULL,             -- Added
    instanceDate TEXT NOT NULL,
    instanceIndex INTEGER NOT NULL DEFAULT 0, 
    createDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    createdBy TEXT NOT NULL,
    FOREIGN KEY(rguid) REFERENCES routines(rguid) ON DELETE CASCADE,
    FOREIGN KEY(uguid) REFERENCES users(uguid),
    FOREIGN KEY(gguid) REFERENCES groups(gguid) ON DELETE CASCADE
);

-- 6. Routine Instances
CREATE TABLE IF NOT EXISTS routine_instances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    riguid TEXT NOT NULL UNIQUE,
    rguid TEXT NOT NULL,             -- Linked to Routine Header
    uguid TEXT NOT NULL,
    gguid TEXT NOT NULL,
    instanceDate TEXT NOT NULL,      -- e.g., '2026-03-29'
    instanceIndex INTEGER DEFAULT 0, -- For routines that happen multiple times a day
    isComplete INTEGER DEFAULT 0,
    startTime TEXT NOT NULL,
    createDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    createdBy TEXT NOT NULL,
    FOREIGN KEY(rguid) REFERENCES routines(rguid) ON DELETE CASCADE,
    FOREIGN KEY(uguid) REFERENCES users(uguid),
    FOREIGN KEY(gguid) REFERENCES groups(gguid) ON DELETE CASCADE
);

-- 7. Ringtones Table
CREATE TABLE IF NOT EXISTS ringtones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rtguid TEXT NOT NULL UNIQUE,
    uguid TEXT NOT NULL,             -- Added
    gguid TEXT NOT NULL,             -- Added
    name TEXT NOT NULL,
    fileName TEXT NOT NULL,
    isActive INTEGER DEFAULT 1,
    createDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    createdBy TEXT NOT NULL,
    lastModifiedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lastModifiedBy TEXT NOT NULL,
    FOREIGN KEY(uguid) REFERENCES users(uguid),
    FOREIGN KEY(gguid) REFERENCES groups(gguid) ON DELETE CASCADE
);

-- 8. Routine Tasks
CREATE TABLE IF NOT EXISTS routine_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rtguid TEXT NOT NULL UNIQUE,
    rguid TEXT NOT NULL,
    uguid TEXT NOT NULL,             -- Added
    gguid TEXT NOT NULL,             -- Added
    text TEXT NOT NULL,
    displayOrder INTEGER NOT NULL,
    isComplete INTEGER DEFAULT 0,
    createDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    createdBy TEXT NOT NULL,
    lastModifiedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    lastModifiedBy TEXT NOT NULL,
    FOREIGN KEY(rguid) REFERENCES routines(rguid) ON DELETE CASCADE,
    FOREIGN KEY(uguid) REFERENCES users(uguid),
    FOREIGN KEY(gguid) REFERENCES groups(gguid) ON DELETE CASCADE
);

-- 9. New Task Instances Table
-- This is where the actual "Checking off" happens
CREATE TABLE IF NOT EXISTS task_instances (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tiguid TEXT NOT NULL UNIQUE,
    riguid TEXT NOT NULL,            -- Links to the specific Routine Instance for that day
    rtguid TEXT NOT NULL,            -- Links back to the Master Routine Task
    uguid TEXT NOT NULL,
    isComplete INTEGER DEFAULT 0,    -- This is the UNIQUE completion state for TODAY
    lastModifiedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(riguid) REFERENCES routine_instances(riguid) ON DELETE CASCADE,
    FOREIGN KEY(rtguid) REFERENCES routine_tasks(rtguid) ON DELETE CASCADE,
    FOREIGN KEY(uguid) REFERENCES users(uguid)
);
`;