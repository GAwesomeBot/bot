const { Structures, splitMessage } = require("discord.js");

const IsObject = input => Object.prototype.toString.call(input) === "[object Object]";

module.exports = () => {
	Structures.extend("Guild", Guild => {
		class GABGuild extends Guild {
			get defaultChannel () {
				if (this.channels.filter(c => c.type === "text").size === 0) return null;

				let generalChannel = this.channels.find(ch => (ch.name === "general" || ch.name === "mainchat") && ch.type === "text");
				if (generalChannel && generalChannel.permissionsFor(this.me).has(["VIEW_CHANNEL", "SEND_MESSAGES"])) {
					return generalChannel;
				}
				const defaultChannel = this.channels.filter(c => c.type === "text" && c.permissionsFor(this.me).has(["VIEW_CHANNEL", "SEND_MESSAGES"]))
					.sort((a, b) => a.rawPosition - b.rawPosition)
					.first();
				if (!defaultChannel) return null;
				return defaultChannel;
			}

			get serverDocument () {
				return this.client.cache.getSync(this.id);
			}

			get commandPrefix () {
				return this.client.getCommandPrefix(this, this.serverDocument);
			}

			channel (ch) {
				return this.channels.resolve(ch) || null;
			}
		}
		return GABGuild;
	});

	Structures.extend("Message", Message => {
		class GABMessage extends Message {
			constructor (...args) {
				super(...args);

				/**
				 * A reference to the bot message response
				 * Used in command message editing
				 */
				this.response = null;
			}

			_patch (data) {
				super._patch(data);
				if (this.guild && this.client.isReady) {
					this.client.checkCommandTag(data.content, this.guild.serverDocument)
						.then(object => {
							Object.defineProperty(this, "_commandObject", {
								enumerable: false,
								value: object,
							});
						});
				} else if (this.client.isReady) {
					let command = data.content.toLowerCase().trim();
					let suffix = null;
					if (command.includes(" ")) {
						command = command.split(/\s+/)[0].trim();
						suffix = data.content.replace(/[\r\n\t]/g, match => {
							const escapes = {
								"\r": "{r}",
								"\n": "{n}",
								"\t": "{t}",
							};
							return escapes[match] || match;
						}).split(/\s+/)
							.splice(1)
							.join(" ")
							.format({ n: "\n", r: "\r", t: "\t" })
							.trim();
					}
					Object.defineProperty(this, "_commandObject", {
						enumerable: false,
						value: {
							command,
							suffix,
						},
					});
				}
			}

			patch (data) {
				super.patch(data);
				if ("content" in data) {
					if (this.guild && this.client.isReady) {
						this.client.checkCommandTag(data.content, this.guild.serverDocument)
							.then(object => {
								if (this._commandObject) {
									this._commandObject.command = object.command;
									this._commandObject.suffix = object.suffix;
								} else {
									Object.defineProperty(this, "_commandObject", {
										enumerable: false,
										value: object,
										writable: true,
									});
								}
							});
					} else if (this.client.isReady) {
						let command = data.content.toLowerCase().trim();
						let suffix = null;
						if (command.includes(" ")) {
							command = command.split(/\s+/)[0].trim();
							suffix = data.content.replace(/[\r\n\t]/g, match => {
								const escapes = {
									"\r": "{r}",
									"\n": "{n}",
									"\t": "{t}",
								};
								return escapes[match] || match;
							}).split(/\s+/)
								.splice(1)
								.join(" ")
								.format({ n: "\n", r: "\r", t: "\t" })
								.trim();
						}
						if (this._commandObject) {
							this._commandObject.command = command;
							this._commandObject.suffix = suffix;
						} else {
							Object.defineProperty(this, "_commandObject", {
								enumerable: false,
								value: {
									command,
									suffix,
								},
								writable: true,
								configurable: true,
							});
						}
					}
				}
			}

			get command () {
				return this._commandObject.command || null;
			}

			get suffix () {
				return this._commandObject.suffix || null;
			}

			send (content, options) {
				options = this.constructor.combineOptions(content, options);

				if (Array.isArray(options.content)) options.content = content.join("\n");
				options.embed = options.embed || null;

				if (this.response && typeof options.files === "undefined") {
					if (options && options.split) options.content = splitMessage(options.content, options.split);
					return this.response.edit(options);
				}

				return this.channel.send(options)
					.then(msg => {
						if (typeof options.files === "undefined") this.response = msg;
						return msg;
					});
			}

			static combineOptions (content, options) {
				if (!options) return IsObject(content) ? content : { content };
				return Object.assign(options, { content });
			}
		}
		return GABMessage;
	});

	Structures.extend("GuildMember", GuildMember => {
		class GABGuildMember extends GuildMember {
			get memberDocument () {
				let doc = this.guild.serverDocument.members.id(this.id);
				if (!doc) {
					this.guild.serverDocument.members.push({ _id: this.id });
					doc = this.guild.serverDocument.members.id(this.id);
				}
				return doc;
			}
		}
		return GABGuildMember;
	});
};
