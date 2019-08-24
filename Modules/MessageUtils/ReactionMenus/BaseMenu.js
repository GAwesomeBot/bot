const { Colors, Templates: { ReactionMenu } } = require("../../../Internals/Constants");
const { Error } = require("../../../Internals/Errors");
const { EventEmitter } = require("events");

class BaseReactionMenu extends EventEmitter {
	constructor (originalMsg, allowedEmojis, embedTemplate = {}, { options, results } = {}) {
		super();
		this.originalMsg = originalMsg;

		this.allowedEmojis = allowedEmojis;

		if (embedTemplate) this.template = Object.assign(ReactionMenu, embedTemplate);
		else this.template = {};

		this.currentPage = 0;
		this.totalPages = 0;
		this.add1 = !(options.length >= 10);

		this.options = options;
		this.results = results;
	}

	async init (time = 120000, emitOnly = false) {
		this.emitOnly = emitOnly;
		if (this.options.length > 10) {
			this.options = this.options.chunk(10);
			this.totalPages = this.options.length;
		}
		await this.sendInitialMessage();
		if (this.options.length > 1 || this.totalPages >= 1) {
			this.collector = this.msg.createReactionCollector(
				(reaction, user) => user.id === this.originalMsg.author.id && this.allowedEmojis.includes(reaction.emoji.name),
				{ time }
			);
			await this.prepareReactions();
			this.handle();
		}
	}

	async sendInitialMessage () {
		if (this.options.length === 1) {
			return this.originalMsg.channel.send(this.results[0]);
		}
		this.msg = await this.originalMsg.channel.send({
			embed: {
				color: this.template.color,
				title: this.template.title,
				description: this.template.description.format({ list: `\`\`\`ini\n${this._currentOptions}\`\`\`` }),
				footer: {
					text: this.template.footer ? this.template.footer.format({ current: this.currentPage + 1, total: this.add1 ? this.totalPages + 1 : this.totalPages }) : null,
				},
			},
		});
	}

	get _currentOptions () {
		return this.totalPages > 0 ? this.options[this.totalPages].join("\n") : this.options.join("\n");
	}

	async prepareReactions () {
		throw new Error("NON_OVERWRITTEN", {}, "prepareReactions");
	}

	async handle () {
		this.collector.once("end", this._handleEnd.bind(this));
	}

	async _handleEnd (_, reason) {
		try {
			await this.msg.reactions.removeAll();
		} catch (err) {
			logger.debug(`Failed to clear all reactions for interactive menu, will remove only the bots reaction!`, { chid: this.msg.channel.id, msgid: this.msg.id }, err);
			this.msg.reactions.forEach(r => r.users.remove());
		}
		if (reason !== "updateChoice") {
			this.msg.edit({
				embed: {
					color: Colors.LIGHT_ORANGE,
					description: `You've exited the menu or the menu expired.`,
				},
			}).catch(err => {
				logger.debug(`Failed to edit menu message.`, { msgid: this.msg.id }, err);
			});
		}

		// Null out the collector
		this.collector = null;
	}

	async _changePage () {
		this.msg = await this.msg.edit({
			embed: {
				color: this.template.color,
				title: this.template.title,
				description: this.template.description.format({ list: `\`\`\`ini\n${this._currentOptions}\`\`\`` }),
				footer: {
					text: this.template.footer ? this.template.footer.format({ current: this.currentPage + 1, total: this.add1 ? this.totalPages + 1 : this.totalPages }) : null,
				},
			},
		});
	}

	async removeUserReaction (reaction, user = this.originalMsg.author.id) {
		try {
			await reaction.users.remove(user);
		} catch (err) {
			logger.verbose(`Failed to remove the reaction for user!`, { user, msgid: reaction.message.id }, err);
		}
	}

	async _updateChoice (choice) {
		if (this.emitOnly) {
			this.emit("choice", choice + (this.currentPage * 10));
		} else {
			this.msg.edit(this.results[choice + (this.currentPage * 10)]);
		}
	}
}

module.exports = BaseReactionMenu;
