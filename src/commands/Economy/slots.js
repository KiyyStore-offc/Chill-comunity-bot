const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags
} = require('discord.js');

const {
  getEcoData,
  saveEcoData,
  formatNumber
} = require('../../utils/economyUtils.js');

const SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '🔔', '⭐', '7️⃣', '💎'];

const PAYOUTS = {
  '💎': 10,
  '7️⃣': 5,
  '⭐': 4,
  '🔔': 3,
  '🍇': 2.5,
  '🍊': 2,
  '🍋': 1.5,
  '🍒': 1.2
};

const SPIN_FRAMES = [
  '🎰 | ❓ | ❓ | ❓ |',
  '🎰 | 🌀 | 🌀 | 🌀 |',
  '🎰 | ⚡ | ⚡ | ⚡ |',
  '🎰 | 🍒 | ❓ | 💎 |',
  '🎰 | ⭐ | 🍋 | 🔔 |'
];

module.exports = {
  name: 'slots',
  aliases: ['slot', 'jackpot'],
  category: 'Economy',
  description: 'Play the slot machine',
  cooldown: 5,

  slashOptions: [
    {
      name: 'amount',
      description: 'Amount to bet',
      type: 4,
      required: true,
      min_value: 10
    }
  ],

  async slashExecute(interaction, client) {
    await interaction.deferReply();

    return this._run(
      {
        author: interaction.user,
        editReply: (o) => interaction.editReply(o),
        isSlash: true
      },
      interaction.options.getInteger('amount'),
      client
    );
  },

  async execute(message, args, client) {
    return this._run(
      message,
      parseInt(args[0]),
      client
    );
  },

  async _run(ctx, amount, client) {
    const userId = (ctx.author || ctx.user).id;

    if (!amount || amount < 10) {
      const c = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            '❌ Minimum bet is **10** coins.'
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

    const eco = getEcoData(client, userId);

    if ((eco.wallet || 0) < amount) {
      const c = new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `❌ You only have \`${formatNumber(eco.wallet || 0)}\` coins.`
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

    const makeSpinContainer = (frame) => {
      return new ContainerBuilder()
        .addTextDisplayComponents(
          new TextDisplayBuilder().setContent(
            `### 🎰 Spinning...\n` +
            `\`${frame}\`\n\n` +
            `> Pulling the lever...\n` +
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

    const spin = () =>
      SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];

    const [s1, s2, s3] = [
      spin(),
      spin(),
      spin()
    ];

    let winAmount = 0;
    let msg;

    if (s1 === s2 && s2 === s3) {
      const mult = PAYOUTS[s1] || 1.5;

      winAmount = Math.floor(amount * mult);

      eco.wallet =
        (eco.wallet || 0) - amount + winAmount;

      eco.totalEarned =
        (eco.totalEarned || 0) + (winAmount - amount);

      msg =
        `### 🎰 JACKPOT!\n\n` +
        `# ${s1} ${s1} ${s1}\n\n` +
        `💎 Multiplier: \`${mult}x\`\n` +
        `💰 Won: \`${formatNumber(winAmount)}\`\n` +
        `👛 Wallet: \`${formatNumber(eco.wallet)}\`\n\n` +
        `-# Chill Economy`;

    } else if (
      s1 === s2 ||
      s2 === s3 ||
      s1 === s3
    ) {
      winAmount = Math.floor(amount * 1.5);

      eco.wallet =
        (eco.wallet || 0) - amount + winAmount;

      eco.totalEarned =
        (eco.totalEarned || 0) + (winAmount - amount);

      msg =
        `### 🎰 Small Win!\n\n` +
        `# ${s1} ${s2} ${s3}\n\n` +
        `💰 Won: \`${formatNumber(winAmount)}\`\n` +
        `👛 Wallet: \`${formatNumber(eco.wallet)}\`\n\n` +
        `-# Chill Economy`;

    } else {
      eco.wallet =
        Math.max(
          0,
          (eco.wallet || 0) - amount
        );

      msg =
        `### 🎰 No Match!\n\n` +
        `# ${s1} ${s2} ${s3}\n\n` +
        `💸 Lost: \`${formatNumber(amount)}\`\n` +
        `👛 Wallet: \`${formatNumber(eco.wallet)}\`\n\n` +
        `-# Chill Economy`;
    }

    saveEcoData(client, userId, eco);

    const resultContainer = new ContainerBuilder()
      .addTextDisplayComponents(
        new TextDisplayBuilder().setContent(msg)
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
