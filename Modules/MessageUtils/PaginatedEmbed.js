const { Colors, PageEmojis } = require("../../Internals/Constants");

class PaginatedEmbed {
	/**
	 * After creating a PaginatedEmbed call `#init()` to set it up and start listening for reactions.
	 *
	 * @param {Message} originalMsg 	The original message that created this paginated embed.
	 * 						May be a custom object, the only required fields are `channel` and `author.id`
	 * @param embedTemplate A slightly edited embed object that serves as the base template for all pages,
	 * 						with strings being formatted via templates
	 * @param pageData		All the data used for the different pages of the embed pages,
	 * 						with the fields being arrays with values (or null) for every page
	 */
	constructor (originalMsg, embedTemplate, {
		contents = [],
		authors = [],
		titles = [],
		colors = [],
		urls = [],
		descriptions = [],
		fields = [],
		timestamps = [],
		thumbnails = [],
		images = [],
		footers = [],
		pageCount = null,
	} = {}) {
		this.originalMsg = originalMsg;
		this.channel = originalMsg.channel;
		this.authorID = originalMsg.author.id;
		this.pageEmojis = PageEmojis;
		this.pageEmojiArray = [...Object.values(this.pageEmojis)];

		this.contents = contents;
		this.authors = authors;
		this.titles = titles;
		this.colors = colors;
		this.urls = urls;
		this.descriptions = descriptions;
		this.fields = fields;
		this.timestamps = timestamps;
		this.thumbnails = thumbnails;
		this.images = images;
		this.footers = footers;

		this.messageTemplate = Object.assign({
			content: "{content}",
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
		this.totalPages = pageCount || this.descriptions.length;
	}

	async init (timeout = 300000, editMessage) {
		await this._sendInitialMessage(editMessage);
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
			logger.verbose(`Failed to clear all reactions for paginated menu, will remove only the bots reaction!`, { chid: this.msg.channel.id, msgid: this.msg.id }, err);
			this.msg.reactions.forEach(r => r.users.remove());
		}
		this.collector = null;
	}

	async _handlePageChange (reaction) {
		switch (reaction.emoji.name) {
			case this.pageEmojis.back: {
				this._removeUserReaction(reaction, this.authorID);
				if (this.currentPage === 0) return;
				this.currentPage--;
				this._updateMessage();
				break;
			}
			case this.pageEmojis.forward: {
				this._removeUserReaction(reaction, this.authorID);
				if (this.currentPage === this.totalPages - 1) return;
				this.currentPage++;
				this._updateMessage();
				break;
			}
		}
	}

	async _removeUserReaction (reaction, user) {
		try {
			await reaction.users.remove(user);
		} catch (err) {
			logger.verbose(`Failed to remove the reaction for user!`, { usrid: user, msgid: reaction.message.id }, err);
		}
	}

	get _currentMessageContent () {
		return {
			content: this.messageTemplate.content.format(this._getFormatOptions({ content: this.contents[this.currentPage] || "" })),
			embed: {
				author: {
					name: this.messageTemplate.author.format(this._getFormatOptions({ author: this.authors[this.currentPage] || "" })),
					icon_url: this.messageTemplate.authorIcon,
					url: this.messageTemplate.authorUrl,
				},
				title: this.messageTemplate.title.format(this._getFormatOptions({ title: this.titles[this.currentPage] || "" })),
				color: this.colors[this.currentPage] || this.messageTemplate.color,
				url: this.urls[this.currentPage] || this.messageTemplate.url,
				description: this.messageTemplate.description.format(this._getFormatOptions({ description: this.descriptions[this.currentPage] || "" })),
				fields: this.fields[this.currentPage] || this.messageTemplate.fields,
				timestamp: this.timestamps[this.currentPage] || this.messageTemplate.timestamp,
				thumbnail: {
					url: this.thumbnails[this.currentPage] || this.messageTemplate.thumbnail,
				},
				image: {
					url: this.images[this.currentPage] || this.messageTemplate.image,
				},
				footer: {
					text: this.messageTemplate.footer.format(this._getFormatOptions({ footer: this.footers[this.currentPage] || "" })),
					icon_url: this.messageTemplate.footerIcon,
				},
			},
		};
	}

	async _sendInitialMessage (editMessage) {
		this.msg = await (editMessage ? this.originalMsg : this.channel).send(this._currentMessageContent);
	}

	async _updateMessage () {
		this.msg = await this.msg.edit(this._currentMessageContent);
	}

	_getFormatOptions (obj) {
		return Object.assign({ currentPage: this.currentPage + 1, totalPages: this.totalPages }, obj);
	}
}

module.exports = PaginatedEmbed;
