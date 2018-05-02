const { Colors, PageEmojis } = require("../../Internals/Constants");

class PaginatedEmbed {
	/**
	 * After creating a PaginatedEmbed call `#init()` to set it up and start listenig for reactions.
	 *
	 * @param originalMsg 	The original message that created this paginated embed.
	 * 						May be a custom object, the only required fields are `channel` and `author.id`
	 * @param embedTemplate A slightly edited embed object that serves as the base template for all pages,
	 * 						with strings being formatted via templates
	 * @param pageData		All the data used for the different pages of the embed pages,
	 * 						with the fields being arrays with values (or null) for every page
	 */
	constructor (originalMsg, embedTemplate, pageData) {
		this.channel = originalMsg.channel;
		this.authorID = originalMsg.author.id;
		this.pageEmojis = PageEmojis;
		this.pageEmojiArray = [...Object.values(this.pageEmojis)];

		this.authors = pageData.authors || [];
		this.titles = pageData.titles || [];
		this.colors = pageData.colors || [];
		this.urls = pageData.urls || [];
		this.descriptions = pageData.descriptions || [];
		this.fields = pageData.fields || [];
		this.timestamps = pageData.timestamps || [];
		this.thumbnails = pageData.thumbnails || [];
		this.images = pageData.images || [];
		this.footers = pageData.footers || [];

		this.embedTemplate = Object.assign({
			author: "{author}",
			authorIcon: null,
			authorUrl: null,
			title: "{title}",
			color: Colors.INFO,
			url: null,
			description: "{description}",
			fields: null,
			timestamp: null,
			thumbnail: null,
			image: null,
			footer: "{footer}Page {currentPage} out of {totalPages}",
			footerIcon: null,
		}, embedTemplate);

		this.currentPage = 0;
		this.totalPages = pageData.pageCount || this.descriptions.length - 1;
	}

	async init (timeout = 300000) {
		await this._sendInitialMessage();
		if (this.totalPages > 1) {
			this.collector = this.msg.createReactionCollector(
				(reaction, user) => user.id === this.authorID && this.pageEmojiArray.includes(reaction.emoji.name),
				{ time: timeout }
			);
			await this._prepareReactions();
			this._startCollector();
		}
	}

	async _prepareReactions () {
		await this.msg.react(this.pageEmojis.back);
		await this.msg.react(this.pageEmojis.stop);
		await this.msg.react(this.pageEmojis.forward);
	}

	async _startCollector () {
		const pageChangeEmojis = [this.pageEmojis.back, this.pageEmojis.forward];
		this.collector.on("collect", reaction => {
			if (reaction.emoji.name === this.pageEmojis.stop) return this.collector.stop();
			if (pageChangeEmojis.includes(reaction.emoji.name)) return this._handlePageChange(reaction);
		});

		this.collector.once("end", this._handleStop.bind(this));
	}

	async _handleStop () {
		try {
			await this.msg.reactions.removeAll();
		} catch (err) {
			winston.verbose(`Failed to clear all reactions for paginated menu, will remove only the bots reaction!`, { err: err.name });
			this.msg.reactions.forEach(r => r.users.remove());
		}
		this.collector = null;
	}

	async _handlePageChange (reaction) {
		switch (reaction.emoji.name) {
			case this.pageEmojis.back: {
				this.currentPage--;
				if (this.currentPage < 0) this.currentPage = 0;
				this._removeUserReaction(reaction, this.authorID);
				this._updateMessage();
				break;
			}
			case this.pageEmojis.forward: {
				this.currentPage++;
				if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;
				this._removeUserReaction(reaction, this.authorID);
				this._updateMessage();
				break;
			}
		}
	}

	async _removeUserReaction (reaction, user) {
		try {
			await reaction.users.remove(user);
		} catch (err) {
			winston.verbose(`Failed to remove the reaction for user!`, { user, message: reaction.message.id, err: err.name });
		}
	}

	get _currentMessageContent () {
		return {
			embed: {
				author: {
					name: this.embedTemplate.author.format(this._getFormatOptions({ author: this.authors[this.currentPage] || "" })),
					icon_url: this.embedTemplate.authorIcon,
					url: this.embedTemplate.authorUrl,
				},
				title: this.embedTemplate.title.format(this._getFormatOptions({ title: this.titles[this.currentPage] || "" })),
				color: this.colors[this.currentPage] || this.embedTemplate.color,
				url: this.urls[this.currentPage] || this.embedTemplate.url,
				description: this.embedTemplate.description.format(this._getFormatOptions({ description: this.descriptions[this.currentPage] || "" })),
				fields: this.fields[this.currentPage] || this.embedTemplate.fields,
				timestamp: this.timestamps[this.currentPage] || this.embedTemplate.timestamp,
				thumbnail: {
					url: this.thumbnails[this.currentPage] || this.embedTemplate.thumbnail,
				},
				image: {
					url: this.images[this.currentPage] || this.embedTemplate.image,
				},
				footer: {
					text: this.embedTemplate.footer.format(this._getFormatOptions({ footer: this.footers[this.currentPage] || "" })),
					icon_url: this.embedTemplate.footerIcon,
				},
			},
		};
	}

	async _sendInitialMessage () {
		this.msg = await this.channel.send(this._currentMessageContent);
	}

	async _updateMessage () {
		this.msg = await this.msg.edit(this._currentMessageContent);
	}

	_getFormatOptions (obj) {
		return Object.assign({ currentPage: this.currentPage + 1, totalPages: this.totalPages + 1 }, obj);
	}
}

module.exports = PaginatedEmbed;
