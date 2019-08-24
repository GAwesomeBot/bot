module.exports = pullEndpointKey => async (req, res) => {
	switch (pullEndpointKey) {
		case "muted": {
			const memberDocument = req.svr.document.members[req.params.id];
			if (!memberDocument || !req.svr.memberList.includes(req.params.id)) return res.sendStatus(404);
			for (const memberMutedDocument of memberDocument.muted) {
				req.app.client.IPC.send("unmuteMember", { guild: req.svr.id, channel: memberMutedDocument._id, member: req.params.id });
			}
			req.svr.queryDocument.id("members", req.params.id).set("muted", []);
			break;
		}
		case "tags":
			req.svr.queryDocument.pull("config.tags.list", req.params.id);
			break;
		case "extensions": {
			req.svr.queryDocument.pull("extensions", req.params.id);
			break;
		}
		default:
			req.svr.queryDocument.pull(`config.${pullEndpointKey}`, req.params.id);
	}
	require("../../helpers").saveAdminConsoleOptions(req, res, true);
};
