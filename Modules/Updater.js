const dgr = require("download-github-repo");
const fs = require("fs-extra");

module.exports = {
	check: config => new Promise(async (resolve, reject) => {
		let res;
		try {
			res = await rp.get({
				uri: `https://status.gawesomebot.com/versions/${config.branch}/check?v=${config.version}`,
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
				uri: `https://status.gawesomebot.com/versions/${branch}/${version}`,
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

		config.isUpdating = true;

		io.emit("update", "metadata");
		winston.info(`Fetching newest version metadata..`);

		let res;
		try {
			res = await rp.get({
				uri: `https://status.gawesomebot.com/versions/${config.branch}/check?v=${config.version}`,
			});
		} catch (err) {
			throw err;
		}
		io.emit("update", "downloading");
		winston.info(`Downloading the newest version from GitHub`);

		if (!await fs.exists("./Temp")) await fs.mkdir("./Temp");
		const tempPath = await fs.mkdtemp("./Temp/v-");
		let repoBranch = config.branch;
		if (config.branc === "stable") repoBranch = "master";

		dgr(`GilbertGobbels/GAwesomeBot#${repoBranch}`, tempPath, async () => {
			const body = res.body.latest;
			const filesc = [];
			const files = [];

			/* eslint-disable no-await-in-loop*/
			// Gilbert make this use await Promise.all pls
			for (let i = 0; i < body.files.length; i++) {
				// Gilbert check this pls
				if (body.files[i].substring(0, 13) === "Configurations/") {
					const dataNew = await fs.readFile(`${tempPath}/${body.files[i]}`, "utf8");
					const dataOld = await fs.readFile(`./${body.files[i]}`, "utf8");
					filesc.push({
						file: body.files[i],
						dataNew,
						dataOld,
					});
				} else {
					files.push(body.files[i]);
				}
			}
			/* eslint-enable no-await-in-loop*/
			io.emit("update", "files_conf");
			io.on("confirm", data => {
				if (data === "filesc") io.emit("files_conf", filesc);
				else if (data === "files") io.emit("files", files);
			});

			winston.info(`Awaiting response from client..`);

			io.on("files_conf", async files_conf => {
				winston.info(`Installing configuration files..`);
				const promiseArray = [];
				for (let i = 0; i < files_conf.length; i++) {
					promiseArray.push(fs.writeFile(`./${files_conf[i].file}`, files_conf[i].data));
				}
				await Promise.all(promiseArray);

				io.emit("update", "files");
				winston.info(`Awaiting response from client..`);

				io.on("files", async cfiles => {
					winston.info(`Installing the new files..`);
					io.emit("update", "install");

					for (let i = 0; i < cfiles.length; i++) {
						fs.createReadStream(`${tempPath}/${cfiles[i]}`).pipe(fs.createWriteStream(`./${cfiles[i]}`));
					}

					io.emit("update", "done");
					winston.info(`Finalizing the update..`);

					const configg = JSON.parse(await fs.readFile(`./Configurations/config.json`, "utf8"));
					configg.version = body.version;
					try {
						await fs.writeFile("./Configurations/config.json", JSON.stringify(configg, null, 4));
					} catch (err) {
						winston.verbose(`There has been an error saving the config.json file.. Impossible!`, err);
					}

					winston.info(`Cleaning up..`);

					try {
						await fs.remove(tempPath);
						io.emit("update", "finished");
						winston.info(`Finished updating. Please restart GAwesomeBot.`);
					} catch (err) {
						winston.verbose(`Couldn't remove the temp directory for the updater..`, err);
					}
				});
			});
		});
	},
};
