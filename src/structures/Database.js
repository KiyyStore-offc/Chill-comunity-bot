const BetterSqlite3 = require('better-sqlite3');
const path = require('path');

const db = new BetterSqlite3(path.join(process.cwd(), 'database.db'));


db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('cache_size = -32000');
db.pragma('temp_store = MEMORY');
db.pragma('mmap_size = 1073741824');
db.pragma('page_size = 4096');


const serialize = (data) => JSON.stringify(data);
const deserialize = (data, fallback = []) => {
    try {
        if (!data) return fallback;
        return typeof data === 'string' ? JSON.parse(data) : data;
    } catch (e) {
        return fallback;
    }
};

// Prepared statement cache for performance
const stmtCache = new Map();
const getStatement = (sql) => {
    if (!stmtCache.has(sql)) {
        stmtCache.set(sql, db.prepare(sql));
    }
    return stmtCache.get(sql);
};


const tables = [
    {
        name: 'profiles',
        schema: `
            userId TEXT PRIMARY KEY,
            bio TEXT DEFAULT 'No bio set',
            badges TEXT DEFAULT '[]',
            friends TEXT DEFAULT '[]',
            marry TEXT DEFAULT 'None',
            rank TEXT DEFAULT 'User',
            deniedCommands TEXT DEFAULT '[]',
            allowedCommands TEXT DEFAULT '[]'
        `
    },
    {
        name: 'liked',
        schema: `
            userId TEXT PRIMARY KEY,
            songs TEXT DEFAULT '[]'
        `
    },
    {
        name: 'noprefix',
        schema: `
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId TEXT,
            guildId TEXT,
            noprefix INTEGER DEFAULT 0,
            expiresAt TEXT
        `
    },
    {
        name: 'blacklist',
        schema: `
            userId TEXT PRIMARY KEY,
            reason TEXT DEFAULT 'No reason provided',
            developer TEXT
        `
    },
    {
        name: 'prefixes',
        schema: `
            guildId TEXT PRIMARY KEY,
            prefix TEXT
        `
    },
    {
        name: 'rankPermissions',
        schema: `
            rank TEXT PRIMARY KEY,
            allowedCommands TEXT DEFAULT '[]',
            deniedCommands TEXT DEFAULT '[]'
        `
    },
    {
        name: 'ignorechannels',
        schema: `
            guildId TEXT,
            channelId TEXT,
            PRIMARY KEY (guildId, channelId)
        `
    },
    {
        name: 'userpreferences',
        schema: `
            userId TEXT PRIMARY KEY,
            musicSource TEXT DEFAULT 'ytmsearch'
        `
    },
    {
        name: 'setup',
        schema: `
            guildId TEXT PRIMARY KEY,
            channelId TEXT,
            messageId TEXT,
            voiceChannelId TEXT
        `
    },
    {
        name: 'twofourseven',
        schema: `
            guildId TEXT PRIMARY KEY,
            textId TEXT,
            voiceId TEXT
        `
    },
    {
        name: 'autorole',
        schema: `
            guildId TEXT PRIMARY KEY,
            roles TEXT DEFAULT '[]'
        `
    },
    {
        name: 'voicerole',
        schema: `
            guildId TEXT PRIMARY KEY,
            roleId TEXT,
            voiceChannelId TEXT
        `
    },
    {
        name: 'vcstatus',
        schema: `
            guildId TEXT PRIMARY KEY,
            status TEXT
        `
    },
    {
        name: 'reboot',
        schema: `
            id TEXT PRIMARY KEY,
            channelId TEXT,
            messageId TEXT,
            guildId TEXT
        `
    },
    {
        name: 'invitetracking',
        schema: `
            guildId TEXT PRIMARY KEY,
            enabled INTEGER DEFAULT 0,
            channelId TEXT
        `
    },
    {
        name: 'invites',
        schema: `
            guildId TEXT,
            userId TEXT,
            invites INTEGER DEFAULT 0,
            fake INTEGER DEFAULT 0,
            leaves INTEGER DEFAULT 0,
            bonus INTEGER DEFAULT 0,
            PRIMARY KEY (guildId, userId)
        `
    },
    {
        name: 'giveaways',
        schema: `
            messageId TEXT PRIMARY KEY,
            guildId TEXT,
            channelId TEXT,
            hostId TEXT,
            prize TEXT,
            winnerCount INTEGER,
            endTime INTEGER,
            ended INTEGER DEFAULT 0,
            participants TEXT DEFAULT '[]',
            createdAt INTEGER
        `
    },
    {
        name: 'invite_logs',
        schema: `
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            guildId TEXT,
            userId TEXT,
            inviterId TEXT,
            inviteCode TEXT,
            joinedAt TEXT,
            leftAt TEXT,
            isLeft INTEGER DEFAULT 0,
            isFake INTEGER DEFAULT 0,
            isRejoin INTEGER DEFAULT 0,
            cleared INTEGER DEFAULT 0,
            clearedAt TEXT
        `
    },
    {
        name: 'automod',
        schema: `
            guildId TEXT PRIMARY KEY,
            antiLink INTEGER DEFAULT 0,
            antiInvite INTEGER DEFAULT 0,
            antiSpam INTEGER DEFAULT 0,
            antiMention INTEGER DEFAULT 0,
            antiCaps INTEGER DEFAULT 0,
            antiEmoji INTEGER DEFAULT 0,
            antiNsfw INTEGER DEFAULT 0,
            maxMentions INTEGER DEFAULT 5,
            maxEmoji INTEGER DEFAULT 10,
            whitelistRoles TEXT DEFAULT '[]',
            whitelistChannels TEXT DEFAULT '[]',
            whitelistUsers TEXT DEFAULT '[]',
            logChannel TEXT,
            action TEXT DEFAULT 'delete',
            heatSettings TEXT DEFAULT '{}',
            punishments TEXT DEFAULT '{}'
        `
    }
];

tables.forEach(table => {
    db.prepare(`CREATE TABLE IF NOT EXISTS ${table.name} (${table.schema})`).run();

    if (table.name === 'profiles') {
        const columns = db.prepare('PRAGMA table_info(profiles)').all();
        const columnNames = columns.map(c => c.name);
        const required = ['rank', 'deniedCommands', 'allowedCommands'];
        required.forEach(col => {
            if (!columnNames.includes(col)) {
                const type = col === 'rank' ? 'TEXT DEFAULT "User"' : 'TEXT DEFAULT "[]"';
                db.prepare(`ALTER TABLE profiles ADD COLUMN ${col} ${type}`).run();
            }
        });
    }

    if (table.name === 'reboot') {
        const columns = db.prepare('PRAGMA table_info(reboot)').all();
        const columnNames = columns.map(c => c.name);
        if (!columnNames.includes('guildId')) {
            db.prepare('ALTER TABLE reboot ADD COLUMN guildId TEXT').run();
        }
    }

    if (table.name === 'automod') {
        const columns = db.prepare('PRAGMA table_info(automod)').all();
        const columnNames = columns.map(c => c.name);
        if (!columnNames.includes('punishments')) {
            db.prepare('ALTER TABLE automod ADD COLUMN punishments TEXT DEFAULT "{}"').run();
        }
        if (!columnNames.includes('heatSettings')) {
            db.prepare('ALTER TABLE automod ADD COLUMN heatSettings TEXT DEFAULT "{}"').run();
        }
        if (!columnNames.includes('maxEmoji')) {
            db.prepare('ALTER TABLE automod ADD COLUMN maxEmoji INTEGER DEFAULT 10').run();
        }
    }
});


const indexes = [
    'CREATE INDEX IF NOT EXISTS idx_profiles_userId ON profiles(userId)',
    'CREATE INDEX IF NOT EXISTS idx_liked_userId ON liked(userId)',
    'CREATE INDEX IF NOT EXISTS idx_noprefix_userId_guildId ON noprefix(userId, guildId)',
    'CREATE INDEX IF NOT EXISTS idx_blacklist_userId ON blacklist(userId)',
    'CREATE INDEX IF NOT EXISTS idx_prefixes_guildId ON prefixes(guildId)',
    'CREATE INDEX IF NOT EXISTS idx_ignorechannels_guildId ON ignorechannels(guildId)',
    'CREATE INDEX IF NOT EXISTS idx_userpreferences_userId ON userpreferences(userId)',
    'CREATE INDEX IF NOT EXISTS idx_setup_guildId ON setup(guildId)',
    'CREATE INDEX IF NOT EXISTS idx_twofourseven_guildId ON twofourseven(guildId)',
    'CREATE INDEX IF NOT EXISTS idx_autorole_guildId ON autorole(guildId)',
    'CREATE INDEX IF NOT EXISTS idx_voicerole_guildId ON voicerole(guildId)',
    'CREATE INDEX IF NOT EXISTS idx_vcstatus_guildId ON vcstatus(guildId)',
    'CREATE INDEX IF NOT EXISTS idx_invitetracking_guildId ON invitetracking(guildId)',
    'CREATE INDEX IF NOT EXISTS idx_invite_logs_guildId ON invite_logs(guildId)',
    'CREATE INDEX IF NOT EXISTS idx_invite_logs_userId ON invite_logs(userId)',
    'CREATE INDEX IF NOT EXISTS idx_giveaways_guildId ON giveaways(guildId)',
    'CREATE INDEX IF NOT EXISTS idx_giveaways_ended ON giveaways(ended)',
    'CREATE INDEX IF NOT EXISTS idx_invites_guildId_userId ON invites(guildId, userId)'
];

indexes.forEach(index => {
    db.prepare(index).run();
});


const managers = {};

const createManager = (tableName, primaryKey = 'id') => {
    return {
        get: (pkValue) => {
            return db.prepare(`SELECT * FROM ${tableName} WHERE ${primaryKey} = ?`).get(pkValue);
        },
        set: (pkValue, data) => {
            const updates = [];
            const params = [];
            for (const key in data) {
                if (key === primaryKey) continue;
                updates.push(`${key} = ?`);
                let val = data[key];
                if (typeof val === 'object' && val !== null) val = serialize(val);
                params.push(val);
            }

            const exists = db.prepare(`SELECT 1 FROM ${tableName} WHERE ${primaryKey} = ?`).get(pkValue);
            if (exists) {
                params.push(pkValue);
                db.prepare(`UPDATE ${tableName} SET ${updates.join(', ')} WHERE ${primaryKey} = ?`).run(...params);
            } else {
                const keys = [primaryKey, ...Object.keys(data).filter(k => k !== primaryKey)];
                const vals = keys.map(k => {
                    let v = k === primaryKey ? pkValue : data[k];
                    if (typeof v === 'object' && v !== null) v = serialize(v);
                    return v;
                });
                db.prepare(`INSERT INTO ${tableName} (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`).run(...vals);
            }
        },
        delete: (pkValue) => {
            db.prepare(`DELETE FROM ${tableName} WHERE ${primaryKey} = ?`).run(pkValue);
        },
        getAll: () => {
            return db.prepare(`SELECT * FROM ${tableName}`).all();
        }
    };
};

managers.profiles = {
    get: (userId) => {
        const row = db.prepare('SELECT * FROM profiles WHERE userId = ?').get(userId);
        if (!row) return null;
        return {
            ...row,
            badges: deserialize(row.badges),
            friends: deserialize(row.friends),
            deniedCommands: deserialize(row.deniedCommands),
            allowedCommands: deserialize(row.allowedCommands)
        };
    },
    set: (userId, data) => {
        const updates = [];
        const params = [];
        for (const key in data) {
            if (key === 'userId') continue;
            updates.push(`${key} = ?`);
            let val = data[key];
            if (['badges', 'friends', 'deniedCommands', 'allowedCommands'].includes(key)) val = serialize(val);
            params.push(val);
        }

        const exists = db.prepare('SELECT 1 FROM profiles WHERE userId = ?').get(userId);
        if (exists) {
            params.push(userId);
            db.prepare(`UPDATE profiles SET ${updates.join(', ')} WHERE userId = ?`).run(...params);
        } else {
            const keys = ['userId', ...Object.keys(data).filter(k => k !== 'userId')];
            const vals = keys.map(k => {
                let v = k === 'userId' ? userId : data[k];
                if (['badges', 'friends', 'deniedCommands', 'allowedCommands'].includes(k)) v = serialize(v || []);
                return v;
            });
            db.prepare(`INSERT INTO profiles (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`).run(...vals);
        }
    }
};

managers.liked = {
    get: (userId) => {
        const row = db.prepare('SELECT * FROM liked WHERE userId = ?').get(userId);
        return row ? deserialize(row.songs) : [];
    },
    set: (userId, songs) => {
        db.prepare('INSERT OR REPLACE INTO liked (userId, songs) VALUES (?, ?)').run(userId, serialize(songs));
    }
};

managers.noprefix = {
    get: (userId, guildId = 'GLOBAL') => {
        const row = db.prepare('SELECT * FROM noprefix WHERE userId = ? AND guildId = ?').get(userId, guildId);
        if (!row) return null;
        return { ...row, noprefix: !!row.noprefix };
    },
    set: (userId, guildId, status, expiresAt = null) => {
        db.prepare('INSERT OR REPLACE INTO noprefix (userId, guildId, noprefix, expiresAt) VALUES (?, ?, ?, ?)').run(userId, guildId, status ? 1 : 0, expiresAt);
    },
    find: (filter = {}) => {
        let sql = 'SELECT * FROM noprefix';
        const params = [];
        const conditions = [];
        for (const key in filter) {
            conditions.push(`${key} = ?`);
            params.push(typeof filter[key] === 'boolean' ? (filter[key] ? 1 : 0) : filter[key]);
        }
        if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
        return db.prepare(sql).all(...params).map(row => ({ ...row, noprefix: !!row.noprefix }));
    },
    findOne: (filter = {}) => {
        let sql = 'SELECT * FROM noprefix';
        const params = [];
        const conditions = [];
        for (const key in filter) {
            conditions.push(`${key} = ?`);
            params.push(typeof filter[key] === 'boolean' ? (filter[key] ? 1 : 0) : filter[key]);
        }
        if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
        const row = db.prepare(sql).get(...params);
        if (!row) return null;
        return { ...row, noprefix: !!row.noprefix };
    },
    create: (data) => {
        const keys = Object.keys(data);
        const vals = keys.map(k => typeof data[k] === 'boolean' ? (data[k] ? 1 : 0) : (data[k] instanceof Date ? data[k].toISOString() : data[k]));
        db.prepare(`INSERT INTO noprefix (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`).run(...vals);
    },
    updateOne: (filter, data) => {
        let sql = 'UPDATE noprefix SET ';
        const updates = [];
        const params = [];
        for (const key in data) {
            updates.push(`${key} = ?`);
            params.push(typeof data[key] === 'boolean' ? (data[key] ? 1 : 0) : (data[key] instanceof Date ? data[key].toISOString() : data[key]));
        }
        sql += updates.join(', ');
        const conditions = [];
        for (const key in filter) {
            conditions.push(`${key} = ?`);
            params.push(typeof filter[key] === 'boolean' ? (filter[key] ? 1 : 0) : filter[key]);
        }
        if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
        db.prepare(sql).run(...params);
    },
    deleteOne: (filter) => {
        let sql = 'DELETE FROM noprefix';
        const params = [];
        const conditions = [];
        for (const key in filter) {
            conditions.push(`${key} = ?`);
            params.push(typeof filter[key] === 'boolean' ? (filter[key] ? 1 : 0) : filter[key]);
        }
        if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
        db.prepare(sql).run(...params);
    },
    deleteMany: (filter) => {
        let sql = 'DELETE FROM noprefix';
        const params = [];
        const conditions = [];
        for (const key in filter) {
            conditions.push(`${key} = ?`);
            params.push(typeof filter[key] === 'boolean' ? (filter[key] ? 1 : 0) : filter[key]);
        }
        if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
        const res = db.prepare(sql).run(...params);
        return { deletedCount: res.changes };
    },
    findExpired: (now) => {
        return db.prepare('SELECT * FROM noprefix WHERE expiresAt IS NOT NULL AND expiresAt < ?').all(now);
    },
    delete: (id) => {
        db.prepare('DELETE FROM noprefix WHERE id = ?').run(id);
    },
    getGlobal: (userId) => {
        const row = db.prepare('SELECT * FROM noprefix WHERE userId = ? AND guildId = ? AND noprefix = 1').get(userId, 'GLOBAL');
        if (!row) return null;
        if (row.expiresAt && new Date(row.expiresAt) < new Date()) {
            db.prepare('DELETE FROM noprefix WHERE id = ?').run(row.id);
            return null;
        }
        return { ...row, noprefix: !!row.noprefix };
    }
};

managers.blacklist = createManager('blacklist', 'userId');
managers.prefixes = createManager('prefixes', 'guildId');
managers.ignorechannels = {
    get: (guildId, channelId) => {
        return db.prepare('SELECT 1 FROM ignorechannels WHERE guildId = ? AND channelId = ?').get(guildId, channelId);
    },
    getForGuild: (guildId) => {
        return db.prepare('SELECT * FROM ignorechannels WHERE guildId = ?').all(guildId);
    },
    add: (guildId, channelId) => {
        db.prepare('INSERT OR IGNORE INTO ignorechannels (guildId, channelId) VALUES (?, ?)').run(guildId, channelId);
    },
    remove: (guildId, channelId) => {
        db.prepare('DELETE FROM ignorechannels WHERE guildId = ? AND channelId = ?').run(guildId, channelId);
    },
    deleteForGuild: (guildId) => {
        db.prepare('DELETE FROM ignorechannels WHERE guildId = ?').run(guildId);
    }
};
managers.userpreferences = createManager('userpreferences', 'userId');
managers.setup = createManager('setup', 'guildId');
managers.twofourseven = createManager('twofourseven', 'guildId');
managers.autorole = {
    get: (guildId) => {
        const row = db.prepare('SELECT * FROM autorole WHERE guildId = ?').get(guildId);
        if (!row) return null;
        return { ...row, roles: deserialize(row.roles) };
    },
    set: (guildId, roles) => {
        db.prepare('INSERT OR REPLACE INTO autorole (guildId, roles) VALUES (?, ?)').run(guildId, serialize(roles));
    },
    delete: (guildId) => {
        db.prepare('DELETE FROM autorole WHERE guildId = ?').run(guildId);
    }
};
managers.voicerole = createManager('voicerole', 'guildId');
managers.vcstatus = createManager('vcstatus', 'guildId');
managers.reboot = createManager('reboot', 'id');
managers.invitetracking = {
    get: (guildId) => {
        return db.prepare('SELECT * FROM invitetracking WHERE guildId = ?').get(guildId);
    },
    set: (guildId, data) => {
        const updates = [];
        const params = [];
        for (const key in data) {
            updates.push(`${key} = ?`);
            let val = data[key];
            if (typeof val === 'boolean') val = val ? 1 : 0;
            else if (typeof val === 'object' && val !== null) val = serialize(val);
            params.push(val);
        }
        params.push(guildId);
        const exists = db.prepare('SELECT 1 FROM invitetracking WHERE guildId = ?').get(guildId);
        if (exists) {
            db.prepare(`UPDATE invitetracking SET ${updates.join(', ')} WHERE guildId = ?`).run(...params);
        } else {
            const keys = ['guildId', ...Object.keys(data)];
            const vals = [guildId, ...Object.values(data).map(v => {
                if (typeof v === 'boolean') return v ? 1 : 0;
                if (typeof v === 'object' && v !== null) return serialize(v);
                return v;
            })];
            db.prepare(`INSERT INTO invitetracking (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`).run(...vals);
        }
    },
    delete: (guildId) => {
        db.prepare('DELETE FROM invitetracking WHERE guildId = ?').run(guildId);
    }
};

managers.invite_logs = {
    get: (guildId, userId) => {
        return db.prepare('SELECT * FROM invite_logs WHERE guildId = ? AND userId = ? ORDER BY joinedAt DESC LIMIT 1').get(guildId, userId);
    },
    find: (filter = {}) => {
        let sql = 'SELECT * FROM invite_logs';
        const params = [];
        const conditions = [];
        for (const key in filter) {
            if (key === '$ne') continue;
            if (typeof filter[key] === 'object' && filter[key] !== null && filter[key].$ne !== undefined) {
                conditions.push(`${key} != ?`);
                params.push(filter[key].$ne === true ? 1 : (filter[key].$ne === false ? 0 : filter[key].$ne));
            } else {
                conditions.push(`${key} = ?`);
                params.push(typeof filter[key] === 'boolean' ? (filter[key] ? 1 : 0) : filter[key]);
            }
        }
        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }
        return db.prepare(sql).all(...params);
    },
    create: (data) => {
        const keys = Object.keys(data);
        const vals = Object.values(data).map(v => (typeof v === 'boolean' ? (v ? 1 : 0) : v));
        db.prepare(`INSERT INTO invite_logs (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`).run(...vals);
    },
    count: (filter = {}) => {
        let sql = 'SELECT COUNT(*) as count FROM invite_logs';
        const params = [];
        const conditions = [];
        for (const key in filter) {
            conditions.push(`${key} = ?`);
            params.push(typeof filter[key] === 'boolean' ? (filter[key] ? 1 : 0) : filter[key]);
        }
        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }
        const res = db.prepare(sql).get(...params);
        return res ? res.count : 0;
    },
    deleteMany: (filter) => {
        let sql = 'DELETE FROM invite_logs';
        const params = [];
        const conditions = [];
        for (const key in filter) {
            conditions.push(`${key} = ?`);
            params.push(typeof filter[key] === 'boolean' ? (filter[key] ? 1 : 0) : filter[key]);
        }
        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
            db.prepare(sql).run(...params);
        }
    },
    updateMany: (filter = {}, data = {}) => {
        let sql = 'UPDATE invite_logs';
        const updates = [];
        const params = [];
        for (const key in data) {
            updates.push(`${key} = ?`);
            params.push(typeof data[key] === 'boolean' ? (data[key] ? 1 : 0) : data[key]);
        }
        sql += ' SET ' + updates.join(', ');
        const conditions = [];
        for (const key in filter) {
            conditions.push(`${key} = ?`);
            params.push(typeof filter[key] === 'boolean' ? (filter[key] ? 1 : 0) : filter[key]);
        }
        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
        }
        return db.prepare(sql).run(...params);
    },
    update: (guildId, userId, data) => {
        const updates = [];
        const params = [];
        for (const key in data) {
            updates.push(`${key} = ?`);
            params.push(typeof data[key] === 'boolean' ? (data[key] ? 1 : 0) : data[key]);
        }
        params.push(guildId, userId);
        db.prepare(`UPDATE invite_logs SET ${updates.join(', ')} WHERE guildId = ? AND userId = ?`).run(...params);
    }
};
managers.invites = {
    get: (guildId, userId) => {
        return db.prepare('SELECT * FROM invites WHERE guildId = ? AND userId = ?').get(guildId, userId);
    },
    set: (guildId, userId, data) => {
        const row = db.prepare('SELECT 1 FROM invites WHERE guildId = ? AND userId = ?').get(guildId, userId);
        if (row) {
            const updates = [];
            const params = [];
            for (const key in data) {
                updates.push(`${key} = ?`);
                let val = data[key];
                if (typeof val === 'boolean') val = val ? 1 : 0;
                else if (typeof val === 'object' && val !== null) val = serialize(val);
                params.push(val);
            }
            params.push(guildId, userId);
            db.prepare(`UPDATE invites SET ${updates.join(', ')} WHERE guildId = ? AND userId = ?`).run(...params);
        } else {
            const keys = ['guildId', 'userId', ...Object.keys(data)];
            const vals = [guildId, userId, ...Object.values(data).map(v => {
                if (typeof v === 'boolean') return v ? 1 : 0;
                if (typeof v === 'object' && v !== null) return serialize(v);
                return v;
            })];
            db.prepare(`INSERT INTO invites (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`).run(...vals);
        }
    }
};
managers.giveaways = {
    get: (messageId) => {
        const row = db.prepare('SELECT * FROM giveaways WHERE messageId = ?').get(messageId);
        if (!row) return null;
        return { ...row, participants: deserialize(row.participants) };
    },
    set: (messageId, data) => {
        const updates = [];
        const params = [];
        for (const key in data) {
            if (key === 'messageId') continue;
            updates.push(`${key} = ?`);
            let val = data[key];
            if (typeof val === 'boolean') val = val ? 1 : 0;
            else if (typeof val === 'object' && val !== null) val = serialize(val);
            params.push(val);
        }

        const exists = db.prepare('SELECT 1 FROM giveaways WHERE messageId = ?').get(messageId);
        if (exists) {
            params.push(messageId);
            db.prepare(`UPDATE giveaways SET ${updates.join(', ')} WHERE messageId = ?`).run(...params);
        } else {
            const keys = ['messageId', ...Object.keys(data).filter(k => k !== 'messageId')];
            const vals = keys.map(k => {
                let v = k === 'messageId' ? messageId : data[k];
                if (typeof v === 'boolean') v = v ? 1 : 0;
                else if (typeof v === 'object' && v !== null) v = serialize(v || (k === 'participants' ? [] : {}));
                return v;
            });
            db.prepare(`INSERT INTO giveaways (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`).run(...vals);
        }
    },
    getAll: () => {
        return db.prepare('SELECT * FROM giveaways').all().map(row => ({ ...row, participants: deserialize(row.participants) }));
    },
    delete: (messageId) => {
        db.prepare('DELETE FROM giveaways WHERE messageId = ?').run(messageId);
    },
    find: (filter = {}, complex = null) => {
        let sql = 'SELECT * FROM giveaways';
        const params = [];
        const conditions = [];
        for (const key in filter) {
            conditions.push(`${key} = ?`);
            params.push(typeof filter[key] === 'boolean' ? (filter[key] ? 1 : 0) : filter[key]);
        }
        if (complex) {
            conditions.push(complex.condition);
            if (complex.params) params.push(...complex.params);
        }
        if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
        return db.prepare(sql).all(...params).map(row => ({ ...row, participants: deserialize(row.participants) }));
    },
    deleteMany: (filter = {}, complex = null) => {
        let sql = 'DELETE FROM giveaways';
        const params = [];
        const conditions = [];
        for (const key in filter) {
            conditions.push(`${key} = ?`);
            params.push(typeof filter[key] === 'boolean' ? (filter[key] ? 1 : 0) : filter[key]);
        }
        if (complex) {
            conditions.push(complex.condition);
            if (complex.params) params.push(...complex.params);
        }
        if (conditions.length > 0) {
            sql += ' WHERE ' + conditions.join(' AND ');
            return db.prepare(sql).run(...params);
        }
        return { changes: 0 };
    },
    getActiveForChannel: (channelId) => {
        return db.prepare('SELECT * FROM giveaways WHERE channelId = ? AND ended = 0').all(channelId).map(row => ({ ...row, participants: deserialize(row.participants) }));
    },
    getEndedForChannel: (channelId) => {
        return db.prepare('SELECT * FROM giveaways WHERE channelId = ? AND ended = 1').all(channelId).map(row => ({ ...row, participants: deserialize(row.participants) }));
    }
};

managers.rankPermissions = {
    get: (rank) => {
        const row = db.prepare('SELECT * FROM rankPermissions WHERE rank = ?').get(rank);
        if (!row) return { rank, allowedCommands: [], deniedCommands: [] };
        return {
            ...row,
            allowedCommands: deserialize(row.allowedCommands),
            deniedCommands: deserialize(row.deniedCommands)
        };
    },
    set: (rank, data) => {
        const updates = [];
        const params = [];
        for (const key in data) {
            if (key === 'rank') continue;
            updates.push(`${key} = ?`);
            let val = data[key];
            if (['allowedCommands', 'deniedCommands'].includes(key)) val = serialize(val);
            params.push(val);
        }

        const exists = db.prepare('SELECT 1 FROM rankPermissions WHERE rank = ?').get(rank);
        if (exists) {
            params.push(rank);
            db.prepare(`UPDATE rankPermissions SET ${updates.join(', ')} WHERE rank = ?`).run(...params);
        } else {
            const keys = ['rank', ...Object.keys(data).filter(k => k !== 'rank')];
            const vals = keys.map(k => {
                let v = k === 'rank' ? rank : data[k];
                if (['allowedCommands', 'deniedCommands'].includes(k)) v = serialize(v || []);
                return v;
            });
            db.prepare(`INSERT INTO rankPermissions (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`).run(...vals);
        }
    },
    deleteMany: (sql = 'DELETE FROM rankPermissions', params = []) => {
        db.prepare(sql).run(...params);
    }
};



managers.automod = {
    get: (guildId) => {
        const row = db.prepare('SELECT * FROM automod WHERE guildId = ?').get(guildId);
        if (!row) return null;
        return {
            ...row,
            antiLink: !!row.antiLink,
            antiInvite: !!row.antiInvite,
            antiSpam: !!row.antiSpam,
            antiMention: !!row.antiMention,
            antiCaps: !!row.antiCaps,
            antiEmoji: !!row.antiEmoji,
            antiNsfw: !!row.antiNsfw,
            whitelistRoles: deserialize(row.whitelistRoles),
            whitelistChannels: deserialize(row.whitelistChannels),
            whitelistUsers: deserialize(row.whitelistUsers),
            punishments: deserialize(row.punishments, {}),
            heatSettings: deserialize(row.heatSettings, {})
        };
    },
    set: (guildId, data) => {
        const updates = [];
        const params = [];
        for (const key in data) {
            if (key === 'guildId') continue;
            updates.push(`${key} = ?`);
            let val = data[key];
            if (['whitelistRoles', 'whitelistChannels', 'whitelistUsers', 'punishments', 'heatSettings'].includes(key)) val = serialize(val);
            if (typeof val === 'boolean') val = val ? 1 : 0;
            params.push(val);
        }

        const exists = db.prepare('SELECT 1 FROM automod WHERE guildId = ?').get(guildId);
        if (exists) {
            params.push(guildId);
            db.prepare(`UPDATE automod SET ${updates.join(', ')} WHERE guildId = ?`).run(...params);
        } else {
            const keys = ['guildId', ...Object.keys(data).filter(k => k !== 'guildId')];
            const vals = keys.map(k => {
                let v = k === 'guildId' ? guildId : data[k];
                if (['whitelistRoles', 'whitelistChannels', 'whitelistUsers', 'punishments', 'heatSettings'].includes(k)) v = serialize(v || (k === 'punishments' || k === 'heatSettings' ? {} : []));
                if (typeof v === 'boolean') v = v ? 1 : 0;
                return v;
            });
            db.prepare(`INSERT INTO automod (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`).run(...vals);
        }
    }
};

managers.antinuke = {
    get: (guildId) => {
        const row = db.prepare('SELECT * FROM antinuke WHERE guildId = ?').get(guildId);
        if (!row) return null;
        return { ...row, enabled: !!row.enabled, whitelist: deserialize(row.whitelist), bypass: deserialize(row.bypass), limits: deserialize(row.limits, {}), modules: deserialize(row.modules, {}), whitelistChannels: deserialize(row.whitelistChannels) };
    },
    set: (guildId, data) => {
        const updates = [], params = [];
        for (const key in data) {
            if (key === 'guildId') continue;
            updates.push(`${key} = ?`);
            let val = data[key];
            if (['whitelist','bypass','limits','modules','whitelistChannels'].includes(key)) val = serialize(val);
            if (typeof val === 'boolean') val = val ? 1 : 0;
            params.push(val);
        }
        const exists = db.prepare('SELECT 1 FROM antinuke WHERE guildId = ?').get(guildId);
        if (exists) { params.push(guildId); db.prepare(`UPDATE antinuke SET ${updates.join(', ')} WHERE guildId = ?`).run(...params); }
        else { const keys = ['guildId', ...Object.keys(data).filter(k => k !== 'guildId')]; const vals = keys.map(k => { let v = k === 'guildId' ? guildId : data[k]; if (['whitelist','bypass','limits','modules','whitelistChannels'].includes(k)) v = serialize(v || (['limits','modules'].includes(k) ? {} : [])); if (typeof v === 'boolean') v = v ? 1 : 0; return v; }); db.prepare(`INSERT INTO antinuke (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`).run(...vals); }
    },
    delete: (guildId) => { db.prepare('DELETE FROM antinuke WHERE guildId = ?').run(guildId); }
};
managers.verification = {
    get: (guildId) => { const row = db.prepare('SELECT * FROM verification WHERE guildId = ?').get(guildId); return row ? { ...row, enabled: !!row.enabled } : null; },
    set: (guildId, data) => {
        const updates = [], params = [];
        for (const key in data) { if (key === 'guildId') continue; updates.push(`${key} = ?`); let val = data[key]; if (typeof val === 'boolean') val = val ? 1 : 0; params.push(val); }
        const exists = db.prepare('SELECT 1 FROM verification WHERE guildId = ?').get(guildId);
        if (exists) { params.push(guildId); db.prepare(`UPDATE verification SET ${updates.join(', ')} WHERE guildId = ?`).run(...params); }
        else { const keys = ['guildId', ...Object.keys(data).filter(k => k !== 'guildId')]; const vals = keys.map(k => { let v = k === 'guildId' ? guildId : data[k]; if (typeof v === 'boolean') v = v ? 1 : 0; return v; }); db.prepare(`INSERT INTO verification (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`).run(...vals); }
    },
    delete: (guildId) => { db.prepare('DELETE FROM verification WHERE guildId = ?').run(guildId); }
};
managers.economy = {
    get: (userId) => {
        const row = db.prepare('SELECT * FROM economy WHERE userId = ?').get(userId);
        if (!row) return { userId, wallet: 0, bank: 0, xp: 0, level: 1, prestige: 0, lastDaily: null, lastWork: null, lastRob: null, lastCrime: null, lastFish: null, lastMine: null, lastHunt: null, lastBeg: null, lastWeekly: null, lastMonthly: null, totalEarned: 0, badges: [] };
        return { ...row, badges: deserialize(row.badges) };
    },
    set: (userId, data) => {
        const updates = [], params = [];
        for (const key in data) { if (key === 'userId') continue; updates.push(`${key} = ?`); let val = data[key]; if (key === 'badges' && typeof val === 'object') val = serialize(val); params.push(val); }
        const exists = db.prepare('SELECT 1 FROM economy WHERE userId = ?').get(userId);
        if (exists) { params.push(userId); db.prepare(`UPDATE economy SET ${updates.join(', ')} WHERE userId = ?`).run(...params); }
        else { const keys = ['userId', ...Object.keys(data).filter(k => k !== 'userId')]; const vals = keys.map(k => { let v = k === 'userId' ? userId : data[k]; if (k === 'badges' && typeof v === 'object') v = serialize(v || []); return v; }); db.prepare(`INSERT INTO economy (${keys.join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`).run(...vals); }
    },
    getAll: () => db.prepare('SELECT * FROM economy').all(),
    getLeaderboard: (type, limit) => { const safe = ['wallet','bank','xp','level','prestige','totalEarned'].includes(type) ? type : 'wallet'; return db.prepare(`SELECT * FROM economy ORDER BY ${safe} DESC LIMIT ?`).all(limit || 10); },
    delete: (userId) => { db.prepare('DELETE FROM economy WHERE userId = ?').run(userId); }
};
managers.shop = {
    get: (guildId) => db.prepare('SELECT * FROM shop WHERE guildId = ?').all(guildId),
    getItem: (guildId, name) => db.prepare('SELECT * FROM shop WHERE guildId = ? AND LOWER(name) = LOWER(?)').get(guildId, name),
    add: (guildId, data) => { db.prepare('INSERT OR REPLACE INTO shop (guildId, name, description, price, roleId, type) VALUES (?, ?, ?, ?, ?, ?)').run(guildId, data.name, data.description || '', data.price, data.roleId || null, data.type || 'item'); },
    remove: (guildId, name) => db.prepare('DELETE FROM shop WHERE guildId = ? AND LOWER(name) = LOWER(?)').run(guildId, name),
    getAll: () => db.prepare('SELECT * FROM shop').all()
};
managers.inventory = {
    get: (userId) => { const row = db.prepare('SELECT * FROM inventory WHERE userId = ?').get(userId); return row ? deserialize(row.items) : []; },
    set: (userId, items) => db.prepare('INSERT OR REPLACE INTO inventory (userId, items) VALUES (?, ?)').run(userId, serialize(items)),
    addItem: (userId, item) => { const items = managers.inventory.get(userId); items.push(item); managers.inventory.set(userId, items); },
    removeItem: (userId, name) => { const items = managers.inventory.get(userId); const idx = items.findIndex(i => i.name?.toLowerCase() === name.toLowerCase()); if (idx !== -1) { items.splice(idx,1); managers.inventory.set(userId, items); return true; } return false; }
};
managers.loans = {
    get: (userId) => db.prepare('SELECT * FROM loans WHERE userId = ?').get(userId) || null,
    set: (userId, data) => { const e = db.prepare('SELECT 1 FROM loans WHERE userId = ?').get(userId); if (e) { db.prepare('UPDATE loans SET amount=?,due=?,interest=?,lender=? WHERE userId=?').run(data.amount,data.due,data.interest,data.lender||'Chill Bank',userId); } else { db.prepare('INSERT INTO loans (userId,amount,due,interest,lender) VALUES (?,?,?,?,?)').run(userId,data.amount,data.due,data.interest,data.lender||'Chill Bank'); } },
    delete: (userId) => db.prepare('DELETE FROM loans WHERE userId = ?').run(userId)
};
managers.achievements = {
    get: (userId) => { const row = db.prepare('SELECT * FROM achievements WHERE userId = ?').get(userId); return row ? deserialize(row.list) : []; },
    set: (userId, list) => db.prepare('INSERT OR REPLACE INTO achievements (userId, list) VALUES (?, ?)').run(userId, serialize(list)),
    add: (userId, a) => { const l = managers.achievements.get(userId); if (!l.includes(a)) { l.push(a); managers.achievements.set(userId, l); return true; } return false; }
};
managers.transactions = {
    add: (userId, type, amount, description) => { db.prepare('INSERT INTO transactions (userId,type,amount,description,timestamp) VALUES (?,?,?,?,?)').run(userId,type,amount,description,Date.now().toString()); },
    get: (userId, limit) => db.prepare('SELECT * FROM transactions WHERE userId=? ORDER BY CAST(timestamp AS INTEGER) DESC LIMIT ?').all(userId, limit||10)
};

managers.warnings = {
    get: (guildId, userId) => {
        const row = db.prepare('SELECT * FROM warnings WHERE guildId = ? AND userId = ?').get(guildId, userId);
        return row ? { list: deserialize(row.list) } : null;
    },
    set: (guildId, userId, data) => {
        const exists = db.prepare('SELECT 1 FROM warnings WHERE guildId = ? AND userId = ?').get(guildId, userId);
        const list = serialize(data.list || []);
        if (exists) { db.prepare('UPDATE warnings SET list = ? WHERE guildId = ? AND userId = ?').run(list, guildId, userId); }
        else { db.prepare('INSERT INTO warnings (guildId, userId, list) VALUES (?, ?, ?)').run(guildId, userId, list); }
    },
    delete: (guildId, userId) => { db.prepare('DELETE FROM warnings WHERE guildId = ? AND userId = ?').run(guildId, userId); },
    deleteAll: (guildId) => { db.prepare('DELETE FROM warnings WHERE guildId = ?').run(guildId); }
};

managers.ticket = {
    get: (guildId) => {
        const row = db.prepare('SELECT * FROM ticket_settings WHERE guildId = ?').get(guildId);
        if (!row) return null;
        return { ...row, enabled: !!row.enabled, modalEnabled: !!row.modalEnabled, welcomeEnabled: !!row.welcomeEnabled, transcriptEnabled: !!row.transcriptEnabled };
    },
    set: (guildId, data) => {
        const keys = Object.keys(data).filter(k => k !== 'guildId');
        const exists = db.prepare('SELECT 1 FROM ticket_settings WHERE guildId = ?').get(guildId);
        if (exists) {
            const sets = keys.map(k => k + ' = ?').join(', ');
            const vals = keys.map(k => { let v = data[k]; if (typeof v === 'boolean') v = v ? 1 : 0; return v; });
            vals.push(guildId);
            db.prepare('UPDATE ticket_settings SET ' + sets + ' WHERE guildId = ?').run(...vals);
        } else {
            const allKeys = ['guildId', ...keys];
            const vals = [guildId, ...keys.map(k => { let v = data[k]; if (typeof v === 'boolean') v = v ? 1 : 0; return v; })];
            db.prepare('INSERT INTO ticket_settings (' + allKeys.join(', ') + ') VALUES (' + allKeys.map(() => '?').join(', ') + ')').run(...vals);
        }
    },
    delete: (guildId) => db.prepare('DELETE FROM ticket_settings WHERE guildId = ?').run(guildId)
};
managers.tickets = {
    get: (channelId) => {
        const row = db.prepare('SELECT * FROM tickets WHERE channelId = ?').get(channelId);
        return row || null;
    },
    set: (channelId, data) => {
        const keys = Object.keys(data).filter(k => k !== 'channelId');
        const exists = db.prepare('SELECT 1 FROM tickets WHERE channelId = ?').get(channelId);
        if (exists) {
            const sets = keys.map(k => k + ' = ?').join(', ');
            db.prepare('UPDATE tickets SET ' + sets + ' WHERE channelId = ?').run(...keys.map(k => data[k]), channelId);
        } else {
            const allKeys = ['channelId', ...keys];
            const vals = [channelId, ...keys.map(k => data[k])];
            db.prepare('INSERT INTO tickets (' + allKeys.join(', ') + ') VALUES (' + allKeys.map(() => '?').join(', ') + ')').run(...vals);
        }
    },
    delete: (channelId) => db.prepare('DELETE FROM tickets WHERE channelId = ?').run(channelId),
    getByGuild: (guildId) => db.prepare('SELECT * FROM tickets WHERE guildId = ?').all(guildId) || [],
    getByUser: (guildId, userId) => db.prepare('SELECT * FROM tickets WHERE guildId = ? AND userId = ? AND status = ?').all(guildId, userId, 'open') || []
};

const newTables = [
    { name: 'antinuke', schema: `guildId TEXT PRIMARY KEY, enabled INTEGER DEFAULT 0, logChannel TEXT, punishment TEXT DEFAULT 'kick', strictLevel INTEGER DEFAULT 1, whitelist TEXT DEFAULT '[]', bypass TEXT DEFAULT '[]', limits TEXT DEFAULT '{}', modules TEXT DEFAULT '{}', whitelistChannels TEXT DEFAULT '[]', timeWindow INTEGER DEFAULT 10000` },
    { name: 'verification', schema: `guildId TEXT PRIMARY KEY, enabled INTEGER DEFAULT 0, channelId TEXT, roleId TEXT, messageId TEXT, style TEXT DEFAULT 'button', buttonLabel TEXT DEFAULT 'Verify', buttonColor TEXT DEFAULT 'green', embedTitle TEXT DEFAULT 'Verification', embedDesc TEXT DEFAULT 'Click the button below to verify yourself.', embedColor TEXT DEFAULT '#5865F2', embedImage TEXT` },
    { name: 'economy', schema: `userId TEXT PRIMARY KEY, wallet INTEGER DEFAULT 0, bank INTEGER DEFAULT 0, xp INTEGER DEFAULT 0, level INTEGER DEFAULT 1, prestige INTEGER DEFAULT 0, lastDaily TEXT, lastWork TEXT, lastRob TEXT, lastCrime TEXT, lastFish TEXT, lastMine TEXT, lastHunt TEXT, lastBeg TEXT, lastWeekly TEXT, lastMonthly TEXT, totalEarned INTEGER DEFAULT 0, badges TEXT DEFAULT '[]', lastSpinWheel TEXT, lastBankRob TEXT, lastBoss TEXT, lastCollect TEXT, lastDungeon TEXT, lastExplore TEXT, lastSalary TEXT, pet TEXT DEFAULT 'null', questData TEXT DEFAULT 'null', dailyStreak INTEGER DEFAULT 0, weeklyStreak INTEGER DEFAULT 0, totalLost INTEGER DEFAULT 0, upgrades TEXT DEFAULT '{}'` },
    { name: 'shop', schema: `id INTEGER PRIMARY KEY AUTOINCREMENT, guildId TEXT, name TEXT, description TEXT, price INTEGER, roleId TEXT, type TEXT DEFAULT 'item'` },
    { name: 'inventory', schema: `userId TEXT PRIMARY KEY, items TEXT DEFAULT '[]'` },
    { name: 'loans', schema: `userId TEXT PRIMARY KEY, amount INTEGER, due TEXT, interest REAL DEFAULT 0.05, lender TEXT DEFAULT 'Chill Bank'` },
    { name: 'achievements', schema: `userId TEXT PRIMARY KEY, list TEXT DEFAULT '[]'` },
    { name: 'transactions', schema: `id INTEGER PRIMARY KEY AUTOINCREMENT, userId TEXT, type TEXT, amount INTEGER, description TEXT, timestamp TEXT` },
    { name: 'warnings', schema: `guildId TEXT, userId TEXT, list TEXT DEFAULT '[]', PRIMARY KEY (guildId, userId)` },
    { name: 'ticket_settings', schema: `guildId TEXT PRIMARY KEY, enabled INTEGER DEFAULT 1, panelChannelId TEXT, ticketCategoryId TEXT, logChannelId TEXT, supportRoleId TEXT, ticketLimit INTEGER DEFAULT 1, panelType TEXT DEFAULT 'button', panelTitle TEXT DEFAULT 'Support Tickets', panelDescription TEXT DEFAULT 'Click below to open a support ticket.', panelFooter TEXT, panelColor TEXT DEFAULT '#FFFFFF', modalEnabled INTEGER DEFAULT 0, modalQuestion TEXT DEFAULT 'What do you need help with?', welcomeEnabled INTEGER DEFAULT 1, welcomeMessage TEXT DEFAULT 'Hey {user}, a staff member will be with you shortly.', transcriptEnabled INTEGER DEFAULT 1, transcriptChannelId TEXT` },
    { name: 'tickets', schema: `channelId TEXT PRIMARY KEY, guildId TEXT, userId TEXT, claimedBy TEXT, createdAt TEXT, status TEXT DEFAULT 'open'` },
];
newTables.forEach(t => { try { db.prepare(`CREATE TABLE IF NOT EXISTS ${t.name} (${t.schema})`).run(); } catch(e){} });

const economyMigrations = [
    `ALTER TABLE economy ADD COLUMN lastSpinWheel TEXT`,
    `ALTER TABLE economy ADD COLUMN lastBankRob TEXT`,
    `ALTER TABLE economy ADD COLUMN lastBoss TEXT`,
    `ALTER TABLE economy ADD COLUMN lastCollect TEXT`,
    `ALTER TABLE economy ADD COLUMN lastDungeon TEXT`,
    `ALTER TABLE economy ADD COLUMN lastExplore TEXT`,
    `ALTER TABLE economy ADD COLUMN lastSalary TEXT`,
    `ALTER TABLE economy ADD COLUMN pet TEXT DEFAULT 'null'`,
    `ALTER TABLE economy ADD COLUMN questData TEXT DEFAULT 'null'`,
    `ALTER TABLE economy ADD COLUMN dailyStreak INTEGER DEFAULT 0`,
    `ALTER TABLE economy ADD COLUMN weeklyStreak INTEGER DEFAULT 0`,
    `ALTER TABLE economy ADD COLUMN totalLost INTEGER DEFAULT 0`,
    `ALTER TABLE economy ADD COLUMN upgrades TEXT DEFAULT '{}'`,
];
economyMigrations.forEach(sql => { try { db.prepare(sql).run(); } catch(e){} });

const Database = { db, ...managers };

module.exports = Database;
