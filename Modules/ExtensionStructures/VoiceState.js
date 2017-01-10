"use strict";

// represents eris/VoiceState
module.exports = class VoiceState {
	constructor(erisVoiceState) {
		this.channelID = erisVoiceState.channelID;
		this.deaf = erisVoiceState.deaf;
		this.id = erisVoiceState.id;
		this.mute = erisVoiceState.mute;
		this.selfDeaf = erisVoiceState.selfDeaf;
		this.selfMute = erisVoiceState.selfMute;
		this.sessionID = erisVoiceState.sessionID;
		this.suppress = erisVoiceState.suppress;
	}
};
