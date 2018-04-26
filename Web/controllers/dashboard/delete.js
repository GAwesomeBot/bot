module.exports = pullEndpointKey => (req, res) => {
	switch (pullEndpointKey) {
		case "muted": {
			const memberDocument = req.svr.document.members.id(req.params.id);
			if (!memberDocument || !req.svr.memberList.includes(req.params.id)) return res.sendStatus(404);
			for (let memberMutedDocument of memberDocument.muted) {
				req.app.client.IPC.send("unmuteMember", { guild: req.svr.id, channel: memberMutedDocument._id, member: req.params.id });
			}
			memberDocument.muted = [];
			break;
		}
		case "tags":
			req.svr.document.config.tags.list.pull(req.params.id);
			break;
		default:
			req.svr.document.config[pullEndpointKey].pull(req.params.id);
	}
	require("../../helpers").saveAdminConsoleOptions(req, res, true);
};
