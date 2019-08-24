const { ObjectID } = require("mongodb");
const showdown = require("showdown");
const md = new showdown.Converter({
	tables: true,
	simplifiedAutoLink: true,
	strikethrough: true,
	tasklists: true,
	smoothLivePreview: true,
	smartIndentationFix: true,
	extensions: [require("showdown-xss-filter")],
});
md.setFlavor("github");

const { renderError } = require("../helpers");
const parsers = require("../parsers");

const controllers = module.exports;

controllers.index = async (req, { res }) => {
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

		const blogDocuments = await Blog.find({}).sort({ published_timestamp: -1 }).skip(count * (page - 1))
			.limit(count)
			.exec();
		let blogPosts = [];
		if (blogDocuments) {
			blogPosts = await Promise.all(blogDocuments.map(async blogDocument => {
				const data = await parsers.blogData(req, blogDocument);
				data.isPreview = true;
				if (data.content.length > 1000) {
					data.content = `${data.content.slice(0, 1000)}...`;
				}
				data.content = md.makeHtml(data.content);
				return data;
			}));
		}

		res.setPageData({
			page: "blog.ejs",
			mode: "list",
			currentPage: page,
			numPages: Math.ceil(rawCount / (count === 0 ? rawCount : count)),
			pageTitle: "GAwesomeBot Blog",
			data: blogPosts,
		});
		res.render();
	} catch (err) {
		renderError(res, "An error occurred while fetching blog data.");
	}
};

controllers.article = async (req, { res }) => {
	const blogDocument = await Blog.findOne(new ObjectID(req.params.id));
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

		res.setPageData({
			page: "blog.ejs",
			mode: "article",
			pageTitle: `${blogDocument.title} - GAwesomeBot Blog`,
			blogPost: data,
		});
		res.render();
	}
};

controllers.article.compose = async (req, { res }) => {
	const renderPage = data => {
		res.setPageData({
			page: "blog.ejs",
			pageTitle: `${data.title ? `Edit ${data.title}` : "New Post"} - GAwesomeBot Blog`,
			mode: "compose",
			data,
		});

		res.render();
	};

	if (req.params.id) {
		const blogDocument = await Blog.findOne(new ObjectID(req.params.id));
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
		const blogDocument = await Blog.findOne(new ObjectID(req.params.id));
		if (!blogDocument) {
			renderError(res, "Sorry, that blog post was not found.");
		} else {
			blogDocument.query.set("title", req.body.title)
				.set("category", req.body.category)
				.set("content", req.body.content);

			blogDocument.save().then(() => {
				res.redirect(`/blog/${blogDocument._id.toString()}`);
			}).catch(() => res.sendStatus(500));
		}
	} else {
		const blogDocument = Blog.new({
			title: req.body.title,
			author_id: req.user.id,
			category: req.body.category,
			content: req.body.content,
		});
		blogDocument.save().then(() => {
			res.redirect(`/blog/${blogDocument._id.toString()}`);
		}).catch(() => res.sendStatus(500));
	}
};

controllers.article.react = async (req, res) => {
	if (req.isAuthenticated()) {
		const blogDocument = await Blog.findOne(new ObjectID(req.params.id));
		if (!blogDocument) {
			res.sendStatus(404);
		} else {
			req.query.value = parseInt(req.query.value);

			const userReactionQueryDocument = blogDocument.query.id("reactions", req.user.id);
			if (userReactionQueryDocument.val) {
				if (userReactionQueryDocument.val.value === req.query.value) {
					userReactionQueryDocument.remove();
				} else {
					userReactionQueryDocument.set("value", req.query.value);
				}
			} else {
				blogDocument.query.push("reactions", {
					_id: req.user.id,
					value: req.query.value,
				});
			}

			blogDocument.save().then(() => {
				res.sendStatus(200);
			}).catch(() => res.sendStatus(500));
		}
	} else {
		res.sendStatus(403);
	}
};

controllers.article.delete = (req, res) => {
	Blog.delete({ _id: new ObjectID(req.params.id) }).then(() => {
		res.sendStatus(200);
	}).catch(() => res.sendStatus(500));
};
