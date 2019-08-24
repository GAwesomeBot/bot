const removeMd = require("remove-markdown");
const showdown = require("showdown");
const md = new showdown.Converter({
	tables: true,
	simplifiedAutoLink: true,
	strikethrough: true,
	tasklists: true,
	smoothLivePreview: true,
	smartIndentationFix: true,
});
md.setFlavor("github");
const textDiff = require("text-diff");
const diff = new textDiff();
const moment = require("moment");

const { renderError } = require("../helpers");

module.exports = async (req, { res }) => {
	const wikiDocuments = await Wiki.find({}).sort({
		_id: 1,
	}).exec();

	if (!wikiDocuments) {
		renderError(res, "An error occurred while fetching wiki documents.");
	} else if (req.query.q) {
		req.query.q = req.query.q.toLowerCase().trim();

		const searchResults = [];
		wikiDocuments.forEach(wikiDocument => {
			const titleMatch = wikiDocument._id.toLowerCase().indexOf(req.query.q);
			const content = removeMd(wikiDocument.content);
			const contentMatch = content.toLowerCase().indexOf(req.query.q);

			if (titleMatch > -1 || contentMatch > -1) {
				let matchText;
				if (contentMatch) {
					const startIndex = contentMatch < 300 ? 0 : contentMatch - 300;
					const endIndex = contentMatch > content.length - 300 ? content.length : contentMatch + 300;
					// eslint-disable-next-line max-len
					matchText = `${content.substring(startIndex, contentMatch)}<strong>${content.substring(contentMatch, contentMatch + req.query.q.length)}</strong>${content.substring(contentMatch + req.query.q.length, endIndex)}`;
					if (startIndex > 0) {
						matchText = `...${matchText}`;
					}
					if (endIndex < content.length) {
						matchText += "...";
					}
				} else {
					matchText = content.slice(0, 300);
					if (content.length > 300) {
						matchText += "...";
					}
				}
				searchResults.push({
					title: wikiDocument._id,
					matchText,
				});
			}
		});

		res.setPageData({
			page: "wiki.ejs",
			pageTitle: `Search for "${req.query.q}" - GAwesomeBot Wiki`,
			pageList: wikiDocuments.map(wikiDocument => wikiDocument._id),
			mode: "search",
			title: req.query.q ? `Search for "${req.query.q}"` : "List of all pages",
			activeSearchQuery: req.query.q,
			searchResults,
		});

		res.render();
	} else {
		res.redirect("/wiki/Home");
	}
};

module.exports.readArticle = async (req, { res }) => {
	const wikiDocuments = await Wiki.find({}).sort({
		_id: 1,
	}).exec();
	if (!wikiDocuments) {
		renderError(res, "Failed to fetch wiki pages!");
	} else {
		const page = wikiDocuments.find(wikiDocument => wikiDocument._id === req.params.id) || {
			_id: req.params.id,
		};
		const getReactionCount = value => page.reactions.reduce((count, reactionDocument) => count + (reactionDocument.value === value), 0);
		let reactions, userReaction;
		if (page.updates && page.reactions) {
			reactions = {
				"-1": getReactionCount(-1),
				1: getReactionCount(1),
			};
			if (req.isAuthenticated()) {
				userReaction = page.reactions.id(req.user.id) || {};
			}
		}
		res.setPageData({
			page: "wiki.ejs",
			pageTitle: `${page._id} - GAwesomeBot Wiki`,
			pageList: wikiDocuments.map(wikiDocument => wikiDocument._id),
			mode: "page",
			title: page._id,
			content: md.makeHtml(page.content),
			reactions,
			userReaction,
		});
		res.render();
	}
};

module.exports.edit = async (req, { res }) => {
	const renderPage = data => {
		res.setPageData({
			page: "wiki.ejs",
			pageTitle: `${data.title ? `Edit ${data.title}` : "New Page"} - GAwesomeBot Wiki`,
			mode: "edit",
			...data,
		});

		res.render();
	};

	if (req.params.id) {
		try {
			const wikiDocument = await Wiki.findOne(req.params.id);
			renderPage({
				title: wikiDocument._id || req.query.id,
				content: wikiDocument.content || "",
			});
		} catch (err) {
			renderError(res, "An unknown error occurred while loading data.");
		}
	} else {
		renderPage({});
	}
};

module.exports.edit.post = async (req, res) => {
	if (req.params.id) {
		try {
			const wikiDocument = await Wiki.findOne(req.params.id);
			if (!wikiDocument) return renderError(res, "That article does not exist!");
			const history = diff.main(wikiDocument.content, req.body.content).filter(a => a[0] !== 0);
			diff.cleanupSemantic(history);
			wikiDocument.query.push("updates", {
				_id: req.user.id,
				diff: diff.prettyHtml(history),
			}).set("content", req.body.content);

			await wikiDocument.save();
			res.redirect(`/wiki/${wikiDocument._id}`);
		} catch (err) {
			renderError(res, "An error occurred while saving wiki documents!");
		}
	} else {
		const wikiDocument = Wiki.new({
			_id: req.body.title,
			content: req.body.content,
			updates: [{
				_id: req.user.id,
			}],
		});
		await wikiDocument.save();
		res.redirect(`/wiki/${wikiDocument._id}`);
	}
};

module.exports.history = async (req, { res }) => {
	const wikiDocuments = await Wiki.find({}).sort({
		_id: 1,
	}).exec();
	if (!wikiDocuments) {
		renderError(res, "That wiki article does not exist.");
	} else {
		const page = wikiDocuments.find(wikiDocument => wikiDocument._id === req.params.id) || {
			_id: req.params.id,
		};
		let updates;
		if (page.updates && page.reactions) {
			updates = page.updates.map(async updateDocument => {
				const author = await req.app.client.users.fetch(updateDocument._id, true) || {
					id: "invalid-user",
					username: "invalid-user",
				};
				return {
					responsibleUser: {
						name: author.username,
						id: author.id,
						avatar: author.displayAvatarURL() || "/static/img/discord-icon.png",
					},
					relativeTimestamp: moment(updateDocument.timestamp).fromNow(),
					rawTimestamp: moment(updateDocument.timestamp).format(global.configJS.moment_date_format),
					diffHtml: updateDocument.diff,
				};
			});
			updates = (await Promise.all(updates)).reverse();
		}
		res.setPageData({
			page: "wiki.ejs",
			pageTitle: `Edit history for ${page._id} - GAwesomeBot Wiki`,
			pageList: wikiDocuments.map(wikiDocument => wikiDocument._id),
			mode: "history",
			title: `Edit history for ${page._id}`,
			updates,
		});

		res.render();
	}
};

module.exports.react = async (req, res) => {
	if (req.isAuthenticated()) {
		const wikiDocument = await Wiki.findOne(req.params.id);
		if (!wikiDocument) {
			res.sendStatus(404);
		} else {
			req.query.value = parseInt(req.query.value);

			const userReactionQueryDocument = wikiDocument.query.id("reactions", req.user.id);
			if (userReactionQueryDocument.val) {
				if (userReactionQueryDocument.val.value === req.query.value) {
					userReactionQueryDocument.remove();
				} else {
					userReactionQueryDocument.set("value", req.query.value);
				}
			} else {
				wikiDocument.query.push("reactions", {
					_id: req.user.id,
					value: req.query.value,
				});
			}

			wikiDocument.save().then(() => {
				res.sendStatus(200);
			}).catch(() => res.sendStatus(500));
		}
	} else {
		res.sendStatus(403);
	}
};

module.exports.delete = (req, res) => {
	Wiki.delete({ _id: req.params.id }).then(() => {
		res.sendStatus(200);
	}).catch(() => res.sendStatus(500));
};
