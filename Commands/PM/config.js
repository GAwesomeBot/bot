module.exports = async ({ configJS }, msg, commandData) => {
	msg.reply({
		embed: {
			color: 0xFF0000,
			title: `This command is deprecated!`,
			description: `You can visit the dashboard by going [here](${configJS.hostingURL}dashboard)`,
		},
	});
};
