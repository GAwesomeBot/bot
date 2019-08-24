const { Text, Colors } = require("../../Internals/Constants");
const { Error: GABError } = require("../../Internals/Errors");
const Gag = require("./Gag");
const { Structures, splitMessage, MessageAttachment, MessageEmbed } = require("discord.js");

const IsObject = input => input && input.constructor === Object;

module.exports = () => {
	Structures.extend("Guild", Guild => {
		class GABGuild extends Guild {
			async populateDocument () {
				this.serverDocument = await Servers.findOne(this.id);
			}

			get defaultChannel () {
				if (this.channels.filter(c => c.type === "text").size === 0) return null;

				const generalChannel = this.channels.find(ch => (ch.name === "general" || ch.name === "mainchat") && ch.type === "text");
				if (generalChannel && generalChannel.permissionsFor(this.me).has(["VIEW_CHANNEL", "SEND_MESSAGES"])) {
					return generalChannel;
				}
				const defaultChannel = this.channels.filter(c => c.type === "text" && c.permissionsFor(this.me).has(["VIEW_CHANNEL", "SEND_MESSAGES"]))
					.sort((a, b) => a.rawPosition - b.rawPosition)
					.first();
				if (!defaultChannel) return null;
				return defaultChannel;
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
				this.responses = null;
			}

			async build () {
				const { content } = this;

				if (this.guild && this.client.isReady) {
					await this.guild.populateDocument();
					const { serverDocument } = this.guild;
					this.client.checkCommandTag(content, serverDocument)
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
						}).catch();
				} else if (this.client.isReady) {
					let command = content.toLowerCase().trim();
					let suffix = null;
					if (command.includes(" ")) {
						command = command.split(/\s+/)[0].trim();
						suffix = content.replace(/[\r\n\t]/g, match => {
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

			get command () {
				return this._commandObject ? this._commandObject.command || null : null;
			}

			get suffix () {
				return this._commandObject ? this._commandObject.suffix || null : null;
			}

			async send (content, options) {
				let { content: _content, ..._options } = this.constructor.handleOptions(content, options);

				if (!this.responses || typeof _options.files !== "undefined") {
					try {
						const mes = await this.channel.send(_content, _options);
						if (typeof _options.files === "undefined") this.responses = Array.isArray(mes) ? mes : [mes];
						return mes;
					} catch (err) {
						return this._handleSendError(err);
					}
				}

				if (Array.isArray(_content)) _content = _content.join("\n");
				if (_options && _options.split) _content = splitMessage(_content, _options.split);
				if (!Array.isArray(_content)) _content = [_content];

				const promises = [];
				const max = Math.max(_content.length, this.responses.length);

				for (let i = 0; i < max; i++) {
					if (i >= _content.length) this.responses[i].delete().catch(() => null);
					else if (this.responses.length > i) promises.push(this.responses[i].edit(_content[i], _options));
					else promises.push(this.channel.send(_content[i], _options));
				}

				try {
					this.responses = await Promise.all(promises);
					return this.responses.length < 2 ? this.responses[0] : this.responses;
				} catch (err) {
					return this._handleSendError(err);
				}
			}

			async delete (opts) {
				if (!this.deletable) {
					logger.debug(`Failed to delete a message to channel due to insufficient permissions.`, { chid: this.channel.id });
					return null;
				}
				try {
					return await super.delete(opts);
				} catch (err) {
					return this._handleDeleteError(err);
				}
			}

			sendError (cmd, stack) {
				if (!this.client.debugMode) stack = "";
				return this.send({
					embed: {
						color: Colors.ERROR,
						title: Text.ERROR_TITLE(),
						description: !Gag(process.argv.slice(2)).owo ? Text.ERROR_BODY(cmd, stack) : Text.OWO_ERROR_BODY(),
						footer: {
							text: `Contact your GAB maintainer for more support.`,
						},
					},
				});
			}

			sendInvalidUsage (commandData, title = "", footer = "") {
				return this.send({
					embed: {
						color: Colors.INVALID,
						title,
						description: Text.INVALID_USAGE(commandData, this.guild ? this.guild.commandPrefix : undefined),
						footer: {
							text: footer,
						},
					},
				});
			}

			_handleSendError (err) {
				if (err.name === "DiscordAPIError") {
					switch (err.httpStatus) {
						case 403:
							logger.debug(`Failed to send a message to channel due to insufficient permissions.`, { chid: this.channel.id }, err);
							return null;
						case 404:
							logger.debug(`Failed to edit an unknown message.`, { chid: this.channel.id }, err);
							return null;
						default:
							throw new GABError("UNKNOWN_DISCORD_API_ERROR", { msgid: this.id }, err);
					}
				}
				throw new GABError("UNKNOWN_DISCORD_ERROR", { msgid: this.id }, err);
			}

			_handleDeleteError (err) {
				if (err.name === "DiscordAPIError") {
					switch (err.httpStatus) {
						case 403:
							logger.debug(`Failed to delete a message to channel due to insufficient permissions.`, { chid: this.channel.id }, err);
							return null;
						case 404:
							logger.debug(`Failed to delete an unknown message.`, { chid: this.channel.id }, err);
							return null;
						default:
							throw new GABError("UNKNOWN_DISCORD_API_ERROR", { msgid: this.id }, err);
					}
				}
				throw new GABError("UNKNOWN_DISCORD_ERROR", { msgid: this.id }, err);
			}

			static combineContentOptions (content, options) {
				if (!options) return IsObject(content) ? content : { content };
				return { ...options, content };
			}

			static handleOptions (content, options = {}) {
				if (content instanceof MessageEmbed) options.embed = content;
				else if (content instanceof MessageAttachment) options.files = [content];
				else if (IsObject(content)) options = content;
				else options = this.combineContentOptions(content, options);

				if (options.split && typeof options.code !== "undefined" && (typeof options.code !== "boolean" || options.code === true)) {
					options.split.prepend = `\`\`\`${typeof options.code !== "boolean" ? options.code || "" : ""}\n`;
					options.split.append = "\n```";
				}

				options.embed = options.embed || null;
				return options;
			}
		}
		return GABMessage;
	});

	Structures.extend("GuildMember", GuildMember => {
		class GABGuildMember extends GuildMember {
			get memberDocument () {
				let doc = this.guild.serverDocument.members[this.id];
				if (!doc) {
					this.guild.serverDocument.query.push("members", { _id: this.id });
					doc = this.guild.serverDocument.members[this.id];
				}
				return doc;
			}
		}
		return GABGuildMember;
	});
};
