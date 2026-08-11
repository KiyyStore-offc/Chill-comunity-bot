const { Routes } = require('discord.js');

module.exports = {
    name: "clientReady",
    run: async (client) => {
        const updateBio = async () => {
            try {
                const bio = `**.*<:emoji_47:1497366247145340979> \`\`Chill\`\` is your ultimate multipurpose bot providing high quality music from over 6 sources,\nAnd automod etc. to give you a next level experience.*........…...............**\n\n<:LightPinkDot:1497349226513043536> **support server - https://discord.gg/bAR4RksMRm**. **Tos soon..**`;

                await client.application.edit({
                    description: bio
                });

                client.logger.log(`Bot bio updated.`, "ready");
            } catch (error) {
                client.logger.log(`Failed to update bot bio: ${error.message}`, "error");
            }
        };

        await updateBio();

        setInterval(updateBio, 60 * 60 * 1000);
    },
};
