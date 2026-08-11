const {
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  MessageFlags, EmbedBuilder, PermissionFlagsBits, AuditLogEvent
} = require('discord.js');

class AntiNukeManager {
  constructor(client) {
    this.client = client;
    this.actionCache = new Map();
    this.lockout = new Set();

    this._registerEvents();
    setInterval(() => this._cleanCache(), 30000);
  }

  getSettings(guildId) {
    if (!this.client.db.antinuke) return this._defaultSettings(guildId);
    const row = this.client.db.antinuke.get(guildId);
    if (!row) return this._defaultSettings(guildId);
    return row;
  }

  _defaultSettings(guildId) {
    return {
      guildId,
      enabled: false,
      logChannel: null,
      punishment: 'kick',
      strictLevel: 1,
      whitelist: [],
      bypass: [],
      limits: { ban: 3, kick: 5, channelDelete: 3, roleDelete: 3, webhookCreate: 3, adminGrant: 1 },
      modules: { antiBan: true, antiKick: true, antiChannelDelete: true, antiRoleDelete: true, antiWebhook: true, antiAdminGrant: true, antiBot: true },
      timeWindow: 10000
    };
  }

  isWhitelisted(userId, guildId) {
    const settings = this.getSettings(guildId);
    if (!settings.enabled) return true;
    const guild = this.client.guilds.cache.get(guildId);
    if (guild && guild.ownerId === userId) return true;
    if (this.client.owners?.includes(userId)) return true;
    const wl = settings.whitelist || [];
    if (wl.includes(userId)) return true;
    return false;
  }

  isBypassed(userId, guildId) {
    const settings = this.getSettings(guildId);
    return (settings.bypass || []).includes(userId);
  }

  trackAction(guildId, userId, action) {
    const key = `${guildId}:${userId}:${action}`;
    const now = Date.now();
    const settings = this.getSettings(guildId);
    const window = settings.timeWindow || 10000;

    if (!this.actionCache.has(key)) this.actionCache.set(key, []);
    const times = this.actionCache.get(key);
    const filtered = times.filter(t => now - t < window);
    filtered.push(now);
    this.actionCache.set(key, filtered);
    return filtered.length;
  }

  getLimitForAction(settings, action) {
    const limits = settings.limits || {};
    return limits[action] ?? 3;
  }

  async punish(guild, userId, action, reason) {
    const settings = this.getSettings(guild.id);
    const punishment = settings.punishment || 'kick';
    const lockKey = `${guild.id}:${userId}`;
    if (this.lockout.has(lockKey)) return;
    this.lockout.add(lockKey);
    setTimeout(() => this.lockout.delete(lockKey), 30000);

    let member;
    try { member = await guild.members.fetch(userId); } catch { }

    const me = guild.members.me;
    if (!me) return;

    try {
      if (punishment === 'ban') {
        if (me.permissions.has(PermissionFlagsBits.BanMembers)) {
          await guild.bans.create(userId, { reason: `[Chill AntiNuke] ${reason}` });
        }
      } else if (punishment === 'kick') {
        if (member && me.permissions.has(PermissionFlagsBits.KickMembers) && me.roles.highest.position > member.roles.highest.position) {
          await member.kick(`[Chill AntiNuke] ${reason}`);
        }
      } else if (punishment === 'strip') {
        if (member && me.permissions.has(PermissionFlagsBits.ManageRoles)) {
          const roles = member.roles.cache.filter(r => r.id !== guild.id && me.roles.highest.position > r.position);
          await member.roles.remove(roles, `[Chill AntiNuke] ${reason}`);
        }
      } else if (punishment === 'warn') {
        if (member) {
          await member.send({ content: `⚠️ You have been warned in **${guild.name}** for: ${reason}` }).catch(() => { });
        }
      }

      await this._log(guild, userId, action, reason, punishment);
    } catch (err) {
      console.error(`[AntiNuke] Punishment error: ${err.message}`);
    }
  }

  async _log(guild, userId, action, reason, punishment) {
    const settings = this.getSettings(guild.id);
    if (!settings.logChannel) return;

    const channel = guild.channels.cache.get(settings.logChannel);
    if (!channel) return;

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### 🛡️ Chill AntiNuke — Threat Detected\n` +
        `**User:** <@${userId}> (\`${userId}\`)\n` +
        `**Action:** \`${action}\`\n` +
        `**Reason:** ${reason}\n` +
        `**Punishment Applied:** \`${punishment.toUpperCase()}\`\n` +
        `**Time:** <t:${Math.floor(Date.now() / 1000)}:F>\n` +
        `-# Developed by AkiForver • Chill Security System`
      ));

    channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => { });
  }

  async _handleBan(ban) {
    const { guild, user } = ban;
    const settings = this.getSettings(guild.id);
    if (!settings.enabled || !settings.modules?.antiBan) return;
    await new Promise(r => setTimeout(r, 600));
    try {
      const auditLogs = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 1 });
      const entry = auditLogs.entries.first();
      if (!entry || Date.now() - entry.createdTimestamp > 5000) return;
      const executorId = entry.executor?.id;
      if (!executorId || this.isWhitelisted(executorId, guild.id) || this.isBypassed(executorId, guild.id)) return;
      const count = this.trackAction(guild.id, executorId, 'ban');
      const limit = this.getLimitForAction(settings, 'ban');
      if (count >= limit) {
        await this.punish(guild, executorId, 'Ban Nuke', `Performed ${count} bans in the time window (limit: ${limit})`);
      }
    } catch {}
  }

  async _handleMemberRemove(member) {
    const { guild, user } = member;
    const settings = this.getSettings(guild.id);
    if (!settings.enabled || !settings.modules?.antiKick) return;
    await new Promise(r => setTimeout(r, 600));
    try {
      const banList = await guild.bans.fetch({ limit: 1 }).catch(() => null);
      if (banList?.has(user.id)) return;
      const auditLogs = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberKick, limit: 1 });
      const entry = auditLogs.entries.first();
      if (!entry || Date.now() - entry.createdTimestamp > 5000 || entry.target?.id !== user.id) return;
      const executorId = entry.executor?.id;
      if (!executorId || this.isWhitelisted(executorId, guild.id) || this.isBypassed(executorId, guild.id)) return;
      const count = this.trackAction(guild.id, executorId, 'kick');
      const limit = this.getLimitForAction(settings, 'kick');
      if (count >= limit) {
        await this.punish(guild, executorId, 'Kick Nuke', `Performed ${count} kicks in the time window (limit: ${limit})`);
      }
    } catch {}
  }

  async _handleChannelDelete(channel) {
    if (!channel.guild) return;
    const { guild } = channel;
    const settings = this.getSettings(guild.id);
    if (!settings.enabled || !settings.modules?.antiChannelDelete) return;
    await new Promise(r => setTimeout(r, 600));
    try {
      const auditLogs = await guild.fetchAuditLogs({ type: AuditLogEvent.ChannelDelete, limit: 1 });
      const entry = auditLogs.entries.first();
      if (!entry || Date.now() - entry.createdTimestamp > 5000) return;
      const executorId = entry.executor?.id;
      if (!executorId || this.isWhitelisted(executorId, guild.id) || this.isBypassed(executorId, guild.id)) return;
      const count = this.trackAction(guild.id, executorId, 'channelDelete');
      const limit = this.getLimitForAction(settings, 'channelDelete');
      if (count >= limit) {
        await this.punish(guild, executorId, 'Channel Nuke', `Deleted ${count} channels in the time window (limit: ${limit})`);
      }
    } catch {}
  }

  async _handleRoleDelete(role) {
    const { guild } = role;
    const settings = this.getSettings(guild.id);
    if (!settings.enabled || !settings.modules?.antiRoleDelete) return;
    await new Promise(r => setTimeout(r, 600));
    try {
      const auditLogs = await guild.fetchAuditLogs({ type: AuditLogEvent.RoleDelete, limit: 1 });
      const entry = auditLogs.entries.first();
      if (!entry || Date.now() - entry.createdTimestamp > 5000) return;
      const executorId = entry.executor?.id;
      if (!executorId || this.isWhitelisted(executorId, guild.id) || this.isBypassed(executorId, guild.id)) return;
      const count = this.trackAction(guild.id, executorId, 'roleDelete');
      const limit = this.getLimitForAction(settings, 'roleDelete');
      if (count >= limit) {
        await this.punish(guild, executorId, 'Role Nuke', `Deleted ${count} roles in the time window (limit: ${limit})`);
      }
    } catch {}
  }

  async _handleWebhookUpdate(channel) {
    if (!channel.guild) return;
    const { guild } = channel;
    const settings = this.getSettings(guild.id);
    if (!settings.enabled || !settings.modules?.antiWebhook) return;
    await new Promise(r => setTimeout(r, 600));
    try {
      const auditLogs = await guild.fetchAuditLogs({ type: AuditLogEvent.WebhookCreate, limit: 1 });
      const entry = auditLogs.entries.first();
      if (!entry || Date.now() - entry.createdTimestamp > 5000) return;
      const executorId = entry.executor?.id;
      if (!executorId || this.isWhitelisted(executorId, guild.id) || this.isBypassed(executorId, guild.id)) return;
      const count = this.trackAction(guild.id, executorId, 'webhookCreate');
      const limit = this.getLimitForAction(settings, 'webhookCreate');
      if (count >= limit) {
        await this.punish(guild, executorId, 'Webhook Nuke', `Created ${count} webhooks in the time window (limit: ${limit})`);
      }
    } catch {}
  }

  async _handleGuildMemberUpdate(oldMember, newMember) {
    const { guild } = newMember;
    const settings = this.getSettings(guild.id);
    if (!settings.enabled || !settings.modules?.antiAdminGrant) return;

    const hadAdmin = oldMember.permissions.has(PermissionFlagsBits.Administrator);
    const hasAdmin = newMember.permissions.has(PermissionFlagsBits.Administrator);
    if (!hadAdmin && hasAdmin) {
      await new Promise(r => setTimeout(r, 600));
      try {
        const auditLogs = await guild.fetchAuditLogs({ type: AuditLogEvent.MemberRoleUpdate, limit: 1 });
        const entry = auditLogs.entries.first();
        if (!entry || Date.now() - entry.createdTimestamp > 5000) return;
        const executorId = entry.executor?.id;
        if (!executorId || this.isWhitelisted(executorId, guild.id) || this.isBypassed(executorId, guild.id)) return;
        const count = this.trackAction(guild.id, executorId, 'adminGrant');
        await this.punish(guild, executorId, 'Admin Grant', `Granted administrator to <@${newMember.id}>`);
      } catch {}
    }

    if (!settings.modules?.antiBot) return;
    if (!oldMember.user.bot && newMember.user.bot) {
      await new Promise(r => setTimeout(r, 600));
      try {
        const auditLogs = await guild.fetchAuditLogs({ type: AuditLogEvent.BotAdd, limit: 1 });
        const entry = auditLogs.entries.first();
        if (!entry || Date.now() - entry.createdTimestamp > 5000) return;
        const executorId = entry.executor?.id;
        if (!executorId || this.isWhitelisted(executorId, guild.id) || this.isBypassed(executorId, guild.id)) return;
        await this.punish(guild, executorId, 'Bot Add', `Added unauthorized bot <@${newMember.id}>`);
      } catch {}
    }
  }

  _registerEvents() {
    const client = this.client;
    client.on('guildBanAdd', (ban) => this._handleBan(ban).catch(() => { }));
    client.on('guildMemberRemove', (member) => this._handleMemberRemove(member).catch(() => { }));
    client.on('channelDelete', (channel) => this._handleChannelDelete(channel).catch(() => { }));
    client.on('roleDelete', (role) => this._handleRoleDelete(role).catch(() => { }));
    client.on('webhookUpdate', (channel) => this._handleWebhookUpdate(channel).catch(() => { }));
    client.on('guildMemberUpdate', (old, neo) => this._handleGuildMemberUpdate(old, neo).catch(() => { }));
  }

  _cleanCache() {
    const now = Date.now();
    for (const [key, times] of this.actionCache.entries()) {
      const filtered = times.filter(t => now - t < 60000);
      if (filtered.length === 0) this.actionCache.delete(key);
      else this.actionCache.set(key, filtered);
    }
  }
}

module.exports = AntiNukeManager;
