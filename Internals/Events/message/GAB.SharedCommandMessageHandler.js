const BaseEvent = require("../BaseEvent");
const { Constants } = require("../../index");
const { Colors } = Constants;

class MaintainerMessageCreate extends BaseEvent {
	requirements (msg) {
		if (!msg.channel.postable || msg.type !== "DEFAULT") return false;
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
							client: this.client,
							configJS: this.configJS,
							Constants,
						}, msg, {
							name: this.client.getSharedCommandName(msg.command),
							usage: this.client.getSharedCommandMetadata(msg.command).usage,
						});
					} catch (err) {
						logger.warn(`Failed to process shared command "${msg.command}"`, { usrid: msg.author.id }, err);
						msg.send({
							embed: {
								color: Colors.ERROR,
								title: `Something went wrong! 😱`,
								description: `**Error Message**: \`\`\`js\n${err.stack}\`\`\``,
								footer: {
									text: `You should report this on GitHub so we can fix it!`,
								},
							},
						});
					}
				} else {
					msg.send({
						embed: {
							color: Colors.MISSING_PERMS,
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
