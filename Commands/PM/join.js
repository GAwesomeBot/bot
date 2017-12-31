module.exports = async ({ bot, configJS, Constants: { Colors } }, msg, commandData) => {
	msg.reply({
		embed: {
			color: Colors.SUCCESS,
			title: `Thank you for choosing ${bot.user.username}! 😊`,
			description: `Click [here](${configJS.oauthLink.format({ id: bot.user.id })}) to invite me to your server!`,
		},
	});
};
