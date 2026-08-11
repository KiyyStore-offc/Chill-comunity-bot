const {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags
} = require('discord.js');

const {
  getEcoData,
  formatNumber
} = require('../../utils/economyUtils.js');

module.exports = {
  name: 'eprofile',
  aliases: ['econprofile', 'profile', 'ep'],
  category: 'Economy',
  description: 'View your or someone\'s economy profile',
  cooldown: 10,

  slashOptions: [
    {
      name: 'user',
      description: 'User to view',
      type: 6,
      required: false
    }
  ],

  async slashExecute(interaction, client) {
    await interaction.deferReply();

    const target =
      interaction.options.getUser('user') ||
      interaction.user;

    return this._run(
      {
        author: interaction.user,
        editReply: (o) => interaction.editReply(o),
        isSlash: true
      },
      target,
      client
    );
  },

  async execute(message, args, client) {
    let target = message.author;

    if (message.mentions.users.first()) {
      target = message.mentions.users.first();
    } else if (args[0]) {
      target = await client.users
        .fetch(args[0])
        .catch(() => message.author);
    }

    return this._run(
      message,
      target,
      client
    );
  },

  async _run(ctx, target, client) {
    const eco =
      getEcoData(client, target.id);

    const wallet =
      eco.wallet || 0;

    const bank =
      eco.bank || 0;

    const net =
      wallet + bank;

    const level =
      eco.level || 1;

    const xp =
      eco.xp || 0;

    const prestige =
      eco.prestige || 0;

    const totalEarned =
      eco.totalEarned || 0;

    const totalLost =
      eco.totalLost || 0;

    const streak =
      eco.dailyStreak || 0;

    const profileText =
      `## 👤 Economy Profile\n\n` +

      `### ${target.username}\n\n` +

      `╭──────── Financial ────────╮\n` +
      `│ 💵 Wallet: \`${formatNumber(wallet)}\`\n` +
      `│ 🏦 Bank: \`${formatNumber(bank)}\`\n` +
      `│ 💠 Net Worth: \`${formatNumber(net)}\`\n` +
      `╰──────────────────────────╯\n\n` +

      `╭──────── Progression ─────╮\n` +
      `│ 📈 Level: \`${formatNumber(level)}\`\n` +
      `│ ✨ XP: \`${formatNumber(xp)}\`\n` +
      `│ 🌟 Prestige: \`${formatNumber(prestige)}\`\n` +
      `╰──────────────────────────╯\n\n` +

      `╭──────── Statistics ──────╮\n` +
      `│ 📊 Earned: \`${formatNumber(totalEarned)}\`\n` +
      `│ 📉 Lost: \`${formatNumber(totalLost)}\`\n` +
      `│ 🔥 Daily Streak: \`${formatNumber(streak)}\`\n` +
      `╰──────────────────────────╯\n\n` +

      `-# Chill Economy • Developed by AkiForver`;

    const container =
      new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder()
            .setContent(profileText)
        )
        .addSeparatorComponents(
          new SeparatorBuilder()
        );

    const opts = {
      components: [container],
      flags: MessageFlags.IsComponentsV2
    };

    try {
      if (ctx.isSlash) {
        return await ctx.editReply(opts);
      }

      return await ctx.reply(opts);

    } catch (err) {
      console.error(
        'Economy Profile Error:',
        err
      );

      try {
        if (ctx.isSlash) {
          return await ctx.editReply({
            content:
              '❌ Failed to load economy profile.'
          });
        }

        return await ctx.reply({
          content:
            '❌ Failed to load economy profile.'
        });

      } catch {}
    }
  }
};
