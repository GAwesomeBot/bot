const { APIResponses } = require("../../Internals/Constants");
const { GetGuild } = require("../../Modules").getGuild;
const parsers = require("../parsers");
const { getUserList } = require("../helpers");

const controllers = module.exports;

controllers.status = async (req, res) => {
	res.json({
		api_version: "4.1",
		server_count: await req.app.client.guilds.totalCount,
		user_count: await req.app.client.users.totalCount,
	});
};

controllers.servers = async (req, res) => {
	const params = {
		"config.public_data.isShown": true,
	};
	if (req.query.id) {
		params._id = req.query.id;
	}
	const webp = req.accepts("image/webp") !== false;
	let limit = parseInt(req.query.count) || 50;
	if (limit > 50 || limit < 1) limit = 50;
	Servers.find(params).skip(req.query.start ? parseInt(req.query.start) : 0).limit(limit)
		.exec()
		.then(async serverDocuments => {
			if (serverDocuments && serverDocuments.length) {
				const data = await Promise.all(serverDocuments.map(serverDocument => parsers.serverData(req, serverDocument, webp) || serverDocument._id));
				data.spliceNullElements();
				res.json(APIResponses.servers.success(data));
			} else {
				res.status(404).json(APIResponses.servers.notFound());
			}
		})
		.catch(() => res.status(500).json(APIResponses.servers.internalError()));
};

controllers.servers.channels = async (req, res) => res.json(req.svr.channels);

controllers.servers.list = async (req, res) => {
	const servers = await GetGuild.getAll(req.app.client, { resolve: "name", strict: true, parse: "noKeys" });
	servers.sort();
	res.json(servers);
};

controllers.users = async (req, res) => {
	if (!req.query.id) {
		res.status(400).json(APIResponses.users.badRequest());
		return;
	}
	try {
		let user = req.app.client.users.get(req.query.id);
		if (!user) user = await req.app.client.users.fetch(req.query.id, true);

		if (user) {
			let userDocument = await Users.findOne(user.id);
			if (!userDocument) userDocument = await Users.create({ _id: user.id });
			res.json(APIResponses.users.success(await parsers.userData(req, user, userDocument)));
		} else {
			res.status(404).json(APIResponses.users.notFound());
		}
	} catch (_) {
		res.status(500).json(APIResponses.users.internalError());
	}
};

controllers.users.list = async (req, res) => {
	if (req.isAuthorized) {
		await req.svr.fetchMember(req.svr.memberList);
		res.json(getUserList(Object.values(req.svr.members).map(member => member.user)));
	} else {
		const userDocuments = await Users.aggregate([{
			$project: {
				username: 1,
			},
		}]);
		if (userDocuments) {
			const response = userDocuments.map(usr => usr.username || null).filter(u => u !== null && u.split("#")[1] !== "0000").sort();
			response.spliceNullElements();
			res.json(response);
		} else {
			res.status(500);
		}
	}
};

controllers.extensions = async (req, res) => {
	const params = {};
	if (req.query.id) {
		params._id = req.query.id;
	}
	if (req.query.name) {
		params.name = req.query.name;
	}
	if (req.query.type) {
		params.type = req.query.type;
	}
	if (req.query.status) {
		params.state = req.query.status;
	}
	if (req.query.owner) {
		params.owner_id = req.query.owner;
	}

	let rawCount = await Gallery.count(params);
	if (rawCount === null) {
		rawCount = 0;
	}

	try {
		const galleryDocuments = await Gallery.find(params).skip(req.query.start ? parseInt(req.query.start) : 0).limit(req.query.count ? parseInt(req.query.count) : rawCount)
			.exec();
		if (galleryDocuments && galleryDocuments.length) {
			const data = await Promise.all(galleryDocuments.map(galleryDocument => parsers.extensionData(req, galleryDocument)));
			res.status(200).json(APIResponses.extensions.success(data));
		} else {
			res.status(404).json(APIResponses.extensions.notFound());
		}
	} catch (_) {
		res.status(500).json(APIResponses.extensions.internalError());
	}
};
