/* Old;
	const getPageTitle = () => [
		"Dolphin Musings",
		"The Fault in Our Syntax",
		"How to Become Popular",
		"I wish I were a GAB",
		"A Robot's Thoughts",
		"My Meme Library",
		"Top 10 Prank Channels",
		"Why do we exist?",
		"What is Love?",
		"Updating GAB; My Story",
		"What did I ever do to you?",
		"Welcome back to",
		"BitQuote made this happen",
		"I didn't want this either",
		"The tragic story",
		"Developer Vs. Bot",
		"What did we mess up today?",
		"Where are your fingers?"
	][Math.floor(Math.random() * 17)]
 */
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

const { renderError, parseAuthUser } = require("../helpers");
const parsers = require("../parsers");

const controllers = module.exports;

controllers.index = async (req, res) => {
	let count;
	if (!req.query.count || isNaN(req.query.count)) {
		count = 4;
	} else {
		count = parseInt(req.query.count);
	}
	let page;
	if (!req.query.page || isNaN(req.query.page)) {
		page = 1;
	} else {
		page = parseInt(req.query.page);
	}

	try {
		let rawCount = await Blog.count({});
		if (!rawCount) {
			rawCount = 0;
		}

		const blogDocuments = await Blog.find({}).sort("-published_timestamp").skip(count * (page - 1))
			.limit(count)
			.exec();
		let blogPosts = [];
		if (blogDocuments) {
			blogPosts = Promise.all(blogDocuments.map(async blogDocument => {
				const data = await parsers.blogData(req, blogDocument);
				data.isPreview = true;
				if (data.content.length > 1000) {
					data.content = `${data.content.slice(0, 1000)}...`;
				}
				data.content = md.makeHtml(data.content);
				return data;
			}));
		}
		res.render("pages/blog.ejs", {
			authUser: req.isAuthenticated() ? parseAuthUser(req.user) : null,
			isMaintainer: req.isAuthenticated() ? configJSON.maintainers.indexOf(req.user.id) > -1 : false,
			mode: "list",
			currentPage: page,
			numPages: Math.ceil(rawCount / (count === 0 ? rawCount : count)),
			pageTitle: "GAwesomeBot Blog",
			data: await blogPosts,
		});
	} catch (err) {
		renderError(res, "An error occurred while fetching blog data.");
	}
};

controllers.article = async (req, res) => {
	const blogDocument = await Blog.findOne({
		_id: req.params.id,
	}).exec();
	if (!blogDocument) {
		renderError(res, "Sorry, that blog doesn't exist!");
	} else {
		const data = await parsers.blogData(req, blogDocument);
		const getReactionCount = value => blogDocument.reactions.reduce((count, reactionDocument) => count + (reactionDocument.value === value), 0);
		data.reactions = {};
		[-1, 0, 1].forEach(reaction => {
			data.reactions[reaction] = getReactionCount(reaction);
		});
		if (req.isAuthenticated()) {
			data.userReaction = blogDocument.reactions.id(req.user.id) || {};
		}
		data.content = md.makeHtml(data.content);
		res.render("pages/blog.ejs", {
			authUser: req.isAuthenticated() ? parseAuthUser(req.user) : null,
			isMaintainer: req.isAuthenticated() ? configJSON.maintainers.indexOf(req.user.id) > -1 : false,
			mode: "article",
			pageTitle: `${blogDocument.title} - GAwesomeBot Blog`,
			blogPost: data,
		});
	}
};

controllers.article.compose = async (req, res) => {
	const renderPage = data => {
		res.render("pages/blog.ejs", {
			authUser: req.isAuthenticated() ? parseAuthUser(req.user) : null,
			isMaintainer: true,
			pageTitle: `${data.title ? `Edit ${data.title}` : "New Post"} - GAwesomeBot Blog`,
			mode: "compose",
			data,
		});
	};

	if (req.params.id) {
		const blogDocument = await Blog.findOne({ _id: req.params.id }).exec();
		if (!blogDocument) {
			renderPage({});
		} else {
			renderPage({
				id: blogDocument._id,
				title: blogDocument.title,
				category: blogDocument.category,
				content: blogDocument.content,
			});
		}
	} else {
		renderPage({});
	}
};

controllers.article.compose.post = async (req, res) => {
	if (req.params.id) {
		const blogDocument = await Blog.findOne({ _id: req.params.id }).exec();
		if (!blogDocument) {
			renderError(res, "Sorry, that blog post was not found.");
		} else {
			blogDocument.title = req.body.title;
			blogDocument.category = req.body.category;
			blogDocument.content = req.body.content;

			blogDocument.save(() => {
				res.redirect(`/blog/${blogDocument._id}`);
			});
		}
	} else {
		const blogDocument = new Blog({
			title: req.body.title,
			author_id: req.user.id,
			category: req.body.category,
			content: req.body.content,
		});
		blogDocument.save(() => {
			res.redirect(`/blog/${blogDocument._id}`);
		});
	}
};

controllers.article.react = async (req, res) => {
	if (req.isAuthenticated()) {
		const blogDocument = await Blog.findOne({ _id: req.params.id }).exec();
		if (!blogDocument) {
			res.sendStatus(404);
		} else {
			req.query.value = parseInt(req.query.value);

			const userReactionDocument = blogDocument.reactions.id(req.user.id);
			if (userReactionDocument) {
				if (userReactionDocument.value === req.query.value) {
					userReactionDocument.remove();
				} else {
					userReactionDocument.value = req.query.value;
				}
			} else {
				blogDocument.reactions.push({
					_id: req.user.id,
					value: req.query.value,
				});
			}

			blogDocument.save(err => {
				res.sendStatus(err ? 500 : 200);
			});
		}
	} else {
		res.sendStatus(403);
	}
};

controllers.article.delete = (req, res) => {
	Blog.findByIdAndRemove(req.params.id, err => {
		res.sendStatus(err ? 500 : 200);
	});
};
