const BaseMenu = require("./BaseMenu");
const { HelpMenuEmojis, PageEmojis: { stop: StopEmoji }, Colors } = require("../../../Internals/Constants");

module.exports = class extends BaseMenu {
	constructor (originalMsg, defaultPage = {}, { options = [], pages = {}, withExtensions = false } = {}) {
		super(originalMsg, [...Object.values(HelpMenuEmojis), StopEmoji], undefined, { options });

		this.pages = pages;
		this.defaultPage = defaultPage;
		if (!withExtensions) this.allowedEmojis.splice(this.allowedEmojis.indexOf(HelpMenuEmojis.extension), 1);
	}

	async init (time) {
		await super.init(time);
		this.collector = this.msg.createReactionCollector(
			(reaction, user) => user.id === this.originalMsg.author.id && this.allowedEmojis.includes(reaction.emoji.name),
			{ time }
		);
		await this.prepareReactions();
		this.handle();
	}

	async sendInitialMessage () {
		this.msg = await this.originalMsg.channel.send(this.defaultPage);
	}

	async prepareReactions () {
		for (const emoji of this.allowedEmojis) await this.msg.react(emoji);
	}

	async handle () {
		this.collector.on("collect", async reaction => {
			if (reaction.emoji.name === StopEmoji) return this.collector.stop();
			if (reaction.emoji.name === HelpMenuEmojis.info) return this._infoPage(reaction);
			return this._handleInput(reaction);
		});
		super.handle();
	}

	async _handleInput (reaction) {
		this.removeUserReaction(reaction);
		if (this.pages.hasOwnProperty(reaction.emoji.name)) {
			this.msg = await this.msg.edit(this.pages[reaction.emoji.name]);
		}
	}

	async _infoPage (reaction) {
		this.removeUserReaction(reaction);
		this.msg = await this.msg.edit(this.defaultPage);
	}

	async _handleEnd () {
		try {
			await this.msg.reactions.removeAll();
		} catch (err) {
			logger.debug(`Failed to clear all reactions for interactive menu, will remove only the bots reaction!`, { chid: this.msg.channel.id, msgid: this.msg.id }, err);
			this.msg.reactions.forEach(r => r.users.remove());
		}
		const msgid = this.msg.id;
		this.msg.edit({
			embed: {
				color: Colors.LIGHT_ORANGE,
				description: `You've exited the help menu or it expired.`,
			},
		}).catch(err => {
			logger.debug(`Failed to edit menu message.`, { msgid }, err);
		});
		// Bye message!! 👋
		this.msg = null;

		// Null out the collector
		this.collector = null;
	}
};
