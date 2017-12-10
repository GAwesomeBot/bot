module.exports = async ({ bot, configJS }, msg, commandData) => {
	msg.reply({
		embed: {
			color: 0x43B581,
			title: `Thanks for choosing ${bot.user.tag}! 😊`,
			description: `Click [here](${configJS.oauthLink.format({ id: bot.user.id })}) to invite me to your server!`,
		},
	});
};
