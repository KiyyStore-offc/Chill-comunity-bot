const {
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
} = require('discord.js');

module.exports = {
    name: 'timer',
    description: 'Set a timer for a specific duration.',
    category: 'Utility',
    usage: 'timer <duration> [label]',
    example: 'timer 10m Take out the trash',
    aliases: ['remindme', 'tm'],

    async execute(message, args, client) {
        const durationStr = args[0];
        const label = args.slice(1).join(' ') || null;

        if (!durationStr) {
            const display = new TextDisplayBuilder().setContent(`${client.emoji.warn} Please provide a duration! Format: \`timer <duration> [label]\``);
            return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
        }

        const durationMs = parseDuration(durationStr);

        if (!durationMs) {
            const display = new TextDisplayBuilder().setContent(`${client.emoji.warn} Invalid duration format! Use \`s\`, \`m\`, \`h\`, or \`d\`. Example: \`10m\`, \`2h\``);
            return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
        }

        if (durationMs > 86400000) {
            const display = new TextDisplayBuilder().setContent(`${client.emoji.warn} Timers are limited to 24 hours as they don't persist after restarts.`);
            return message.reply({ components: [new ContainerBuilder().addTextDisplayComponents(display)], flags: MessageFlags.IsComponentsV2 });
        }

        const endTimeUnix = Math.floor((Date.now() + durationMs) / 1000);
        const labelLine = label ? `\n**Label:** ${label}` : '';

        const startContainer = new ContainerBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                `### ⏱️ Timer Set!\n` +
                `**Ends:** <t:${endTimeUnix}:R> (<t:${endTimeUnix}:T>)` +
                `${labelLine}\n\n` +
                `-# I'll mention you when it's done.`
            ));

        await message.reply({
            components: [startContainer],
            flags: MessageFlags.IsComponentsV2
        });

        setTimeout(async () => {
            try {
                await message.channel.send(
                    `⏰ ${message.author} your timer has ended!${label ? ` **${label}**` : ''}`
                );
            } catch (err) {
                console.error('[Timer] Failed to send reminder:', err.message);
            }
        }, durationMs);
    }
};

function parseDuration(str) {
    const units = { 's': 1000, 'm': 60000, 'h': 3600000, 'd': 86400000 };
    const match = str.toLowerCase().match(/^(\d+)([smhd])$/);
    return match ? parseInt(match[1]) * units[match[2]] : null;
}
