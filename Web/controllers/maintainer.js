const { getRoundedUptime } = require("../helpers");
const Updater = require("../../Modules/Updater");

const controllers = module.exports;

controllers.maintainer = async (req, { res }) => {
	const result = await Servers.aggregate([{
		$group: {
			_id: null,
			total: {
				$sum: {
					$add: ["$messages_today"],
				},
			},
		},
	}]).exec();
	let messageCount = 0;
	if (result) {
		messageCount = result[0].total;
	}

	const trafficData = req.app.client.traffic.data();
	const version = await Updater.check();

	res.setPageData({
		serverCount: await req.app.client.guilds.totalCount,
		userCount: await req.app.client.users.totalCount,
		totalMessageCount: messageCount,
		roundedUptime: getRoundedUptime(process.uptime()),
		trafficData: await trafficData,
		currentShard: req.app.client.shardID,
		page: "maintainer.ejs",
	});

	res.setConfigData({
		shardCount: configJS.shardTotal,
		version: configJSON.version,
		utd: version["up-to-date"],
		latestVersion: version.latest ? version.latest.version : null,
		disabled: version === 404,
	});

	res.render();
};
