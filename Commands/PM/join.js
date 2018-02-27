module.exports = async ({ client, configJS, Constants: { Colors } }, msg, commandData) => {
	msg.reply({
		embed: {
			color: Colors.SUCCESS,
			title: `Thank you for choosing ${client.user.username}! 😊`,
			description: `Click [here](${configJS.oauthLink.format({ id: client.user.id })}) to invite me to your server!`,
		},
	});
};
