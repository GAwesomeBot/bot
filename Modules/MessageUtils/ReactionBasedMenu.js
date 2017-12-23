const { Colors } = require("../../Internals/Constants");

class ReactionBasedMenu {
	constructor (msg, options, results, embed = null) {
		this.client = msg.client;
		this.originalMsg = msg;

		this.emojis = {
			back: "◀",
			forward: "▶",
			stop: "⏹",
		};
		this.numberEmojis = {
			one: "1⃣",
			two: "2⃣",
			three: "3⃣",
			four: "4⃣",
			five: "5⃣",
			six: "6⃣",
			seven: "7⃣",
			eight: "8⃣",
			nine: "9⃣",
			ten: "🔟",
		};
		this.emojiArray = [...Object.values(this.emojis), ...Object.values(this.numberEmojis)];
		/** Array of possible options */
		this.options = options;
		/** Array of embed objects */
		this.results = results;

		/** Current page is 1-based, code-wise is 0-based */
		this.currentPage = 0;
		this.totalPages = 0;
		this.shouldAdd1 = true;

		this.choice = null;

		this.embed = embed ? embed : {
			title: `Choose a number`,
			color: Colors.BLUE,
			description: `{list}`,
			footer: `Page {current page} out of {total pages}`,
		};

		this.initCollector();
	}

	async initCollector () {
		if (this.options.length > 10) {
			this.options = this.options.chunk(10);
			this.totalPages = this.options.length;
			this.shouldAdd1 = false;
		}
		await this.sendInitialMessage();
		await this.prepareReactions();
		this.collector = this.msg.createReactionCollector(
			(reaction, user) => user.id === this.originalMsg.author.id && this.emojiArray.includes(reaction.emoji.name),
			{ time: 120000 }
		);
		this.handle();
	}

	async sendInitialMessage () {
		this.msg = await this.originalMsg.channel.send({
			embed: {
				color: this.embed.color,
				title: this.embed.title,
				description: this.embed.description.format({ list: `\`\`\`ini\n${this._menuOptions}\`\`\`` }),
				footer: {
					text: this.embed.footer.format({ "current page": this.currentPage + 1, "total pages": this.shouldAdd1 ? this.totalPages + 1 : this.totalPages }),
				},
			},
		});
	}

	get _menuOptions () {
		return this.totalPages > 0 ? this.options[this.currentPage].map(i => i).join("\n") : this.options.map(i => i).join("\n");
	}

	async prepareReactions () {
		if (this.totalPages > 0) {
			await this._allOptions();
		} else {
			await this._options(this.options.length);
		}
	}

	async _allOptions () {
		await this.msg.react(this.emojis.back);
		for (const emoji of Object.values(this.numberEmojis)) await this.msg.react(emoji);
		await this.msg.react(this.emojis.forward);
		await this.msg.react(this.emojis.stop);
	}

	async _options (number) {
		for (const emoji of Object.values(this.numberEmojis).splice(0, number)) await this.msg.react(emoji);
		await this.msg.react(this.emojis.stop);
	}

	async handle () {
		this.collector.on("collect", async reaction => {
			if (reaction.emoji.name === this.emojis.stop) return this.collector.stop();
			if (Object.values(this.numberEmojis).includes(reaction.emoji.name)) return this._handleNumberInput(reaction);
			if (["◀", "▶"].includes(reaction.emoji.name)) return this._handlePageChange(reaction);
		});

		this.collector.once("end", this._handleStop.bind(this));
	}

	async _handleNumberInput (reaction) {
		this.collector.stop("manual");
		switch (reaction.emoji.name) {
			case "1⃣": {
				this._updateChoice(0);
				break;
			}
			case "2⃣": {
				this._updateChoice(1);
				break;
			}
			case "3⃣": {
				this._updateChoice(2);
				break;
			}
			case "4⃣": {
				this._updateChoice(3);
				break;
			}
			case "5⃣": {
				this._updateChoice(4);
				break;
			}
			case "6⃣": {
				this._updateChoice(5);
				break;
			}
			case "7⃣": {
				this._updateChoice(6);
				break;
			}
			case "8⃣": {
				this._updateChoice(7);
				break;
			}
			case "9⃣": {
				this._updateChoice(8);
				break;
			}
			case "🔟": {
				this._updateChoice(9);
				break;
			}
		}
	}

	async _handleStop (_, reason) {
		if (reason === "manual") {
			try {
				await this.msg.clearReactions();
			} catch (err) {
				winston.verbose(`Failed to clear all reactions for interactive menu, will remove only the bots reaction!`, { err: err.name });
				this.msg.reactions.forEach(r => r.remove());
			}
		} else {
			this.msg.delete();
			this.originalMsg.channel.send({
				embed: {
					color: Colors.LIGHT_ORANGE,
					description: `You've exited the menu or the menu expired.`,
				},
			});
		}
		// Null out the collector
		this.collector = null;
	}

	async _handlePageChange (reaction) {
		switch (reaction.emoji.name) {
			case "◀": {
				this.currentPage--;
				if (this.currentPage <= 0) this.currentPage = 0;
				this.removeUserReaction(reaction, this.originalMsg.author.id);
				this._update();
				break;
			}
			case "▶": {
				this.currentPage++;
				if (this.currentPage >= this.totalPages) this.currentPage = this.totalPages - 1;
				this.removeUserReaction(reaction, this.originalMsg.author.id);
				this._update();
				break;
			}
		}
	}

	async _update () {
		this.msg = await this.msg.edit({
			embed: {
				color: this.embed.color,
				title: this.embed.title,
				description: this.embed.description.format({ list: `\`\`\`ini\n${this._menuOptions}\`\`\`` }),
				footer: {
					text: this.embed.footer.format({ "current page": this.currentPage + 1, "total pages": this.shouldAdd1 ? this.totalPages + 1 : this.totalPages }),
				},
			},
		});
	}

	async removeUserReaction (reaction, user) {
		try {
			await reaction.remove(user);
		} catch (err) {
			winston.verbose(`Failed to remove the reaction for user!`, { user, message: reaction.message.id });
		}
	}

	async _updateChoice (number) {
		this.msg.edit(this.results[number + (this.currentPage * 10)]);
	}
}

module.exports = ReactionBasedMenu;
