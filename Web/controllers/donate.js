module.exports = (req, { res }) => {
	res.setConfigData({
		charities: configJS.donateCharities,
		donateSubtitle: configJS.donateSubtitle,
	});

	res.setPageData("page", "donate.ejs");

	res.render();
};
