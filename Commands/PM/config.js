module.exports = async ({ configJS, Constants: { Colors } }, msg, commandData) => {
	msg.reply({
		embed: {
			color: Colors.RED,
			title: `This command is deprecated!`,
			description: `You can visit the dashboard by going [here](${configJS.hostingURL}dashboard)`,
		},
	});
};
