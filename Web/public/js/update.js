/* eslint-disable max-len */
$(document).ready(() => {
	window.GAwesomeUtil = window.GAwesomeUtil || { dashboard: {} };
	window.GAwesomeData = window.GAwesomeData || {};
	GAwesomeUtil.dashboard.versioning = {};
	GAwesomeData.IHTML = {
		article: "<article id='{ID}' class='message installer-log is-{LEVEL}'><div class='message-body'><div class='content'>{LOG}</div></div></article>",
		colors: {
			info: "info",
			error: "danger",
			warn: "warning",
			success: "success",
		},
	};

	let totalCountedChunks = 0;
	let totalChunks = 0;

	GAwesomeUtil.dashboard.versioning.downloadVersion = (button, branch, tag) => {
		totalCountedChunks = 0;

		const progress = $("progress.is-appended");
		progress.attr("value", 0);
		progress.css("height", ".5rem");
		button.addClass("is-loading");
		const setProgress = percentage => {
			progress.attr("value", Math.round(percentage));
		};

		GAwesomeData.dashboard.socket.on("totalChunks", chunks => {
			totalChunks = chunks;
		});
		GAwesomeData.dashboard.socket.on("downloadSuccess", () => {
			GAwesomeUtil.log(`[UPDATE] Version Download finished with total of ${totalCountedChunks} bytes. (100%)`);
			button.html("Install").removeClass("is-loading");
			$(".version-update-indicator").css("animation-name", "none");
			setProgress(100);
			$("#version-cloud-icon").remove();
			return setTimeout(() => progress.css("height", "0"), 500);
		});
		GAwesomeData.dashboard.socket.on("chunk", chunk => {
			totalCountedChunks += chunk;
			let percentage = (totalCountedChunks / totalChunks) * 100;
			if (percentage > 95) percentage = 95;
			setProgress(percentage);
			GAwesomeUtil.log(`[UPDATE] Received Chunk Size: ${chunk} (${percentage}%)`);
		});

		GAwesomeUtil.log("[UPDATE] Starting Version Download...");
		GAwesomeData.dashboard.socket.emit("download", {
			branch,
			tag,
		});
	};

	GAwesomeUtil.dashboard.versioning.installVersion = (button, branch, tag) => {
		$(".version-update-indicator").css("animation-name", "version-update-indicator-install");
		$("#version-installer").slideToggle();
		button.addClass("is-loading");

		let currentLog;
		let updating = true;
		const logMessage = log => {
			const message = $(`#${log.id}`);
			if (!message[0]) {
				$("#installer-logs").prepend(GAwesomeData.IHTML.article.replace("{ID}", log.id)
					.replace("{LEVEL}", GAwesomeData.IHTML.colors[log.type])
					.replace("{LOG}", log.msg));
				currentLog = log.id;
			} else {
				message.removeClass("is-info").removeClass("is-warning").removeClass("is-error");
				message.addClass(`is-${GAwesomeData.IHTML.colors[log.type]}`);
				message.find(".content").html(log.msg);
				if (log.header) message.find(".message-header").html(log.header);
			}
		};
		const onDisconnect = err => {
			if (!updating) return;
			if (err === "disconnect") {
				logMessage({ id: currentLog, type: "error", msg: "Lost connection during operation." });
				logMessage({ id: "update-warning", type: "error", msg: "Restart GAwesomeBot and attempt to re-install the update to prevent corruption issues.", header: "Uh-oh. Lost connection to GAwesomeBot!" });
			} else {
				logMessage({ id: currentLog, type: "error", msg: "An unexpected exception occurred. Please try installing again." });
				GAwesomeUtil.error(JSON.stringify(err));
			}
			button.removeClass("is-loading").attr("disabled", true);
			$(".version-update-indicator").css("animation-name", "version-update-indicator-error");
		};
		GAwesomeData.dashboard.socket.on("disconnect", () => onDisconnect("disconnect"));
		GAwesomeData.dashboard.socket.on("err", onDisconnect);
		GAwesomeData.dashboard.socket.on("installLog", logMessage);
		GAwesomeData.dashboard.socket.on("installFinish", () => {
			logMessage({ id: "update-warning", type: "success", msg: "GAwesomeBot has been successfully updated. Please restart GAwesomeBot to apply the changes. You may now close this window.", header: "Great success!" });
			button.remove();
			$(".version-update-indicator").css("animation-name", "version-update-indicator-success");
			updating = false;
		});
		GAwesomeData.dashboard.socket.emit("install", {
			branch,
			tag,
		});
	};


	const button = $("#update-btn");
	button.click(() => {
		const op = button.data("op");
		if (op === "download") {
			GAwesomeUtil.dashboard.versioning.downloadVersion(button, button.data("branch"), button.data("tag"));
			button.data("op", "install");
		} else {
			GAwesomeUtil.dashboard.versioning.installVersion(button, button.data("branch"), button.data("tag"));
		}
	});
});
