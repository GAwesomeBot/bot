const { Colors, PageEmojis } = require("../../Internals/Constants");

class PaginatedEmbed {
	constructor (msg, descriptions = [], embed = null) {
		this.client = msg.client;
		this.originalMsg = msg;

		this.pageEmojis = PageEmojis;
		this.pageEmojiArray = [...Object.values(this.pageEmojis)];

		this.descriptions = descriptions;
		this.currentDescription = 0;
		this.totalDescriptions = this.descriptions.length - 1;

		this.embedTemplate = Object.assign({
			title: ``,
			color: Colors.INFO,
			description: `{description}`,
			footer: `Embed {current description} out of {total descriptions} embeds`,
		}, embed);
	}

	async init (timeout = 300000) {
		await this.sendInitialMessage();
		await this.prepareReactions();
		this.collector = this.msg.createReactionCollector(
			(reaction, user) => user.id === this.originalMsg.author.id && this.pageEmojiArray.includes(reaction.emoji.name),
			{ time: timeout }
		);
		this.handle();
	}

	async sendInitialMessage () {
		this.msg = await this.originalMsg.channel.send({
			embed: {
				color: this.embedTemplate.color,
				author: this.embedTemplate.author || {},
				title: this.embedTemplate.title.format({ "current description": this.currentDescription + 1, "total descriptions": this.totalDescriptions + 1 }),
				description: this.embedTemplate.description.format({ description: this._currentDescription }),
				footer: {
					text: this.embedTemplate.footer.format({ "current description": this.currentDescription + 1, "total descriptions": this.totalDescriptions + 1 }),
				},
			},
		});
	}

	get _currentDescription () {
		return this.descriptions[this.currentDescription];
	}

	async prepareReactions () {
		await this.msg.react(this.pageEmojis.back);
		await this.msg.react(this.pageEmojis.stop);
		await this.msg.react(this.pageEmojis.forward);
	}

	async handle () {
		this.collector.on("collect", reaction => {
			if (reaction.emoji.name === this.pageEmojis.stop) return this.collector.stop();
			if (["◀", "▶"].includes(reaction.emoji.name)) return this._handlePageChange(reaction);
		});

		this.collector.once("end", this._handleStop.bind(this));
	}

	async _handleStop () {
		try {
			await this.msg.clearReactions();
		} catch (err) {
			winston.verbose(`Failed to clear all reactions for paginated menu, will remove only the bots reaction!`, { err: err.name });
			this.msg.reactions.forEach(r => r.remove());
		}
		// Null out the collector
		this.collector = null;
	}

	async _handlePageChange (reaction) {
		switch (reaction.emoji.name) {
			case "◀": {
				this.currentDescription--;
				if (this.currentDescription <= 0) this.currentDescription = 0;
				this.removeUserReaction(reaction, this.originalMsg.author.id);
				this._update();
				break;
			}
			case "▶": {
				this.currentDescription++;
				if (this.currentDescription >= this.totalDescriptions) this.currentDescription = this.totalDescriptions;
				this.removeUserReaction(reaction, this.originalMsg.author.id);
				this._update();
				break;
			}
		}
	}

	async removeUserReaction (reaction, user) {
		try {
			await reaction.remove(user);
		} catch (err) {
			winston.verbose(`Failed to remove the reaction for user!`, { user, message: reaction.message.id, err: err.name });
		}
	}

	async _update () {
		this.msg = await this.msg.edit({
			embed: {
				color: this.embedTemplate.color,
				author: this.embedTemplate.author || {},
				title: this.embedTemplate.title.format({ "current description": this.currentDescription + 1, "total descriptions": this.totalDescriptions + 1 }),
				description: this.embedTemplate.description.format({ description: this._currentDescription }),
				footer: {
					text: this.embedTemplate.footer.format({ "current description": this.currentDescription + 1, "total descriptions": this.totalDescriptions + 1 }),
				},
			},
		});
	}
}

module.exports = PaginatedEmbed;
