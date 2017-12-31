const Embed 	= require("../Embed");
const Message = require("../Messages/Message");

/**
 * Interface for classes that have text-channel-like features
 * @interface
 */
class TextBasedChannel {
	/* eslint-disable no-undef */
	async send (content, options) {
		if (!options && typeof content === "object" && !(content instanceof Array)) {
			options = content;
			content = "";
		} else if (!options) {
			options = {};
		}
		if (options instanceof Embed) options = { embed: options._apiTransform() };

		if (raw) {
			let rawMsg;
			try {
				rawMsg = await raw.send(content, options);
			} catch (err) {
				throw err;
			}
			if (!Array.isArray(rawMsg)) return new Message(rawMsg);
			else return rawMsg.map(m => new Message(m));
		}
	}
}

exports.applyToClass = (structure, full = false, ignore = []) => {
	const props = ["send"];
	if (full) {
		props.push(
			"bulkDelete",
			"startTyping",
			"stopTyping",
			"awaitMessages",
		);
	}
	for (const prop of props) {
		if (ignore.includes(prop)) continue;
		Object.defineProperty(structure.prototype, prop,
			Object.getOwnPropertyDescriptor(TextBasedChannel.prototype, prop));
	}
};
