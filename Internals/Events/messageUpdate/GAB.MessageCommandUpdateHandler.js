const BaseEvent = require("../BaseEvent");

module.exports = class extends BaseEvent {
	requirements (old, msg) {
		if (!msg.guild) return false;
		if (old.content !== msg.content) return true;
	}

	async handle (old, msg) {
		this.client.emit("message", msg);
	}
};
