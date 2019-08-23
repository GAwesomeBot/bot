const os = require("os");

module.exports = async ({ client, Constants: { Colors, Perms } }, msg, commandData) => {
	let versionError = null;
	const version = await client.central.API("versions").branch(configJSON.branch).get(configJSON.version)
		.catch(err => {
			versionError = err;
		}) || { valid: false };
	if (msg.suffix) {
		const args = msg.suffix.split(" ");
		if (args.includes("-h") || args.includes("--help")) {
			const fields = [{
				name: "-p, --process",
				value: "Display information about the current shard process",
			}, {
				name: "-v, --version",
				value: "Display information about the GAwesomeBot version",
			}, {
				name: "-d, --discord, --bot",
				value: "Show details about the Discord bot user and client",
			}, {
				name: "-m, --master",
				value: "Display information about the master process",
			}, {
				name: "-o, --os, --operating-system",
				value: "Display information about the Operating System GAwesomeBot is running on",
			}, {
				name: "--perms",
				value: "Show your current permissions within GAwesomeBot",
			}, {
				name: "--no-general",
				value: "Hide general debug information and only show data requested via arguments",
			}];
			fields.push({
				name: "-h, --help",
				value: "Display this help message, overrides any other arguments passed",
			});
			await msg.send({
				embed: {
					color: Colors.INFO,
					title: `The debug command arguments`,
					fields,
				},
			});
		} else {
			const fields = [];
			let showDefault = true;
			if (args.includes("--no-general")) showDefault = false;

			if (args.includes("-p") || args.includes("--process")) {
				fields.push({
					name: "Shard Process Information",
					value: `💎 Process is running **${process.release.name} ${process.version}** (located at **${process.execPath}**) with Process ID **${process.pid}** and Shard ID **${client.shardID}**, node is running from **${process.cwd()}**
								\n💾 Using a Heap with **${Math.ceil(process.memoryUsage().heapTotal / 1000000)}MB** RAM reserved, out of a resident set size of **${Math.ceil(process.memoryUsage().rss / 1000000)}MB**
								\n⏲ Process has been running for **${Math.floor(process.uptime() / 3600)} hours**`,
				});
			}
			if (args.includes("-v") || args.includes("--version")) {
				if (!version.valid) {
					fields.push({
						name: "GAwesomeBot Version Information",
						value: `💽 Currently running an unknown version of GAwesomeBot tagged as **${configJSON.version}** on branch **${configJSON.branch}**.`,
					});
				} else {
					fields.push({
						name: "GAwesomeBot Version Information",
						value: `💽 Currently running GAwesomeBot **${version.metadata.name}**, on branch **${version.branch}**
								\n🔄 Version is synced with commit **${version.sha}**, and tagged with unique tag **${version.tag}**`,
					});
				}
			}
			if (args.includes("-d") || args.includes("--discord") || args.includes("--bot")) {
				fields.push({
					name: "Bot User Information",
					value: `🆔 GAwesomeBot is using the bot account **${client.user.tag}**, with ID **${client.user.id}**
								\n🔌 Connected to Discord with **${Math.floor(client.ws.ping)}ms** latency, for **${Math.floor(client.uptime / 3600000)} hours** so far`,
				});
			}
			if (args.includes("-m") || args.includes("--master")) {
				const masterData = await client.IPC.send("shardData", { noShards: true });
				fields.push({
					name: "Master Process Information",
					value: `💎 Process is running **${process.release.name} ${process.version}** (located at **${process.execPath}**) with Process ID **${masterData.master.PID}**, node is running from **${process.cwd()}**
								\n💾 Using a resident set size of **${Math.ceil(masterData.master.rss)}MB**
								\n🗄 GAwesomeBot's MongoDB has **${masterData.master.users} users**, and **${masterData.master.guilds} guilds** registered. The query took **${masterData.master.ping}** to finish
								\n⏲ Process has been running for **${masterData.master.uptime} hours**`,
				});
			}
			if (args.includes("-o") || args.includes("--os") || args.includes("--operating-system")) {
				let { platform } = process;
				switch (platform) {
					case "win32":
						platform = "Windows";
						break;
					case "darwin":
						platform = "MacOS";
						break;
					case "linux":
						platform = "Linux";
						break;
					default:
						platform = `an unknown Operating System (${process.platform})`;
						break;
				}
				fields.push({
					name: "Operating System Information",
					value: `🖥 Hosted on **${platform}**, using a ${os.cpus().length}-core processor with ${os.arch()} architecture
								\n💾 System has a total of **${Math.ceil(os.totalmem() / 1000000)}MB** RAM, of which **${Math.ceil((os.totalmem() - os.freemem()) / 1000000)}MB** is in use
								\n👤 GAwesomeBot is operated by OS User **${os.userInfo().username}**`,
				});
			}
			if (args.includes("--perms")) {
				const isMaintainer = configJSON.maintainers.includes(msg.author.id);
				const isSudoMaintainer = configJSON.sudoMaintainers.includes(msg.author.id);
				const isHost = process.env.GAB_HOST === msg.author.id;
				if (isHost) {
					fields.push({
						name: "Your Maintainer Permissions",
						value: `🔧 You are **the Host**
									\n⚡ As the current Host, you have unrestricted authority over **all** of GAwesomeBot`,
					});
				} else if (!isMaintainer && !isSudoMaintainer) {
					fields.push({
						name: "Your Maintainer Permissions",
						value: `❌ You are **not** a maintainer`,
					});
				} else {
					const perms = [];
					Object.keys(configJSON.perms).forEach(perm => {
						if (!isMaintainer) return;
						if (!isSudoMaintainer && configJSON.perms[perm] === 2) return;
						if (!isHost && configJSON.perms[perm] === 0) return;
						perms.push(Perms[perm]);
					});
					fields.push({
						name: "Your Maintainer Permissions",
						value: `🔧 You are a **${isSudoMaintainer ? "Sudo " : ""}Maintainer**
									\n⚡ Your permissions:\n\t${perms.join("\n\t")}`,
					});
				}
			}

			if (versionError) {
				fields.push({
					name: "An error was encountered while fetching Version Metadata:",
					value: `\`\`\`js\n${versionError.stack}\n\`\`\``,
				});
			}

			await msg.send({
				embed: {
					color: Colors.RESPONSE,
					title: showDefault ? `GAwesomeBot Debug Information` : ``,
					description: showDefault ? `Currently on shard with ID ${client.shardID}, out of ${process.env.SHARD_COUNT} shards total.
											\nShard's ${process.release.name} process is using ${Math.ceil(process.memoryUsage().heapTotal / 1000000)}MB RAM, with PID ${process.pid}.
											\nShard has been connected to Discord for ${Math.floor(client.uptime / 3600000)} hours, and manages ${client.guilds.size} guild${client.guilds.size === 1 ? "" : "s"} with a ping of ${Math.floor(client.ws.ping)}ms.` : null,
					footer: {
						text: "Use argument '-h' to learn more about debug",
					},
					fields,
				},
			});
		}
	} else {
		await msg.send({
			embed: {
				color: Colors.INFO,
				title: `${client.user.tag} running ${version.valid ? `GAwesomeBot version ${version.metadata.name}` : "an unknown GAwesomeBot version"}`,
				description: `Currently on shard with ID ${client.shardID}, out of ${process.env.SHARD_COUNT} shards total.
											\nShard's ${process.release.name} process is using ${Math.ceil(process.memoryUsage().heapTotal / 1000000)}MB RAM, with PID ${process.pid}.
											\nShard has been connected to Discord for ${Math.floor(client.uptime / 3600000)} hours, and manages ${client.guilds.size} guild${client.guilds.size === 1 ? "" : "s"} with a ping of ${Math.floor(client.ws.ping)}ms.`,
				footer: {
					text: "Use argument '-h' to learn more about debug",
				},
			},
		});
	}
};
