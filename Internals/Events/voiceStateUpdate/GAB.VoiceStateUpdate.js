const BaseEvent = require("../BaseEvent.js");
const { LoggingLevels } = require("../../Constants");
const Voicetext = require("../../../Modules/Voicetext");
const VoiceStatsCollector = require("../../../Modules/VoiceStatsCollector");

class VoiceStateUpdate extends BaseEvent {
	async handle (oldState, state) {
		if (!state.member) return;
		const serverDocument = await Servers.findOne(state.guild.id);
		if (!serverDocument) {
			logger.debug("Failed to find server data for VoiceStateUpdate.", { svrid: state.guild.id });
			return;
		}
		if (!oldState.channel && state.channel) {
			await this.joinedChannel(serverDocument, state.channel, state);
		} else if (oldState.channel && !state.channel) {
			await this.leftChannel(serverDocument, oldState.channel, state);
		} else if (oldState.channel && state.channel && oldState.channelID !== state.channelID) {
			await this.joinedChannel(serverDocument, state.channel, state, true);
			await this.leftChannel(serverDocument, oldState.channel, oldState, true);
		} else if (!oldState.mute && state.mute && !state.member.user.bot && state.channelID !== state.guild.afkChannelID) {
			VoiceStatsCollector.stopTiming(this.client, state.guild, serverDocument, state.member);
		} else if (oldState.mute && !state.mute && !state.member.user.bot && state.channelID !== state.guild.afkChannelID) {
			VoiceStatsCollector.startTiming(serverDocument, state.member);
		}
	}

	async joinedChannel (serverDocument, channel, state) {
		logger.verbose(`Member ${state.member && state.member.id} joined channel ${channel.id}.`, { svrid: serverDocument._id, chid: channel.id, usrid: state.member.id });
		if (serverDocument.config.voicetext_channels.includes(channel.id)) {
			try {
				await Voicetext.addMember(state.guild, channel, state.member);
				this.client.logMessage(serverDocument, LoggingLevels.INFO, "A member has been added to a voicetext channel.", channel.id, state.member.id);
			} catch (err) {
				logger.debug("Failed to add member to voicetext channel.", { svrid: state.guild.id, chid: channel.id, usrid: state.member.id }, err);
				this.client.logMessage(serverDocument, LoggingLevels.ERROR, "Failed to add a member to a voicetext channel! I might be lacking sufficient permissions.", channel.id, state.member.id);
			}
		}
		if (!state.mute && state.member.id !== this.client.user.id && !state.member.user.bot &&
			channel.id !== state.guild.afkChannelID) await VoiceStatsCollector.startTiming(serverDocument, state.member);
	}

	async leftChannel (serverDocument, channel, state) {
		logger.verbose(`Member ${state.member && state.member.id} left channel ${channel.id}.`, { svrid: serverDocument._id, chid: channel.id, usrid: state.member && state.member.id });
		const roomDocument = serverDocument.config.room_data.id(channel.id);
		if (roomDocument && channel.members.size === 0) {
			try {
				await channel.delete();
				serverDocument.query.pull("config.room_data", channel.id);
				await serverDocument.save();
				this.client.logMessage(serverDocument, LoggingLevels.INFO, "Auto-removed an empty Voice Room.", channel.id);
			} catch (err) {
				logger.debug(`Failed to auto-remove a Voice Room!`, { svrid: state.guild.id, chid: channel.id, usrid: state.member.id }, err);
				this.client.logMessage(serverDocument, LoggingLevels.ERROR, "Failed to auto-remove a Voice Room!", channel.id);
			}
		}
		if (serverDocument.config.voicetext_channels.includes(channel.id)) {
			try {
				await Voicetext.removeMember(state.guild, channel, state.member);
				this.client.logMessage(serverDocument, LoggingLevels.INFO, "A member has been removed from a voicetext channel.", channel.id, state.member.id);
			} catch (err) {
				logger.debug("Failed to remove member from a voicetext channel.", { svrid: state.guild.id, chid: channel.id, usrid: state.member.id }, err);
				this.client.logMessage(serverDocument, LoggingLevels.ERROR, "Failed to remove a member from a voicetext channel! I might be lacking sufficient permissions.", channel.id, state.member.id);
			}
		}
		if (!state.member.user.bot && channel.id !== state.guild.afkChannelID) await VoiceStatsCollector.stopTiming(this.client, channel.guild, serverDocument, state.member);
	}
}

module.exports = VoiceStateUpdate;
