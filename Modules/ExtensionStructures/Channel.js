"use strict";
const Util = require("./../Util");

// represents eris/Channel
module.exports = class Channel {
	constructor(erisChannel) {
		this.createdAt = erisChannel.createdAt;
		this.id = erisChannel.id;
		this.type = erisChannel.type;

		this.createMessage = (content, file, cb) => {
			erisChannel.createMessage(content, file).then(erisMessage => {
				if(Util.isFunction(cb)) {
					const Message = require("./Message");
					cb(new Message(erisMessage));
				}
			});
		};

		this.deleteMessage = (messageID, cb) => {
			erisChannel.deleteMessage(messageID).then(() => {
				if(Util.isFunction(cb)) {
					cb();
				}
			});
		};

		this.deleteMessages = (messageIDs, cb) => {
			erisChannel.deleteMessages(messageIDs).then(() => {
				if(Util.isFunction(cb)) {
					cb();
				}
			});
		};

		this.editMessage = (messageID, content, cb) => {
			erisChannel.editMessage(messageID, content).then(erisMessage => {
				if(Util.isFunction(cb)) {
					const Message = require("./Message");
					cb(new Message(erisMessage));
				}
			});
		};

		this.getMessages = (limit, before, after, around, cb) => {
			erisChannel.getMessages(limit, before, after, around).then(erisMessages => {
				if(Util.isFunction(cb)) {
					const Message = require("./Message");
					const messages = erisMessages.map(erisMessage => new Message(erisMessage));
					cb(messages);
				}
			});
		};

		this.getPins = cb => {
			erisChannel.getPins().then(erisMessages => {
				if(Util.isFunction(cb)) {
					const Message = require("./Message");
					const messages = erisMessages.map(erisMessage => new Message(erisMessage));
					cb(messages);
				}
			});
		};

		this.pinMessage = (messageID, cb) => {
			erisChannel.pinMessage(messageID).then(() => {
				if(Util.isFunction(cb)) {
					cb();
				}
			});
		};

		this.purge = (limit, filter, before, after, cb) => {
			erisChannel.purge(limit, filter, before, after).then(numDeleted => {
				if(Util.isFunction(cb)) {
					cb(numDeleted);
				}
			});
		};

		this.sendTyping = cb => {
			erisChannel.sendTyping().then(() => {
				if(Util.isFunction(cb)) {
					cb();
				}
			});
		};

		this.unpinMessage = (messageID, cb) => {
			erisChannel.unpinMessage(messageID).then(() => {
				if(Util.isFunction(cb)) {
					cb();
				}
			});
		};

		this.unsendMessage = (messageID, cb) => {
			erisChannel.unsendMessage(messageID).then(() => {
				if(Util.isFunction(cb)) {
					cb();
				}
			});
		};
	}
};
