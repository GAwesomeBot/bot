const { Giphy } = require("../../Modules");

module.exports = async ({ Constants: { Colors, Text } }, { serverDocument: { config: { moderation: { isEnabled: moderationIsEnabled, filters: { nsfw_filter } } } } }, msg, commandData) => {
	if (msg.suffix) {
		await msg.send({
			embed: {
				color: Colors.INFO,
				title: `Searching for a gif...`,
				description: `Please stand by!`,
			},
		});
		try {
			const data = await Giphy(msg.suffix, moderationIsEnabled && nsfw_filter.isEnabled && !nsfw_filter.disabled_channel_ids.includes(msg.channel.id) && !msg.channel.nsfw ? "pg-13" : "r");
			msg.send({
				embed: {
					color: Colors.RESPONSE,
					image: {
						url: data.image_url,
					},
					description: `Here is your \`${msg.suffix}\` GIF.\nClick [here](${data.image_url}) for the direct URL`,
					footer: {
						text: `Powered by GIPHY!`,
					},
				},
			});
		} catch (err) {
			switch (err.code) {
				case "NO_GIPHY_RESULT": {
					logger.verbose(`No GIFs found for "${msg.suffix}" search`, { svrid: msg.guild.id, chid: msg.channel.id, usrid: msg.author.id });
					return msg.send({
						embed: {
							color: Colors.SOFT_ERR,
							description: `The internet has ran out of gifs or I was unable to find one! (╯°□°）╯︵ ┻━┻`,
						},
					});
				}
			}
			return msg.send({
				embed: {
					color: Colors.SOFT_ERR,
					description: `I received this error:\`\`\`js\n${err.message || err}\`\`\``,
				},
			});
		}
	} else {
		msg.sendInvalidUsage(commandData, "Forgot something...? 🤔");
	}
};
