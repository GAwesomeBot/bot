module.exports = async ({ client, configJS, Constants: { Colors } }, documents, msg, commandData) => {
	const description = [
		`Hello! I'm **${client.user.username}**, running **GAwesomeBot ${configJSON.version} on branch ${configJSON.branch}**, the best Discord Bot! 🐬`,
		`Created by Gilbert and [the GAwesomeDevs](${configJS.hostingURL}#team)! ❤`,
		`Built using [Node.js](https://nodejs.org/en/) and [Discord.js](https://discord.js.org/#/)`,
	].join("\n");
	const fields = [];
	configJS.hostingURL && fields.push({
		name: `Want to learn more?`,
		value: `Click [here](${configJS.hostingURL})`,
		inline: true,
	});
	configJS.discordLink && fields.push({
		name: `Need some help?`,
		value: `Join our [Discord Server](${configJS.discordLink})`,
		inline: true,
	});
	msg.send({
		embed: {
			color: Colors.LIGHT_GREEN,
			fields: fields.length ? fields : [],
			description,
			footer: {
				text: `Use "${msg.guild.commandPrefix}help" to list all commands that you can use in this server`,
			},
		},
	});
};
