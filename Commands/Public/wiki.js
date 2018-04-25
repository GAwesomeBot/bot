const wiki = require("wikijs").default();
const PaginatedEmbed = require("../../Modules/MessageUtils/PaginatedEmbed");

/*
{ raw:
   { pageid: 6710844,
     ns: 0,
     title: 'Hello',
     contentmodel: 'wikitext',
     pagelanguage: 'en',
     pagelanguagehtmlcode: 'en',
     pagelanguagedir: 'ltr',
     touched: '2018-04-06T11:52:13Z',
     lastrevid: 833894712,
     length: 11891,
     fullurl: 'https://en.wikipedia.org/wiki/Hello',
     editurl: 'https://en.wikipedia.org/w/index.php?title=Hello&action=edit',
     canonicalurl: 'https://en.wikipedia.org/wiki/Hello' },
  html: [Function: html],
  content: [Function: content],
  summary: [Function: summary],
  images: [Function: images],
  references: [Function: references],
  links: [Function: links],
  categories: [Function: categories],
  coordinates: [Function: coordinates],
  info: [Function: q],
  backlinks: [Function: backlinks],
  rawImages: [Function: h],
  mainImage: [Function: mainImage],
  langlinks: [Function: langlinks],
  rawInfo: [Function: p],
  fullInfo: [Function: fullInfo] }

  if multiple: page.raw.pageprops: { disambiguation: '' } },
  summary: 
  What or WHAT may refer to:
what, an interrogative pronoun in English:
"What?", one of the Five Ws used in journalism.
*/

module.exports = async ({ Constants: { Colors, Text, APIs } }, { serverDocument }, msg, commandData) => {
	await msg.send({
		embed: {
			color: Colors.INFO,
			title: `Searching Wikipedia just for you`,
			description: `Please stand by...`,
		},
	});
	let result;
	if (!msg.suffix) {
		const random = await wiki.random(1);
		result = await wiki.page(random[0]);
	} else {
		const search = await wiki.search(msg.suffix, 1);
		if (!search.results.length) {
			return msg.send({
				embed: {
					color: Colors.SOFT_ERR,
					title: "What was that again? 📚🤓",
					description: "The almighty Wikipedia could not find a result for your search query. Maybe try something different?",
				},
			});
		}
		result = await wiki.page(search.results[0]);
	}
	let description = await result.summary();
	if (description.length < 100) {
		// 100 is a bit short so load the full description in that case
		description = await result.content();
	}
	if (description.length > 2040) {
		description = `${description.substring(0, 2040)}...`;
	}
	let mainImage;
	try {
		mainImage = await result.mainImage();
	} catch (e) {
		// Sometimes wikijs crashes when attempting to grab a main image. If it works, great. If not, too bad.
	}
	const fields = [
		{
			name: "Permalink",
			value: result.raw.fullurl,
			inline: false,
		},
	];
	msg.send({
		embed: {
			color: Colors.RESPONSE,
			title: result.raw.title,
			description,
			fields,
			image: {
				url: mainImage,
			},
		},
	});
};
