const BaseEvent = require("../BaseEvent.js");
const { LoggingLevels } = require("../../Constants");
const Voicetext = require("../../../Modules/Voicetext");

class VoiceStateUpdate extends BaseEvent {
	async handle (oldState, state) {
		const serverDocument = await Servers.findOne(state.guild.id);
		if (!serverDocument) return;
		if (!oldState.channel && state.channel) await this.joinedChannel(serverDocument, state.channel, state);
		else if (oldState.channel && !state.channel) await this.leftChannel(serverDocument, oldState.channel, state);
		if (oldState.channel && state.channel && oldState.channel !== state.channel) {
			await this.joinedChannel(serverDocument, state.channel, state);
			await this.leftChannel(serverDocument, oldState.channel, oldState);
		}
	}

	async joinedChannel (serverDocument, channel, state) {
		if (serverDocument.config.voicetext_channels.includes(channel.id)) {
			try {
				await Voicetext.addMember(state.guild, channel, state.member);
				this.client.logMessage(serverDocument, LoggingLevels.INFO, "A member has been added to a voicetext channel.", channel.id, state.member.id);
			} catch (err) {
				winston.debug("Failed to add member to voicetext channel", { svrid: state.guild.id, chid: channel.id, usrid: state.member.id, err });
				this.client.logMessage(serverDocument, LoggingLevels.ERROR, "Failed to add a member to a voicetext channel! I might be lacking sufficient permissions.", channel.id, state.member.id);
			}
		}
	}

	async leftChannel (serverDocument, channel, state) {
		if (serverDocument.config.voicetext_channels.includes(channel.id)) {
			try {
				await Voicetext.removeMember(state.guild, channel, state.member);
				this.client.logMessage(serverDocument, LoggingLevels.INFO, "A member has been removed from a voicetext channel.", channel.id, state.member.id);
			} catch (err) {
				winston.debug("Failed to remove member from a voicetext channel", { svrid: state.guild.id, chid: channel.id, usrid: state.member.id, err });
				this.client.logMessage(serverDocument, LoggingLevels.ERROR, "Failed to remove a member from a voicetext channel! I might be lacking sufficient permissions.", channel.id, state.member.id);
			}
		}
	}
}

module.exports = VoiceStateUpdate;
