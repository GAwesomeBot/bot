const Embed = require("../Utils/Embed");
const Message = require("../Messages/Message");

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
		if (rawuser) {
			// User handler
			let newRawMessage;
			try {
				newRawMessage = await rawuser.send(content, options);
			} catch (err) {
				throw err;
			}
			if (newRawMessage) {
				if (!Array.isArray(newRawMessage)) {
					return new Message(newRawMessage);
				} else {
					const array = [];
					newRawMessage.forEach(msg => array.push(new Message(msg)));
					return array;
				}
			}
		} else if (rawchannel) {
			// TextChannel handler
			let newRawMessage;
			try {
				newRawMessage = await rawchannel.send(content, options);
			} catch (err) {
				throw err;
			}
			if (newRawMessage) {
				if (!Array.isArray(newRawMessage)) {
					return new Message(newRawMessage);
				} else {
					const array = [];
					newRawMessage.forEach(msg => array.push(new Message(msg)));
					return array;
				}
			}
		} else if (raw) {
			if (["text", "dm", "group"].includes(raw.type)) {
				// Generic handler or something
				let newRawMessage;
				try {
					newRawMessage = await raw.send(content, options);
				} catch (err) {
					throw err;
				}
				if (newRawMessage) {
					if (!Array.isArray(newRawMessage)) {
						return new Message(newRawMessage);
					} else {
						const array = [];
						newRawMessage.forEach(msg => array.push(new Message(msg)));
						return array;
					}
				}
			}
		}
	}
}

exports.applyToClass = (structure, full = false, ignore = []) => {
	const props = ["send"];
	if (full) {
		props.push(
			"fetchMessages",
			"fetchMessage",
			"bulkDelete",
			"startTyping",
			"stopTyping",
			"fetchPinnedMessages",
			"awaitMessages",
		);
	}
	for (const prop of props) {
		if (ignore.includes(prop)) continue;
		Object.defineProperty(structure.prototype, prop,
			Object.getOwnPropertyDescriptor(TextBasedChannel.prototype, prop));
	}
};
