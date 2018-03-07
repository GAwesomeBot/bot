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

const { renderError, parseAuthUser } = require("../helpers");

module.exports = (req, res) => {
	Wiki.find({}).sort({
		_id: 1,
	}).exec((err, wikiDocuments) => {
		if (err || !wikiDocuments) {
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

			res.render("pages/wiki.ejs", {
				authUser: req.isAuthenticated() ? parseAuthUser(req.user) : null,
				isContributor: req.isAuthenticated() ? configJSON.wikiContributors.includes(req.user.id) || configJSON.maintainers.includes(req.user.id) : false,
				pageTitle: `Search for "${req.query.q}" - GAwesomeBot Wiki`,
				pageList: wikiDocuments.map(wikiDocument => wikiDocument._id),
				mode: "search",
				data: {
					title: req.query.q ? `Search for "${req.query.q}"` : "List of all pages",
					activeSearchQuery: req.query.q,
					searchResults,
				},
			});
		} else {
			res.redirect("/wiki/Home");
		}
	});
};

module.exports.readArticle = (req, res) => {
	Wiki.find({}).sort({
		_id: 1,
	}).exec((err, wikiDocuments) => {
		if (err || !wikiDocuments) {
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
			res.render("pages/wiki.ejs", {
				authUser: req.isAuthenticated() ? parseAuthUser(req.user) : null,
				isContributor: req.isAuthenticated() ? configJSON.wikiContributors.includes(req.user.id) || configJSON.maintainers.includes(req.user.id) : false,
				pageTitle: `${page._id} - GAwesomeBot Wiki`,
				pageList: wikiDocuments.map(wikiDocument => wikiDocument._id),
				mode: "page",
				data: {
					title: page._id,
					content: md.makeHtml(page.content),
					reactions,
					userReaction,
				},
			});
		}
	});
};

module.exports.edit = async (req, res) => {
	const renderPage = data => {
		res.render("pages/wiki.ejs", {
			authUser: req.isAuthenticated() ? parseAuthUser(req.user) : null,
			pageTitle: `${data.title ? `Edit ${data.title}` : "New Page"} - GAwesomeBot Wiki`,
			mode: "edit",
			data,
		});
	};

	if (req.params.id) {
		try {
			const wikiDocument = await Wiki.findOne({ _id: req.params.id }).exec();
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
			const wikiDocument = await Wiki.findOne({_id: req.params.id}).exec();
			if (!wikiDocument) return renderError(res, "That article does not exist!");
			wikiDocument.updates.push({
				_id: req.user.id,
				diff: diff.prettyHtml(diff.main(wikiDocument.content, req.body.content).filter(a => a[0] !== 0)),
			});
			wikiDocument.content = req.body.content;

			wikiDocument.save(() => {
				res.redirect(`/wiki/${wikiDocument._id}`);
			});
		} catch (err) {
			renderError(res, "An error occurred while saving wiki documents!");
		}
	} else {
		const wikiDocument = new Wiki({
			_id: req.body.title,
			content: req.body.content,
			updates: [{
				_id: req.user.id,
			}],
		});
		wikiDocument.save(() => {
			res.redirect(`/wiki/${wikiDocument._id}`);
		});
	}
};

module.exports.history = async (req, res) => {
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
						avatar: author.avatarURL() || "/static/img/discord-icon.png",
					},
					relativeTimestamp: moment(updateDocument.timestamp).fromNow(),
					rawTimestamp: moment(updateDocument.timestamp).format(global.configJS.moment_date_format),
					diffHtml: updateDocument.diff,
				};
			});
			updates = await Promise.all(updates);
		}
		res.render("pages/wiki.ejs", {
			authUser: req.isAuthenticated() ? parseAuthUser(req.user) : null,
			isContributor: req.isAuthenticated() ? configJSON.wikiContributors.includes(req.user.id) || configJSON.maintainers.includes(req.user.id) : false,
			pageTitle: `Edit history for ${page._id} - GAwesomeBot Wiki`,
			pageList: wikiDocuments.map(wikiDocument => wikiDocument._id),
			mode: "history",
			data: {
				title: `Edit history for ${page._id}`,
				updates,
			},
		});
	}
};

module.exports.react = async (req, res) => {
	if (req.isAuthenticated()) {
		const wikiDocument = await Wiki.findOne({ _id: req.params.id }).exec();
		if (!wikiDocument) {
			res.sendStatus(404);
		} else {
			req.query.value = parseInt(req.query.value);

			const userReactionDocument = wikiDocument.reactions.id(req.user.id);
			if (userReactionDocument) {
				if (userReactionDocument.value === req.query.value) {
					userReactionDocument.remove();
				} else {
					userReactionDocument.value = req.query.value;
				}
			} else {
				wikiDocument.reactions.push({
					_id: req.user.id,
					value: req.query.value,
				});
			}

			wikiDocument.save(err => {
				res.sendStatus(err ? 500 : 200);
			});
		}
	} else {
		res.sendStatus(403);
	}
};

module.exports.delete = (req, res) => {
	Wiki.findByIdAndRemove(req.params.id, err => {
		res.sendStatus(err ? 500 : 200);
	});
};
