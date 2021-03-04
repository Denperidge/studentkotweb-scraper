const got = require('got');
const parse = require("node-html-parser").parse;
const clipboardy = require('clipboardy');
var baseUrl = "https://www.studentkotweb.be/";
//var searchUrl = "https://www.studentkotweb.be/nl/search?search=%28KdG%29%2C%20Campus%20Hoboken&latlon=51.173266800000%252C4.371204200000&proximity=1&distance=10.0&period%5Bfrom%5D=2021-09-01&period%5Bto%5D=2022-08-01&f%5B0%5D=field_quality_label%3A1&f%5B1%5D=field_rental_price%3A%5B0%20TO%20914%5D&f%5B2%5D=field_room_options%3Afurnished&f%5B3%5D=field_building%253Afield_facilities%3Ainternet&page=378";
var searchUrl = "https://www.studentkotweb.be/nl/search?search=%28KdG%29%2C%20Campus%20Hoboken&latlon=51.173266800000%252C4.371204200000&proximity=1&distance=5.0&period%5Bfrom%5D=2021-09-01&period%5Bto%5D=2022-08-01&f%5B0%5D=field_quality_label%3A1&f%5B1%5D=field_building%253Afield_facilities%3Ainternet&f%5B2%5D=field_rental_price%3A%5B0%20TO%20802%5D&f%5B3%5D=field_room_type%3Aapartment";
var lastPageIndex = 6;
var fullResult = "";


function GetRooms(index) {
	got(searchUrl + "&page=" + index).then((x) => {
		console.log("Getting results from page " + index);

		var parsed = parse(x.body);

		var roomsAdded = 0;

		parsed.querySelectorAll("div.m-teaser a.a-button-secondary.white").forEach(link => {
			var href = link.getAttribute("href");

			fullResult +=  baseUrl + href + "\r\n";
			roomsAdded++;
			console.log("\tAdded room " + roomsAdded + " (" + href + ")");
		});

		if (index <= lastPageIndex) {
			index++;
			GetRooms(index);
		} else {
			console.log("Copying to clipboard!");
			clipboardy.writeSync(fullResult);
			console.log("Results copied to clipboard!");
		}
	}, ((err) => {
		console.log(err.response.body);
	}));

}

GetRooms(0);