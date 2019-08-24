const BaseMenu = require("./BaseMenu");
const { PageEmojis, NumberEmojis } = require("../../../Internals/Constants");

module.exports = class extends BaseMenu {
	constructor (originalMsg, embedTemplate = {}, { options, results } = {}) {
		super(originalMsg, [...Object.values(PageEmojis), ...Object.values(NumberEmojis)], embedTemplate, { options, results });

		this.pageEmojis = PageEmojis;
		this.numberEmojiArray = [...Object.values(NumberEmojis)];
		this.pageEmojiArray = [PageEmojis.back, PageEmojis.forward];
	}

	async prepareReactions () {
		if (this.totalPages > 0) {
			return this._allOptions();
		} else {
			return this._options(this.options.length);
		}
	}

	async _allOptions () {
		await this.msg.react(this.pageEmojis.back);
		for (const emoji of this.numberEmojiArray) await this.msg.react(emoji);
		await this.msg.react(this.pageEmojis.forward);
		await this.msg.react(this.pageEmojis.stop);
	}

	async _options (number) {
		for (const emoji of this.numberEmojiArray.slice(0, number)) await this.msg.react(emoji);
		await this.msg.react(this.pageEmojis.stop);
	}

	async handle () {
		this.collector.on("collect", async reaction => {
			if (reaction.emoji.name === this.pageEmojis.stop) return this.collector.stop();
			if (this.numberEmojiArray.includes(reaction.emoji.name)) return this._handleNumberInput(reaction);
			if (this.pageEmojiArray.includes(reaction.emoji.name)) return this._handlePageChange(reaction);
		});
		super.handle();
	}

	async _handlePageChange (reaction) {
		switch (reaction.emoji.name) {
			case this.pageEmojis.back: {
				this.currentPage--;
				if (this.currentPage <= 0) this.currentPage = 0;
				this.removeUserReaction(reaction);
				this._changePage();
				break;
			}
			case this.pageEmojis.forward: {
				this.currentPage++;
				if (this.currentPage >= this.totalPages) this.currentPage = this.add1 ? this.totalPages - 1 : this.totalPages;
				this.removeUserReaction(reaction);
				this._changePage();
				break;
			}
		}
	}

	async _handleNumberInput (reaction) {
		this.collector.stop("updateChoice");
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
};
