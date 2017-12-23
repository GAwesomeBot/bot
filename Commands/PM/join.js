module.exports = async ({ bot, configJS, Constants: { Colors } }, msg, commandData) => {
	msg.reply({
		embed: {
			color: Colors.LIGHT_GREEN,
			title: `Thanks for choosing ${bot.user.tag}! 😊`,
			description: `Click [here](${configJS.oauthLink.format({ id: bot.user.id })}) to invite me to your server!`,
		},
	});
};
