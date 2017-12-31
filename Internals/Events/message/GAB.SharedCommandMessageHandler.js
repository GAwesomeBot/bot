const BaseEvent = require("../BaseEvent");
const { Constants } = require("../../index");

class MaintainerMessageCreate extends BaseEvent {
	requirements (msg) {
		if (configJSON.userBlocklist.includes(msg.author.id)) return false;
		if (configJSON.sudoMaintainers.includes(msg.author.id) ||
			configJSON.maintainers.includes(msg.author.id)) {
			return true;
		}
		return false;
	}

	async handle (msg) {
		if (msg.command) {
			const command = this.client.getSharedCommand(msg.command);
			if (command) {
				if (await this.client.canRunSharedCommand(msg.command, msg.author)) {
					try {
						await command({
							bot: this.bot,
							client: this.client,
							configJS: this.configJS,
							Constants,
						}, msg, {
							name: this.client.getSharedCommandName(msg.command),
							usage: this.client.getSharedCommandMetadata(msg.command).usage,
						});
					} catch (err) {
						winston.warn(`Failed to process shared command "${msg.command}"`, { usrid: msg.author.id }, err);
						msg.channel.send({
							embed: {
								color: 0xFF0000,
								title: `Something went wrong! 😱`,
								description: `**Error Message**: \`\`\`js\n${err.stack}\`\`\``,
								footer: {
									text: `You should report this on GitHub so we can fix it!`,
								},
							},
						});
					}
				} else {
					msg.channel.send({
						embed: {
							color: 0xFF0000,
							title: `Sorry, you're not authorized to run this!`,
							description: `You are unable to run the \`${msg.command}\` command, because you're lacking permissions! 😦`,
						},
					});
				}
			}
		}
	}
}

module.exports = MaintainerMessageCreate;
