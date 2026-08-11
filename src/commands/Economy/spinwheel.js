const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags
} = require('discord.js');

const {
  getEcoData,
  saveEcoData,
  WHEEL_PRIZES,
  formatNumber
} = require('../../utils/economyUtils.js');

const WHEEL_CD = 3600000;

const SPIN_FRAMES = [
  '◜ 🎡 ◝',
  '◠ 🎡 ◡',
  '◟ 🎡 ◞',
  '◡ 🎡 ◠',
  '◜ 💫 ◝',
  '◟ ⚡ ◞'
];

module.exports = {
  name: 'spinwheel',
  aliases: ['wheel', 'fortunewheel'],
  category: 'Economy',
  description: 'Spin the prize wheel once per hour for free coins',
  cooldown: 5,
  slashOptions: [],

  async slashExecute(interaction, client) {
    await interaction.deferReply();

    return this._run(
      {
        author: interaction.user,
        editReply: (o) => interaction.editReply(o),
        isSlash: true
      },
      client
    );
  },

  async execute(message, args, client) {
    return this._run(message, client);
  },

  async _run(ctx, client) {
    const userId = (ctx.author || ctx.user).id;

    const eco = getEcoData(client, userId);

    const lastSpin = eco.lastSpinWheel;

    if (lastSpin) {
      const diff =
        Date.now() -
        new Date(lastSpin).getTime();

      if (diff < WHEEL_CD) {
        const left = WHEEL_CD - diff;

        const m = Math.floor(left / 60000);

        const s = Math.floor(
          (left % 60000) / 1000
        );

        const c = new ContainerBuilder()
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
              `### 🎡 Wheel on Cooldown\n` +
              `Next spin in: \`${m}m ${s}s\`\n\n` +
              `-# Chill Economy`
            )
          );

        return ctx.isSlash
          ? ctx.editReply({
              components: [c],
              flags: MessageFlags.IsComponentsV2
            })
          : ctx.reply({
              components: [c],
              flags: MessageFlags.IsComponentsV2
            });
      }
    }

    const makeSpinContainer = (frame) => {
      return new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `### 🎡 Spinning The Wheel...\n\n` +
            `\`${frame}\`\n\n` +
            `╭───────────────╮\n` +
            `│ 💎 🍒 ⭐ 🔔 │\n` +
            `│ 🍋 🎁 💰 🍇 │\n` +
            `╰───────────────╯\n\n` +
            `> The wheel is spinning...\n` +
            `-# Chill Economy`
          )
        );
    };

    let sentMsg = null;

    if (ctx.isSlash) {
      await ctx.editReply({
        components: [makeSpinContainer(SPIN_FRAMES[0])],
        flags: MessageFlags.IsComponentsV2
      });
    } else {
      sentMsg = await ctx.reply({
        components: [makeSpinContainer(SPIN_FRAMES[0])],
        flags: MessageFlags.IsComponentsV2
      });
    }

    for (let i = 1; i < SPIN_FRAMES.length; i++) {
      await new Promise(r => setTimeout(r, 700));

      try {
        if (ctx.isSlash) {
          await ctx.editReply({
            components: [makeSpinContainer(SPIN_FRAMES[i])],
            flags: MessageFlags.IsComponentsV2
          });
        } else {
          await sentMsg.edit({
            components: [makeSpinContainer(SPIN_FRAMES[i])],
            flags: MessageFlags.IsComponentsV2
          });
        }
      } catch {}
    }

    const landedIndex =
      Math.floor(
        Math.random() *
        WHEEL_PRIZES.length
      );

    const prize =
      WHEEL_PRIZES[landedIndex];

    eco.lastSpinWheel =
      new Date().toISOString();

    if (prize.coins > 0) {
      eco.wallet =
        (eco.wallet || 0) + prize.coins;

      eco.totalEarned =
        (eco.totalEarned || 0) +
        prize.coins;

      client.db.transactions?.add(
        userId,
        'spinwheel',
        prize.coins,
        'Won spin wheel'
      );
    }

    saveEcoData(client, userId, eco);

    const resultText =
      prize.coins > 0
        ? `### 🎡 Spin Result!\n\n` +
          `🎯 Landed On: **${prize.label}**\n\n` +
          `💰 Won: \`${formatNumber(prize.coins)}\` coins\n` +
          `👛 Wallet: \`${formatNumber(eco.wallet)}\`\n\n` +
          `-# Chill Economy`
        : `### 🎡 Spin Result!\n\n` +
          `💥 Landed On: **BUST**\n\n` +
          `No coins this time.\n` +
          `Try again in 1 hour.\n\n` +
          `-# Chill Economy`;

    const resultContainer =
      new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            resultText
          )
        );

    try {
      if (ctx.isSlash) {
        return await ctx.editReply({
          components: [resultContainer],
          flags: MessageFlags.IsComponentsV2
        });
      }

      return await sentMsg.edit({
        components: [resultContainer],
        flags: MessageFlags.IsComponentsV2
      });

    } catch (err) {
      console.error(err);
    }
  }
};
