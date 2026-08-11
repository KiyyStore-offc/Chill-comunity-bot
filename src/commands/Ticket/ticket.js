const {
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
  MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  ChannelSelectMenuBuilder, RoleSelectMenuBuilder, ChannelType,
  ModalBuilder, TextInputBuilder, TextInputStyle, PermissionsBitField
} = require('discord.js');

const DEFAULT = {
  enabled: true, panelChannelId: null, ticketCategoryId: null,
  logChannelId: null, supportRoleId: null, ticketLimit: 1,
  panelType: 'button', panelTitle: 'Support Tickets',
  panelDescription: 'Click below to open a support ticket.',
  panelFooter: null, panelColor: '#FFFFFF',
  modalEnabled: false, modalQuestion: 'What do you need help with?',
  welcomeEnabled: true, welcomeMessage: 'Hey {user}, a staff member will be with you shortly.',
  transcriptEnabled: true, transcriptChannelId: null
};

function getSettings(client, guildId) {
  const s = client.db.ticket ? client.db.ticket.get(guildId) : null;
  return s ? { ...DEFAULT, ...s } : { ...DEFAULT, guildId };
}

function fCh(id) { return id ? `<#${id}>` : '`Not Set`'; }
function fRole(id) { return id ? `<@&${id}>` : '`Not Set`'; }
function onOff(v) { return v ? 'On' : 'Off'; }
function enDis(v) { return v ? 'Enabled' : 'Disabled'; }

function buildDashboard(s, guild) {
  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Ticket System Dashboard**`))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `**Status:** ${enDis(s.enabled)}  **Panel Type:** \`${s.panelType.toUpperCase()}\`\n` +
      `**Panel Channel:** ${fCh(s.panelChannelId)}\n` +
      `**Ticket Category:** ${s.ticketCategoryId ? `<#${s.ticketCategoryId}>` : '`Not Set`'}\n` +
      `**Log Channel:** ${fCh(s.logChannelId)}\n` +
      `**Support Role:** ${fRole(s.supportRoleId)}\n` +
      `**Ticket Limit:** \`${s.ticketLimit} per user\`\n` +
      `**Modal:** ${onOff(s.modalEnabled)}  **Welcome Msg:** ${onOff(s.welcomeEnabled)}\n` +
      `**Transcripts:** ${onOff(s.transcriptEnabled)}  **Tr Channel:** ${fCh(s.transcriptChannelId)}`
    ))
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ts_panel_setup').setLabel('Panel Setup').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('ts_channels').setLabel('Channels').setStyle(ButtonStyle.Secondary)
    ))
    .addActionRowComponents(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ts_roles').setLabel('Roles & Limits').setStyle(ButtonStyle.Secondary)
    ))
    .addActionRowComponents(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ts_modal_setup').setLabel('Modal Setup').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('ts_welcome').setLabel('Welcome Msg').setStyle(ButtonStyle.Secondary)
    ))
    .addActionRowComponents(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ts_transcripts').setLabel('Transcripts').setStyle(ButtonStyle.Secondary)
    ))
    .addActionRowComponents(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ts_post').setLabel('Post Panel').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('ts_toggle').setLabel(s.enabled ? 'Disable' : 'Enable').setStyle(ButtonStyle.Secondary)
    ))
    .addActionRowComponents(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ts_reset').setLabel('Full Reset').setStyle(ButtonStyle.Danger)
    ));
}

function buildPanelSetup(s) {
  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `**Panel Setup**\nConfigure how your ticket panel looks.`
    ))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `**Title:** \`${s.panelTitle}\`\n` +
      `**Description:**\n  ${s.panelDescription}\n` +
      `**Footer:** ${s.panelFooter ? `\`${s.panelFooter}\`` : 'None'}\n` +
      `**Color:** \`${s.panelColor}\`\n` +
      `**Type:** \`${s.panelType.toUpperCase()}\``
    ))
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ts_edit_title').setLabel('Edit Title').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('ts_edit_desc').setLabel('Edit Desc').setStyle(ButtonStyle.Secondary)
    ))
    .addActionRowComponents(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ts_edit_footer').setLabel('Edit Footer').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('ts_edit_color').setLabel('Edit Color').setStyle(ButtonStyle.Secondary)
    ))
    .addActionRowComponents(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ts_type_button').setLabel('Use Button').setStyle(s.panelType === 'button' ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('ts_type_dropdown').setLabel('Use Dropdown').setStyle(s.panelType === 'dropdown' ? ButtonStyle.Success : ButtonStyle.Secondary)
    ))
    .addActionRowComponents(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ts_back').setLabel('Back').setStyle(ButtonStyle.Secondary)
    ));
}

function buildChannels(s) {
  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Channel & Category Setup**`))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `**Panel Channel:** ${fCh(s.panelChannelId)}\n  The channel where the ticket panel is posted.\n\n` +
      `**Ticket Category:** ${s.ticketCategoryId ? `<#${s.ticketCategoryId}>` : '`Not Set`'}\n  New ticket channels are created inside this category.\n\n` +
      `**Log Channel:** ${fCh(s.logChannelId)}\n  Ticket open/close events are logged here.`
    ))
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder().setCustomId('ts_ch_panel').setPlaceholder('Search and select Panel Channel...').setChannelTypes([ChannelType.GuildText])
    ))
    .addActionRowComponents(new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder().setCustomId('ts_ch_category').setPlaceholder('Search and select Ticket Category...').setChannelTypes([ChannelType.GuildCategory])
    ))
    .addActionRowComponents(new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder().setCustomId('ts_ch_log').setPlaceholder('Search and select Log Channel...').setChannelTypes([ChannelType.GuildText])
    ))
    .addActionRowComponents(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ts_back').setLabel('Back').setStyle(ButtonStyle.Secondary)
    ));
}

function buildRoles(s) {
  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Roles & Ticket Limits**`))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `**Support Role:** ${fRole(s.supportRoleId)}\n  This role gets view + manage access to all ticket channels.\n\n` +
      `**Ticket Limit:** \`${s.ticketLimit} open ticket(s) per user\`\n  Max open tickets a single user can have at once.`
    ))
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(new ActionRowBuilder().addComponents(
      new RoleSelectMenuBuilder().setCustomId('ts_role_support').setPlaceholder('Search and select Support Role...')
    ))
    .addActionRowComponents(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ts_limit_1').setLabel('Limit: 1').setStyle(s.ticketLimit === 1 ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('ts_limit_3').setLabel('Limit: 3').setStyle(s.ticketLimit === 3 ? ButtonStyle.Success : ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('ts_limit_5').setLabel('Limit: 5').setStyle(s.ticketLimit === 5 ? ButtonStyle.Success : ButtonStyle.Secondary)
    ))
    .addActionRowComponents(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ts_back').setLabel('Back').setStyle(ButtonStyle.Secondary)
    ));
}

function buildModalSetup(s) {
  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `**Modal Configuration**\nA modal pops up when a user opens a ticket, asking them a question before the channel is created.`
    ))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `**Modal:** ${enDis(s.modalEnabled)}\n**Question:**\n  ${s.modalQuestion}`
    ))
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ts_modal_toggle').setLabel(s.modalEnabled ? 'Disable Modal' : 'Enable Modal').setStyle(s.modalEnabled ? ButtonStyle.Danger : ButtonStyle.Success),
      new ButtonBuilder().setCustomId('ts_edit_question').setLabel('Edit Question').setStyle(ButtonStyle.Secondary)
    ))
    .addActionRowComponents(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ts_back').setLabel('Back').setStyle(ButtonStyle.Secondary)
    ));
}

function buildWelcome(s) {
  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `**Welcome Message**\nSent inside the ticket channel when a ticket is opened.`
    ))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `**Status:** ${enDis(s.welcomeEnabled)}\n**Message:**\n  ${s.welcomeMessage}\n\n` +
      `-# Variables: \`{user}\` \`{user_name}\` \`{server_name}\` \`{server_membercount}\``
    ))
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ts_welcome_toggle').setLabel(s.welcomeEnabled ? 'Disable' : 'Enable').setStyle(s.welcomeEnabled ? ButtonStyle.Danger : ButtonStyle.Success),
      new ButtonBuilder().setCustomId('ts_edit_welcome').setLabel('Edit Message').setStyle(ButtonStyle.Secondary)
    ))
    .addActionRowComponents(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ts_back').setLabel('Back').setStyle(ButtonStyle.Secondary)
    ));
}

function buildTranscripts(s) {
  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `**Transcript Configuration**\nAutomatically save a transcript of the ticket when closed.`
    ))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `**Status:** ${enDis(s.transcriptEnabled)}\n**Channel:** ${fCh(s.transcriptChannelId)}\n-# If set, transcripts will also be sent here.`
    ))
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder().setCustomId('ts_ch_transcript').setPlaceholder('Search and select Transcript Channel...').setChannelTypes([ChannelType.GuildText])
    ))
    .addActionRowComponents(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ts_transcript_toggle').setLabel(s.transcriptEnabled ? 'Disable' : 'Enable').setStyle(s.transcriptEnabled ? ButtonStyle.Danger : ButtonStyle.Success),
      new ButtonBuilder().setCustomId('ts_back').setLabel('Back').setStyle(ButtonStyle.Secondary)
    ));
}

function buildHelpPanel() {
  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Ticket Commands**`))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `**Setup**\n` +
      `\`ticket setup\` — Open the full setup dashboard\n` +
      `\`ticket config\` — View current configuration\n` +
      `\`ticket post\` — Post the ticket panel to the configured channel\n` +
      `\`ticket status\` — Toggle ticket system on or off\n` +
      `\`ticket reset\` — Clear all configuration\n\n` +
      `**Management**\n` +
      `\`ticket close\` — Close the current ticket channel\n` +
      `\`ticket claim\` — Claim the current ticket channel\n` +
      `\`ticket help\` — Show this message\n\n` +
      `**Dashboard Sections**\n` +
      `\`Panel Setup\` — Title, description, footer, color, button vs dropdown\n` +
      `\`Channels\` — Panel channel, ticket category, log channel\n` +
      `\`Roles & Limits\` — Support role, open ticket limit per user\n` +
      `\`Modal Setup\` — Toggle modal on/off, set the question\n` +
      `\`Welcome Msg\` — Toggle and edit the message sent in new ticket channels\n` +
      `\`Dropdown Opts\` — Add/remove dropdown categories for the panel`
    ));
}

function buildTicketPanel(s, guildId) {
  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
      `**${s.panelTitle}**\n\n${s.panelDescription}${s.panelFooter ? `\n\n-# ${s.panelFooter}` : ''}`
    ))
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`ticket_open_${guildId}`).setLabel('Open Ticket').setStyle(ButtonStyle.Primary)
    ));
}

function buildTicketChannel(s, user, guild, num) {
  const msg = (s.welcomeMessage || 'Hey {user}, a staff member will be with you shortly.')
    .replace(/{user}/g, `<@${user.id}>`)
    .replace(/{user_name}/g, user.username)
    .replace(/{server_name}/g, guild.name)
    .replace(/{server_membercount}/g, guild.memberCount.toString());

  return new ContainerBuilder()
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Ticket #${num}**\n\n${msg}`))
    .addSeparatorComponents(new SeparatorBuilder())
    .addActionRowComponents(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`ticket_claim_${guild.id}`).setLabel('Claim').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`ticket_close_${guild.id}`).setLabel('Close Ticket').setStyle(ButtonStyle.Danger)
    ));
}

module.exports = {
  name: 'ticket',
  aliases: ['tkt', 'tickets', 'tsetup'],
  category: 'Ticket',
  description: 'Full ticket system management dashboard',
  userPerms: ['ManageGuild'],
  cooldown: 5,
  slashOptions: [
    { name: 'action', description: 'setup, post, close, claim, status, reset, help', type: 3, required: false }
  ],

  async slashExecute(interaction, client) {
    const action = interaction.options.getString('action') || 'setup';
    await interaction.deferReply();
    return this._handle(interaction, action, client, true);
  },

  async execute(message, args, client) {
    return this._handle(message, args[0]?.toLowerCase() || 'setup', client, false);
  },

  async componentsV2(interaction, client) {
    const { customId } = interaction;
    if (customId.startsWith('ticket_open_'))  return this._openTicket(interaction, client);
    if (customId.startsWith('ticket_close_')) return this._closeTicket(interaction, client);
    if (customId.startsWith('ticket_claim_')) return this._claimTicket(interaction, client);
  },

  async modalHandler(interaction, client) {
    const { customId, guild } = interaction;
    const s = getSettings(client, guild.id);
    const field = customId.replace('tsm_', '');
    const value = interaction.fields.getTextInputValue('ts_input');
    const map = { title: 'panelTitle', desc: 'panelDescription', footer: 'panelFooter', color: 'panelColor', question: 'modalQuestion', welcome: 'welcomeMessage' };
    if (map[field]) {
      s[map[field]] = value;
      if (client.db.ticket) client.db.ticket.set(guild.id, s);
    }
    return interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`✅ Updated successfully! Reopen the dashboard to see changes.`))], flags: MessageFlags.IsComponentsV2 | 64 });
  },

  async ticketModalHandler(interaction, client) {
    const { guild, member, user } = interaction;
    const answer = interaction.fields.getTextInputValue('ticket_question');
    const s = getSettings(client, guild.id);
    await interaction.deferReply({ flags: 64 });
    return this._createChannel(interaction, client, s, answer);
  },

  async _handle(ctx, action, client, isSlash) {
    const guild = ctx.guild;
    const send = async (o) => {
      if (isSlash) return ctx.editReply ? ctx.editReply(o) : (ctx.replied || ctx.deferred ? ctx.followUp(o) : ctx.reply(o));
      return ctx.channel.send(o);
    };

    if (action === 'setup' || action === 'config') return this._showDashboard(ctx, client, isSlash);
    if (action === 'help') return send({ components: [buildHelpPanel()], flags: MessageFlags.IsComponentsV2 });

    if (action === 'post') {
      const s = getSettings(client, guild.id);
      const ch = s.panelChannelId ? guild.channels.cache.get(s.panelChannelId) : null;
      if (!ch) return send({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ No panel channel set. Use `ticket setup` → Channels first.'))], flags: MessageFlags.IsComponentsV2 });
      await ch.send({ components: [buildTicketPanel(s, guild.id)], flags: MessageFlags.IsComponentsV2 });
      return send({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`✅ Ticket panel posted to <#${ch.id}>!`))], flags: MessageFlags.IsComponentsV2 });
    }

    if (action === 'status') {
      const s = getSettings(client, guild.id);
      s.enabled = !s.enabled;
      if (client.db.ticket) client.db.ticket.set(guild.id, s);
      return send({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`✅ Ticket system **${s.enabled ? 'enabled' : 'disabled'}**.`))], flags: MessageFlags.IsComponentsV2 });
    }

    if (action === 'reset') {
      if (client.db.ticket) client.db.ticket.delete(guild.id);
      return send({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('✅ Configuration reset to defaults.'))], flags: MessageFlags.IsComponentsV2 });
    }

    if (action === 'close') {
      const ticket = client.db.tickets ? client.db.tickets.get(ctx.channel?.id) : null;
      if (!ticket) return send({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ This channel is not a ticket.'))], flags: MessageFlags.IsComponentsV2 });
      return this._doClose(ctx.channel, guild, ctx.author || ctx.user, client);
    }

    if (action === 'claim') {
      const ticket = client.db.tickets ? client.db.tickets.get(ctx.channel?.id) : null;
      if (!ticket) return send({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent('❌ This channel is not a ticket.'))], flags: MessageFlags.IsComponentsV2 });
      const u = ctx.author || ctx.user;
      ticket.claimedBy = u.id;
      if (client.db.tickets) client.db.tickets.set(ticket.channelId, ticket);
      return send({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`✅ Ticket claimed by <@${u.id}>!`))], flags: MessageFlags.IsComponentsV2 });
    }
  },

  async _showDashboard(ctx, client, isSlash) {
    const guild = ctx.guild;
    const user = isSlash ? ctx.user : ctx.author;
    let s = getSettings(client, guild.id);

    const send = async (o) => {
      if (isSlash) return ctx.editReply ? ctx.editReply(o) : ctx.followUp(o);
      return ctx.channel.send(o);
    };

    const msg = await send({ components: [buildDashboard(s, guild)], flags: MessageFlags.IsComponentsV2 });
    if (!msg) return;

    const collector = msg.createMessageComponentCollector({ time: 300000 });

    collector.on('collect', async (i) => {
      if (i.user.id !== user.id) return i.reply({ content: '❌ This dashboard is not yours.', flags: 64 });
      s = getSettings(client, guild.id);

      const save = (data) => {
        Object.assign(s, data);
        if (client.db.ticket) client.db.ticket.set(guild.id, s);
        s = getSettings(client, guild.id);
      };

      const { customId } = i;

      if (customId === 'ts_back') return i.update({ components: [buildDashboard(s, guild)], flags: MessageFlags.IsComponentsV2 });
      if (customId === 'ts_panel_setup') return i.update({ components: [buildPanelSetup(s)], flags: MessageFlags.IsComponentsV2 });
      if (customId === 'ts_channels') return i.update({ components: [buildChannels(s)], flags: MessageFlags.IsComponentsV2 });
      if (customId === 'ts_roles') return i.update({ components: [buildRoles(s)], flags: MessageFlags.IsComponentsV2 });
      if (customId === 'ts_modal_setup') return i.update({ components: [buildModalSetup(s)], flags: MessageFlags.IsComponentsV2 });
      if (customId === 'ts_welcome') return i.update({ components: [buildWelcome(s)], flags: MessageFlags.IsComponentsV2 });
      if (customId === 'ts_transcripts') return i.update({ components: [buildTranscripts(s)], flags: MessageFlags.IsComponentsV2 });

      if (customId === 'ts_toggle') { save({ enabled: !s.enabled }); return i.update({ components: [buildDashboard(s, guild)], flags: MessageFlags.IsComponentsV2 }); }
      if (customId === 'ts_reset') { if (client.db.ticket) client.db.ticket.delete(guild.id); s = getSettings(client, guild.id); return i.update({ components: [buildDashboard(s, guild)], flags: MessageFlags.IsComponentsV2 }); }

      if (customId === 'ts_post') {
        const ch = s.panelChannelId ? guild.channels.cache.get(s.panelChannelId) : null;
        if (!ch) return i.reply({ content: '❌ Set a Panel Channel first (Channels section).', flags: 64 });
        await ch.send({ components: [buildTicketPanel(s, guild.id)], flags: MessageFlags.IsComponentsV2 });
        return i.reply({ content: `✅ Ticket panel posted to <#${ch.id}>!`, flags: 64 });
      }

      if (customId === 'ts_type_button')   { save({ panelType: 'button' });   return i.update({ components: [buildPanelSetup(s)], flags: MessageFlags.IsComponentsV2 }); }
      if (customId === 'ts_type_dropdown') { save({ panelType: 'dropdown' }); return i.update({ components: [buildPanelSetup(s)], flags: MessageFlags.IsComponentsV2 }); }

      if (customId === 'ts_modal_toggle')     { save({ modalEnabled: !s.modalEnabled });         return i.update({ components: [buildModalSetup(s)],  flags: MessageFlags.IsComponentsV2 }); }
      if (customId === 'ts_welcome_toggle')   { save({ welcomeEnabled: !s.welcomeEnabled });     return i.update({ components: [buildWelcome(s)],     flags: MessageFlags.IsComponentsV2 }); }
      if (customId === 'ts_transcript_toggle'){ save({ transcriptEnabled: !s.transcriptEnabled });return i.update({ components: [buildTranscripts(s)], flags: MessageFlags.IsComponentsV2 }); }

      if (customId === 'ts_limit_1') { save({ ticketLimit: 1 }); return i.update({ components: [buildRoles(s)], flags: MessageFlags.IsComponentsV2 }); }
      if (customId === 'ts_limit_3') { save({ ticketLimit: 3 }); return i.update({ components: [buildRoles(s)], flags: MessageFlags.IsComponentsV2 }); }
      if (customId === 'ts_limit_5') { save({ ticketLimit: 5 }); return i.update({ components: [buildRoles(s)], flags: MessageFlags.IsComponentsV2 }); }

      if (customId === 'ts_ch_panel')      { save({ panelChannelId: i.values[0] });      return i.update({ components: [buildChannels(s)],    flags: MessageFlags.IsComponentsV2 }); }
      if (customId === 'ts_ch_category')   { save({ ticketCategoryId: i.values[0] });    return i.update({ components: [buildChannels(s)],    flags: MessageFlags.IsComponentsV2 }); }
      if (customId === 'ts_ch_log')        { save({ logChannelId: i.values[0] });        return i.update({ components: [buildChannels(s)],    flags: MessageFlags.IsComponentsV2 }); }
      if (customId === 'ts_ch_transcript') { save({ transcriptChannelId: i.values[0] }); return i.update({ components: [buildTranscripts(s)], flags: MessageFlags.IsComponentsV2 }); }
      if (customId === 'ts_role_support')  { save({ supportRoleId: i.values[0] });       return i.update({ components: [buildRoles(s)],       flags: MessageFlags.IsComponentsV2 }); }

      const MODALS = {
        'ts_edit_title':    ['tsm_title',    'Edit Panel Title',     'Support Tickets',                              s.panelTitle],
        'ts_edit_desc':     ['tsm_desc',     'Edit Description',     'Click below to open a support ticket.',        s.panelDescription],
        'ts_edit_footer':   ['tsm_footer',   'Edit Footer',          'Powered by Chill',                            s.panelFooter || ''],
        'ts_edit_color':    ['tsm_color',    'Edit Color (hex)',     '#FFFFFF',                                     s.panelColor],
        'ts_edit_question': ['tsm_question', 'Edit Modal Question',  'What do you need help with?',                 s.modalQuestion],
        'ts_edit_welcome':  ['tsm_welcome',  'Edit Welcome Message', 'Hey {user}, a staff member will be with you.', s.welcomeMessage]
      };
      if (MODALS[customId]) {
        const [id, title, placeholder, current] = MODALS[customId];
        const modal = new ModalBuilder().setCustomId(id).setTitle(title).addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId('ts_input').setLabel(title).setStyle(TextInputStyle.Paragraph)
              .setPlaceholder(placeholder).setValue(current || '').setRequired(true).setMaxLength(500)
          )
        );
        return i.showModal(modal);
      }
    });

    collector.on('end', () => {
      msg.edit({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `**Ticket System Dashboard**\n*Session expired. Run \`ticket setup\` to reopen.*`
      ))], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
    });
  },

  async _openTicket(interaction, client) {
    const { guild, member } = interaction;
    const s = getSettings(client, guild.id);
    if (!s.enabled) return interaction.reply({ content: '❌ The ticket system is currently disabled.', flags: 64 });
    const open = client.db.tickets ? client.db.tickets.getByUser(guild.id, member.id) : [];
    if (open.length >= (s.ticketLimit || 1)) return interaction.reply({ content: `❌ You already have **${open.length}** open ticket${open.length !== 1 ? 's' : ''}. Close existing ones first.`, flags: 64 });

    if (s.modalEnabled) {
      const modal = new ModalBuilder().setCustomId(`ticket_modal_${guild.id}`).setTitle('Open a Ticket').addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('ticket_question').setLabel(s.modalQuestion || 'What do you need help with?').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(1000)
        )
      );
      return interaction.showModal(modal);
    }

    await interaction.deferReply({ flags: 64 });
    return this._createChannel(interaction, client, s, null);
  },

  async _createChannel(interaction, client, s, modalAnswer) {
    const { guild, member, user } = interaction;
    const all = client.db.tickets ? client.db.tickets.getByGuild(guild.id) : [];
    const num = all.length + 1;

    const perms = [
      { id: guild.roles.everyone.id, deny: [PermissionsBitField.Flags.ViewChannel] },
      { id: member.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] }
    ];
    if (guild.members.me) perms.push({ id: guild.members.me.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ManageChannels, PermissionsBitField.Flags.ReadMessageHistory] });
    if (s.supportRoleId) perms.push({ id: s.supportRoleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.ManageMessages] });

    const ch = await guild.channels.create({
      name: `ticket-${num.toString().padStart(4, '0')}`,
      type: ChannelType.GuildText,
      parent: s.ticketCategoryId || null,
      permissionOverwrites: perms,
      topic: `Ticket #${num} | ${user.username}`
    }).catch(() => null);

    if (!ch) return (interaction.editReply || interaction.followUp).call(interaction, { content: '❌ Failed to create channel. Check permissions.', flags: 64 }).catch(() => {});

    if (client.db.tickets) client.db.tickets.set(ch.id, { channelId: ch.id, guildId: guild.id, userId: member.id, claimedBy: null, createdAt: new Date().toISOString(), status: 'open' });

    if (s.welcomeEnabled !== false) await ch.send({ components: [buildTicketChannel(s, user, guild, num)], flags: MessageFlags.IsComponentsV2 });
    if (modalAnswer) await ch.send({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Your question:**\n${modalAnswer}`))], flags: MessageFlags.IsComponentsV2 });

    if (s.logChannelId) {
      const lch = guild.channels.cache.get(s.logChannelId);
      if (lch) lch.send({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Ticket Opened**\nUser: <@${member.id}> | Channel: <#${ch.id}>`))], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
    }

    const reply = interaction.editReply ? interaction.editReply.bind(interaction) : interaction.reply.bind(interaction);
    return reply({ content: `✅ Ticket created: <#${ch.id}>`, flags: 64 }).catch(() => {});
  },

  async _closeTicket(interaction, client) {
    const { guild, channel, member } = interaction;
    const ticket = client.db.tickets ? client.db.tickets.get(channel.id) : null;
    if (!ticket) return interaction.reply({ content: '❌ This is not a ticket channel.', flags: 64 });
    await interaction.deferReply({ flags: 64 });
    return this._doClose(channel, guild, member, client);
  },

  async _doClose(channel, guild, member, client) {
    const s = getSettings(client, guild.id);
    const ticket = client.db.tickets ? client.db.tickets.get(channel.id) : null;

    if (s.transcriptEnabled) {
      const msgs = await channel.messages.fetch({ limit: 100 }).catch(() => null);
      if (msgs) {
        const text = [...msgs.values()].reverse().map(m => `[${new Date(m.createdTimestamp).toISOString().slice(0,19)}] ${m.author.username}: ${m.content || '[media]'}`).join('\n');
        const tch = s.transcriptChannelId ? guild.channels.cache.get(s.transcriptChannelId) : null;
        if (tch) tch.send({ content: `Transcript: \`${channel.name}\` | User: <@${ticket?.userId || 'unknown'}>`, files: [{ attachment: Buffer.from(text, 'utf-8'), name: `${channel.name}.txt` }] }).catch(() => {});
      }
    }

    if (s.logChannelId) {
      const lch = guild.channels.cache.get(s.logChannelId);
      if (lch) lch.send({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Ticket Closed**\nChannel: \`${channel.name}\` | Closed by: <@${member.id || member.user?.id}>` ))], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
    }

    if (client.db.tickets) client.db.tickets.delete(channel.id);
    setTimeout(() => channel.delete(`Ticket closed by ${member.username || member.user?.username}`).catch(() => {}), 3000);
  },

  async _claimTicket(interaction, client) {
    const { guild, channel, member } = interaction;
    const ticket = client.db.tickets ? client.db.tickets.get(channel.id) : null;
    if (!ticket) return interaction.reply({ content: '❌ This is not a ticket channel.', flags: 64 });
    if (ticket.claimedBy) return interaction.reply({ content: `❌ Already claimed by <@${ticket.claimedBy}>.`, flags: 64 });
    const s = getSettings(client, guild.id);
    if (s.supportRoleId && !member.roles.cache.has(s.supportRoleId) && !member.permissions.has(PermissionsBitField.Flags.ManageGuild)) return interaction.reply({ content: '❌ Only support staff can claim tickets.', flags: 64 });
    ticket.claimedBy = member.id;
    if (client.db.tickets) client.db.tickets.set(channel.id, ticket);
    return interaction.reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Ticket Claimed**\nThis ticket has been claimed by <@${member.id}>.`))], flags: MessageFlags.IsComponentsV2 });
  }
};
