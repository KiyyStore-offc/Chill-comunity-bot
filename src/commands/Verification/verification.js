const {
  ContainerBuilder, TextDisplayBuilder, SeparatorBuilder, MessageFlags,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ComponentType
} = require('discord.js');
const emoji = require('../../emojis.js');

module.exports = {
  name: 'verification',
  aliases: ['vsetup', 'versetup'],
  category: 'Verification',
  description: 'Set up the verification system for your server',
  userPerms: ['ManageGuild'],
  cooldown: 5,
  slashOptions: [
    {
      name: 'action',
      description: 'Action to perform',
      type: 3,
      required: false,
      choices: [
        { name: 'setup', value: 'setup' },
        { name: 'enable', value: 'enable' },
        { name: 'disable', value: 'disable' },
        { name: 'status', value: 'status' },
        { name: 'reset', value: 'reset' },
        { name: 'panel', value: 'panel' }
      ]
    }
  ],

  async slashExecute(interaction, client) {
    const action = interaction.options.getString('action') || 'status';
    return this._run(interaction, action, client, true);
  },
  async execute(message, args, client, prefix) {
    const action = args[0]?.toLowerCase() || 'status';
    return this._run(message, action, client, false);
  },

  async _run(ctx, action, client, isSlash) {
    const guildId = ctx.guild.id;
    const settings = client.db.verification ? client.db.verification.get(guildId) : null;
    const current = settings || {
      guildId, enabled: false, channelId: null, roleId: null, messageId: null,
      style: 'button', buttonLabel: 'Verify', buttonColor: 'green',
      embedTitle: 'Verification', embedDesc: 'Click the button below to verify yourself.'
    };

    const reply = async (opts) => {
      if (isSlash) {
        if (ctx.replied || ctx.deferred) return ctx.followUp(opts);
        return ctx.reply(opts);
      }
      return ctx.channel.send(opts);
    };

    if (action === 'setup') {
      const styleSelect = new StringSelectMenuBuilder()
        .setCustomId('ver_style_select')
        .setPlaceholder('Select Verification Style...')
        .addOptions([
          { label: '🔘 Button Verification', value: 'button', description: 'User clicks a button to verify' },
          { label: '🤖 React Verification', value: 'react', description: 'User reacts to a message' },
        ]);

      const colorSelect = new StringSelectMenuBuilder()
        .setCustomId('ver_color_select')
        .setPlaceholder('Button Color...')
        .addOptions([
          { label: '🟢 Green', value: 'green' },
          { label: '🔵 Blue', value: 'blue' },
          { label: '🔴 Red', value: 'red' },
          { label: '⬜ Grey', value: 'grey' }
        ]);

      const enableBtn = new ButtonBuilder().setCustomId('ver_enable').setLabel('Enable').setStyle(ButtonStyle.Success);
      const disableBtn = new ButtonBuilder().setCustomId('ver_disable').setLabel('Disable').setStyle(ButtonStyle.Danger);
      const sendPanelBtn = new ButtonBuilder().setCustomId('ver_send_panel').setLabel('Send Panel').setStyle(ButtonStyle.Primary).setEmoji('🔐');

      const row1 = new ActionRowBuilder().addComponents(styleSelect);
      const row2 = new ActionRowBuilder().addComponents(colorSelect);
      const row3 = new ActionRowBuilder().addComponents(enableBtn, disableBtn, sendPanelBtn);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `### 🔐 Chill Verification — Setup\n` +
          `**Server:** ${ctx.guild.name}\n` +
          `**Status:** ${current.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
          `**Channel:** ${current.channelId ? `<#${current.channelId}>` : '`Not Set`'}\n` +
          `**Role:** ${current.roleId ? `<@&${current.roleId}>` : '`Not Set`'}\n` +
          `**Style:** \`${current.style}\`\n` +
          `**Button Color:** \`${current.buttonColor}\`\n\n` +
          `> Use the menus and buttons below to configure.\n-# Chill Verification • Developed by AkiForver`
        ))
        .addSeparatorComponents(new SeparatorBuilder())
        .addActionRowComponents(row1)
        .addActionRowComponents(row2)
        .addActionRowComponents(row3);

      return reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
    }

    if (action === 'enable') {
      if (client.db.verification) client.db.verification.set(guildId, { ...current, enabled: true });
      return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ✅ Verification Enabled\nThe verification system is now active.\n-# Chill Verification`))], flags: MessageFlags.IsComponentsV2 });
    }

    if (action === 'disable') {
      if (client.db.verification) client.db.verification.set(guildId, { ...current, enabled: false });
      return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ❌ Verification Disabled\n-# Chill Verification`))], flags: MessageFlags.IsComponentsV2 });
    }

    if (action === 'panel') {
      if (!current.channelId || !current.roleId) {
        return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} Please set a verification channel and role first.\nUse \`vsetup channel #channel\` and \`vsetup role @role\`.`))], flags: MessageFlags.IsComponentsV2 });
      }
      const verChannel = ctx.guild.channels.cache.get(current.channelId);
      if (!verChannel) return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`${emoji.cross} Verification channel not found.`))], flags: MessageFlags.IsComponentsV2 });

      const colorMap = { green: ButtonStyle.Success, blue: ButtonStyle.Primary, red: ButtonStyle.Danger, grey: ButtonStyle.Secondary };
      const verBtn = new ButtonBuilder()
        .setCustomId('verify_button')
        .setLabel(current.buttonLabel || 'Verify')
        .setStyle(colorMap[current.buttonColor] || ButtonStyle.Success)
        .setEmoji('✅');

      const panelRow = new ActionRowBuilder().addComponents(verBtn);
      const panelContainer = new ContainerBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
          `### 🔐 ${current.embedTitle || 'Verification'}\n${current.embedDesc || 'Click the button below to verify yourself.'}\n\n-# Chill Verification • Developed by AkiForver`
        ))
        .addSeparatorComponents(new SeparatorBuilder())
        .addActionRowComponents(panelRow);

      const panelMsg = await verChannel.send({ components: [panelContainer], flags: MessageFlags.IsComponentsV2 });
      if (client.db.verification) client.db.verification.set(guildId, { ...current, messageId: panelMsg.id, enabled: true });

      return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ✅ Verification Panel Sent\nPanel has been sent to <#${verChannel.id}>.\n-# Chill Verification • Developed by AkiForver`))], flags: MessageFlags.IsComponentsV2 });
    }

    if (action === 'reset') {
      if (client.db.verification) client.db.verification.delete(guildId);
      return reply({ components: [new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 🔄 Verification Reset\nAll verification settings cleared.\n-# Chill Verification`))], flags: MessageFlags.IsComponentsV2 });
    }

    const container = new ContainerBuilder()
      .addTextDisplayComponents(new TextDisplayBuilder().setContent(
        `### 🔐 Verification Status — ${ctx.guild.name}\n` +
        `**Status:** ${current.enabled ? '✅ Enabled' : '❌ Disabled'}\n` +
        `**Channel:** ${current.channelId ? `<#${current.channelId}>` : '`Not Set`'}\n` +
        `**Role:** ${current.roleId ? `<@&${current.roleId}>` : '`Not Set`'}\n` +
        `**Style:** \`${current.style || 'button'}\`\n` +
        `**Button:** \`${current.buttonLabel || 'Verify'}\` (${current.buttonColor || 'green'})\n\n` +
        `-# Chill Verification • Developed by AkiForver`
      ));
    return reply({ components: [container], flags: MessageFlags.IsComponentsV2 });
  },

  async componentsV2(interaction, client) {
    const { customId, guild } = interaction;
    const guildId = guild.id;

    if (!interaction.member.permissions.has(0x20n)) {
      return interaction.reply({ content: '❌ You need Manage Server permission.', flags: MessageFlags.Ephemeral });
    }

    const settings = client.db.verification ? client.db.verification.get(guildId) : null;
    const current = settings || { guildId, style: 'button', buttonColor: 'green', enabled: false };

    const respond = async (text) => {
      const c = new ContainerBuilder().addTextDisplayComponents(new TextDisplayBuilder().setContent(text));
      if (interaction.replied || interaction.deferred) return interaction.followUp({ components: [c], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
      return interaction.reply({ components: [c], flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2 });
    };

    if (customId === 'ver_enable') { if (client.db.verification) client.db.verification.set(guildId, { ...current, enabled: true }); return respond('### ✅ Verification Enabled'); }
    if (customId === 'ver_disable') { if (client.db.verification) client.db.verification.set(guildId, { ...current, enabled: false }); return respond('### ❌ Verification Disabled'); }
    if (customId === 'ver_style_select') { const v = interaction.values?.[0]; if (client.db.verification) client.db.verification.set(guildId, { ...current, style: v }); return respond(`### ✅ Style set to \`${v}\``); }
    if (customId === 'ver_color_select') { const v = interaction.values?.[0]; if (client.db.verification) client.db.verification.set(guildId, { ...current, buttonColor: v }); return respond(`### ✅ Button color set to \`${v}\``); }
  }
};
