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
  name: 'balance',
  aliases: ['bal', 'wallet', 'money'],
  category: 'Economy',
  description: 'Check your or someone else\'s balance',
  cooldown: 5,

  slashOptions: [
    {
      name: 'user',
      description: 'User to check',
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
        editReply: (o) => interaction.editReply(o)
      },
      target,
      client,
      true
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
      client,
      false
    );
  },

  async _run(ctx, target, client, isDeferred) {
    const eco = getEcoData(client, target.id);

    const wallet = eco.wallet || 0;
    const bank = eco.bank || 0;
    const net = wallet + bank;

    const level = eco.level || 0;
    const xp = eco.xp || 0;
    const streak = eco.dailyStreak || 0;

    const text =
      `### 💳 ${target.username}'s Balance\n\n` +

      `💰 Wallet: \`${formatNumber(wallet)}\`\n` +
      `🏦 Bank: \`${formatNumber(bank)}\`\n` +
      `💎 Net Worth: \`${formatNumber(net)}\`\n\n` +

      `📈 Level: \`${formatNumber(level)}\`\n` +
      `✨ XP: \`${formatNumber(xp)}\`\n` +
      `🔥 Daily Streak: \`${formatNumber(streak)}\`\n\n` +

      `-# Chill Economy • Developed by AkiForver`;

    const container = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(text)
      )
      .addSeparatorComponents(
        new SeparatorBuilder()
      );

    const opts = {
      components: [container],
      flags: MessageFlags.IsComponentsV2
    };

    try {
      if (isDeferred) {
        return await ctx.editReply(opts);
      }

      return await ctx.reply(opts);

    } catch (err) {
      console.error('Balance Command Error:', err);

      try {
        if (isDeferred) {
          return await ctx.editReply({
            content: '❌ Failed to load balance.'
          });
        }

        return await ctx.reply({
          content: '❌ Failed to load balance.'
        });

      } catch {}
    }
  }
};
