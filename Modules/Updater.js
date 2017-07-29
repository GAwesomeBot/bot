const { rp } = require("./Utils.js");
const dgr = require("download-github-repo");
const rimraf = require("rimraf");
const fs = require("fs");

module.exports = {
	check: config => new Promise(async (resolve, reject) => {
		let res;
		try {
			res = await rp.get({
				uri: `https://status.gilbertgobbels.xyz/versions/${config.branch}/check?v=${config.version}`,
			});
		} catch (err) {
			reject(err);
		}
		if (res) {
			if (!res.body["up-to-date"] && !res.body.latest) {
				reject(new Error(`Got a 404 from the server / this version is outdated..?`));
			}
			resolve(res.body);
		}
	}),
	get: (branch, version) => new Promise(async (resolve, reject) => {
		let res;
		try {
			res = await rp.get({
				uri: `https://status.gilbertgobbels.xyz/versions/${branch}/${version}`,
			});
		} catch (err) {
			reject(err);
		}
		if (res) {
			if (res.statusCode === 404) reject(new Error(`Couldn't find the requested version / branch combo.`));
			resolve(res.body);
		}
	}),
	update: async (bot, config, io) => {
		winston.info(`Preparing for update...`);

		// TODO: bot.shard.send(`[UPDATER] Shutdown`);

		config.isUpdating = true;

		io.emit("update", "metadata");
		winston.info(`Fetching newest version metadata..`);

		let res;
		try {
			res = await rp.get({
				uri: `https://status.gilbertgobbels.xyz/versions/${config.branch}/check?v=${config.version}`,
			});
		} catch (err) {
			throw err;
		}
		io.emit("update", "downloading");
		winston.info(`Downloading the newest version from GitHub`);

		if (!fs.existsSync("./Temp")) fs.mkdirSync("./Temp");
		const tempPath = fs.mkdtempSync("./Temp/v-");
		let repoBranch = config.branch;
		if (config.branc === "stable") repoBranch = "master";

		dgr(`GilbertGobbels/GAwesomeBot#${repoBranch}`, tempPath, () => {
			const body = res.body.latest;
			const filesc = [];
			const files = [];

			for (let i = 0; i < body.files.length; i++) {
				// TODO: Gilbert check this pls
				if (body.files[i].substring(0, 13) === "Configurations/") {
					const dataNew = fs.readFileSync(`${tempPath}/${body.files[i]}`, "utf8");
					const dataOld = fs.readFileSync(`./${body.files[i]}`, "utf8");
					filesc.push({
						file: body.files[i],
						dataNew,
						dataOld,
					});
				} else {
					files.push(body.files[i]);
				}
			}

			io.emit("update", "files_conf");
			io.on("confirm", data => {
				if (data === "filesc") io.emit("files_conf", filesc);
				else if (data === "files") io.emit("files", files);
			});

			winston.info(`Awaiting response from client..`);

			io.on("files_conf", files_conf => {
				winston.info(`Installing configuration files..`);
				for (let i = 0; i < files_conf.length; i++) {
					fs.writeFileSync(`./${files_conf[i].file}`, files_conf[i].data);
				}

				io.emit("update", "files");
				winston.info(`Awaiting response from client..`);

				io.on("files", cfiles => {
					winston.info(`Installing the new files..`);
					io.emit("update", "install");

					for (let i = 0; i < cfiles.length; i++) {
						fs.createReadStream(`${tempPath}/${cfiles[i]}`).pipe(fs.createWriteStream(`./${cfiles[i]}`));
					}

					io.emit("update", "done");
					winston.info(`Finalizing the update..`);

					const configg = JSON.parse(fs.readFileSync(`./Configurations/config.json`, "utf8"));
					configg.version = body.version;
					fs.writeFileSync("./Configurations/config.json", JSON.stringify(configg, null, 4));

					winston.info(`Cleaning up..`);

					rimraf(tempPath, () => {
						io.emit("update", "finished");
						winston.info(`Finished updating. Please restart GAwesomeBot.`);
					});
				});
			});
		});
	},
};
