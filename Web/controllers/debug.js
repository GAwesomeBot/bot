const controllers = module.exports;

controllers["503"] = (req, res) => res.status(503).render("pages/503.ejs");

controllers["404"] = (req, res) => res.status(404).render("pages/404.ejs");
