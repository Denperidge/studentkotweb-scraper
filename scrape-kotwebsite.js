const got = require('got');
const parse = require("node-html-parser").parse;
const fs = require("fs");


/* Verander deze variabeles door de website (https://www.website.be/) en de search page met alle criteria ingesteld zoals jij wilt (bv "https://www.studentkotweb.be/nl/search?search=%28KdG%29%2C%20Campus%20Hoboken&latlon=51.173266800000%252C4.371204200000&proximity=1&distance=5.0&period%5Bfrom%5D=2021-08-01&period%5Bto%5D=2022-08-31&f%5B0%5D=field_room_type%3Aroom&f%5B1%5D=field_room_type%3Astudio&f%5B2%5D=field_quality_label%3A1&f%5B3%5D=field_rental_price%3A%5B0%20TO%20316%5D&f%5B4%5D=field_building%253Afield_facilities%3Ainternet") */
var baseUrl = "https://www.studentkotweb.be/";
var searchUrl = "https://www.studentkotweb.be/nl/search?search=%28KdG%29%2C%20Campus%20Hoboken&latlon=51.173266800000%252C4.371204200000&proximity=1&distance=5.0&period%5Bfrom%5D=2021-08-01&period%5Bto%5D=2022-08-31&f%5B0%5D=field_room_type%3Aroom&f%5B1%5D=field_room_type%3Astudio&f%5B2%5D=field_quality_label%3A1&f%5B3%5D=field_rental_price%3A%5B0%20TO%20316%5D&f%5B4%5D=field_building%253Afield_facilities%3Ainternet";

var outputMode = OutputAsCsv;




var fullResult = "";
var done = false;


function TrimExtraSpace(str) {
	return str.replace(/\s{2,}/g, "").replace("\n", " ");
}

function extractNumber(str) {
	return str.match(/\d/g, "").join("");
}

function querySelector(parsedPage, selector, all) {
	if (!all) return parsedPage.querySelector(selector);
	else return parsedPage.querySelectorAll(selector);
}

async function GetElementsFromUrl(url, selectors, all=false) {
	var rawPage = await got(url);
	var parsedPage = parse(rawPage.body);


	// If only one selector, selectors==selector, return one collection
	if (typeof(selectors) == "string") {
		return querySelector(parsedPage, selectors, all);
	}
	// If not a string, assume an array of selectors 
	else {
		var results = [];
		selectors.forEach((selector) => {
			results.push(querySelector(parsedPage, selector, all));
		});
		return results;
	}
}

var roomLinks, pageIndex;

async function ParseSearchPage(index) {
	console.log("Getting all rooms from page " + index);

	[roomLinks, pageIndex] = await GetElementsFromUrl(searchUrl + "&page=" + index, ["div.m-teaser a.a-button-secondary", ".m-pagination-item:last-child"], all=true);
	
	roomLinks.forEach(ParseKotPage);

	// This reffers to lastPageDone for scraping the urls from the search pages, NOT the content from kotpages
	var lastPageDone = pageIndex[0].classNames.includes("current");
	
	// Continue if need be, stop if need be
	if (!lastPageDone) {
		index++;
		ParseSearchPage(index);
	} else {
		done = true;
		console.log("Done!")
	}
}

function ParseKotPage(roomLink) {
	var roomUrl = baseUrl + roomLink.getAttribute("href");

	outputMode(roomUrl);
}

// OutputAsCsv currently configured for studentkotweb
async function OutputAsCsv(roomUrl) {
	try {
		var roomData = await GetElementsFromUrl(roomUrl, 
			[".m-icon-list li:last-child", 
			".o-card-price-block-total .o-card-price-line-price", 
			".m-icon-list li:first-child",
			".o-card-price"  // Backup price in case total price is unavilable
		]);
			
		
		// Link 	Oppervlakte (m²)	Huurprijs	Locatie
		var result = roomUrl + "\t{0}\t{1}\t{2}\r\n";

		var modifiers = [
			extractNumber,
			function(price){
				return price;
			},
			function(location) {
				return location.replace("Toon op kaart", "").trim();
			}
		];
		// -1 --> there's a backup price variable
		for (var i = 0; i < roomData.length - 1; i++) {
			var data;

			try {
				data = TrimExtraSpace(roomData[i].innerText);
				data = modifiers[i](data);
			} catch (err) {
				// If price is missing, use the backup price
				if (i == 1) {
					data = TrimExtraSpace(roomData[roomData.length - 1].innerText);
					data = modifiers[i](data);
				} else { 
					data = "?";
				}
			} finally {
				result = result.replace("{" + i + "}", data);
			}
		}
		
		console.log("Added " + roomUrl);
		fullResult += result;
	} catch (err) {
		console.dir(err)
	}

	// This triggers a few times in a row but eh
	if (done) {
		console.log("Writing to file");
		fs.writeFileSync("output.csv", fullResult);
	}
}

ParseSearchPage(0);