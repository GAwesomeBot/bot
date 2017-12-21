class ReactionBasedMenu {
	constructor (msg, originalMsg, options, results, embed = null) {
		this.client = msg.client;
		this.msg = msg;
		this.originalMsg = originalMsg;
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

		this.embed = embed ? embed : {
			title: `Choose a number`,
			color: 0x3669FA,
			description: `{list}`,
			footer: `Page {current page} / {total pages}`,
		};

		this.initCollector();
	}

	async initCollector () {
		await this.prepareReactions();
		this.collector = this.msg.createReactionCollector(
			(reaction, user) => user.id === this.originalMsg.author.id && this.emojiArray.includes(reaction.emoji.name),
			{ time: 120000 }
		);
		this.handle();
	}

	async prepareReactions () {
		if (this.options.length > 10) {
			await this._allOptions();
			this.options = this.options.chunk(10);
			this.totalPages = this.options.length;
		} else {
			await this._options(this.options.length);
		}
	}

	async _allOptions () {
		await this.msg.react(this.emojis.back);
		for (const emoji of this.numberEmojis) await this.msg.react(emoji);
		await this.msg.react(this.emojis.forward);
		await this.msg.react(this.emojis.stop);
	}

	async _options (number) {
		await this.msg.react(this.emojis.back);
		for (const emoji of Object.values(this.numberEmojis).splice(0, number)) await this.msg.react(emoji);
		await this.msg.react(this.emojis.stop);
	}

	async handle () {
		this.collector.on("collect", async reaction => {
			if (reaction.emoji.name === this.emojis.stop) return this._handleStop();
			if (Object.values(this.numberEmojis).includes(reaction.emoji.name)) return this._handleNumberInput(reaction);
			if (["◀", "▶"].includes(reaction.emoji.name)) return this._handlePageChange(reaction);
		});

		this.collector.once("end", this._handleStop.bind(this));
	}

	async _handleNumberInput (reaction) {
		console.log(`Got number!`);

	}

	async _handleStop () {
		try {
			await this.msg.clearReactions();
		} catch (err) {
			winston.verbose(`Failed to clear reactions from message for reaction menu..`, { msg: this.msg.id, chid: this.msg.channel.id, svrid: this.msg.guild.id }, err);
		}
		// Null out the collector
		this.collector = null;
	}

	async _handlePageChange (reaction) {
		console.log(`Got page change!`);
	}
}

module.exports = ReactionBasedMenu;
