// Convert scientific name to ID; e.g.:
//   "Penstemon digitalis 'Mystica'" --> "penstemon-digitalis-mystica"
// Ignore extra descriptors in image titles:
//   "Sedum spurium 'Summer Glory'; red/dark pink" -->
//   "sedum-spurium-summer-glory"
function makeId(scientificName) {
    var res = scientificName.toLowerCase()
        .split(';', 1)[0]  // Take only the part before ';', if present
        .replace(/[^a-z0-9 ]+/g, '')  // Keep alphanumeric chars and spaces
        .replace(/ /g, '-');  // Replace spaces with dashes
    console.log("ID for '" + scientificName + "': " + res);
    return res;
}

// Customize the page for the requested plant
function customizePlantDetailsPage(data) {
    // Find the entry for the requested plant (name search param)
    var urlParams = new URLSearchParams(location.search);
    var requestedPlantName = urlParams.get("name");
    console.log("Requested plant " + requestedPlantName);
    var plantInfo;  // Save the matching object in plantInfo
    for (var i = 0; i < data.length; i++) {
        if (makeId(data[i]["Scientific Name"]) === requestedPlantName) {
            plantInfo = data[i];
            break;
        }
    }
    console.log("Found requested plant info:");
    console.log(plantInfo);

    // Save non-standard image titles, make the full name of the plant, and delete values
    // that aren't used in the feature table
    var sciName = plantInfo["Scientific Name"];
    var comName = plantInfo["Common Name"];
    var fullName = sciName + (comName ? " (" + plantInfo["Common Name"] + ")" : "");
    var titles = plantInfo["Image Titles"];
    var imgTitles = titles ? titles.split(':') : [ sciName ];
    delete plantInfo["Scientific Name"];
    delete plantInfo["Common Name"];
    delete plantInfo["Image Titles"];

    // Update heading
    $("#header h1").text(fullName);

    // Fill in the table
    var $tbody = $(".main tbody");
    for (var prop in plantInfo) {
        if (plantInfo[prop]) {  // Skip over features w/o details
            $("<tr>")
                .append($("<td>").text(prop))
                .append($("<td>").text(plantInfo[prop]))
                .appendTo($tbody);
        }
    }

    // Update the plant image(s)
    var $rdiv = $("div.right");
    for (var i = 0; i < imgTitles.length; i++) {
        var title = imgTitles[i];
        var id = makeId(title);
        $("<img>")
            .attr("src", "images/" + id + ".jpg")
            .attr("title", title)
            .attr("alt", title)
            .attr("onerror", "this.src='butterflies.jpg'")
            .css({'width' : '100%', 'margin-left' : '15px'})
            .appendTo($rdiv);
    }
}

function configureAutocomplete(data) {
    $("#psearch").autocomplete({
        source: function(request, response) {
            var year = $("#psearch-year").val();
            var matcher = new RegExp($.ui.autocomplete.escapeRegex(request.term), "i");
            response($.grep(data, function(item) {
                // Filter by the selected year
                return item["Year(s) Sold"].includes(year)
                    && (matcher.test(item["Scientific Name"])
                        || matcher.test(item["Common Name"]));
            }));
        },
        minLength: 0,
        select: function(event, ui) {
            var plantId = makeId(ui.item["Scientific Name"]);

            // In bigger projects, it's safer to use window.location,
            // because location might be redefined.
            // Setting location and location.href has the same effect, if
            // location isn't set.  Both act as if the link is clicked, so
            // "Back" goes to current page).  location.replace(url) is like
            // HTTP redirect--it skips the current page for back navigation.
            // $(location).attr('href', url) is the jQuery way but it's not
            // an improvement over the below.

            // Navigate to the selected plant
            location.href = "plant-details.html?name=" + plantId;
        }
    }).autocomplete( "instance" )._renderItem = function(ul, item) {
        return $("<li>")
            .append("<div><i>" + item["Scientific Name"] + "</i> (" +
                    item["Common Name"] + ")</div>")
            .appendTo(ul);
    };
}

// If text is defined, we're running locally
function handleCSV(text) {
    Papa.parse(text || "plants.csv", {
        download: !text,
        delimiter: '|',
        header: true,
        //dynamicTyping: true,
        skipEmptyLines: true,
        complete: function(results) {
            console.log("CSV-file parse results:");
            console.log(results);

            // If the location includes a search entry, we're customizing the
            // plant details page for the requested plant; otherwise, we're
            // setting up the plant search (using autocomplete) on the
            // top-level page (index.html).
            if (location.search) {
                customizePlantDetailsPage(results.data);
            } else {
                configureAutocomplete(results.data);
            }
        }
    });
}

function customize() {
    const LOCAL_DOMAINS = ["localhost", "127.0.0.1", ""];
    var local = LOCAL_DOMAINS.includes(location.hostname);
    if (local) {
        // Get the contents of (local) plants.csv and call
        // handleCSV with the text of the file as argument
        $.get("plants.csv", handleCSV);
    } else {
        handleCSV();  // No argument (text is undefined)
    }
}

$(function() {  // Call this from DOM's .ready()
    // Define header, topnav, and footer in one place (load.html) and
    // reuse them for every page (for consistency and easier updates)
    var sharedElts = ["#header", "#topnav", "#footer"];

    for (var i = 0; i < sharedElts.length; i++) {
        // The contact page doesn't use CSV info; for others, call
        // customize after the header load is completed because
        // the header is the only loaded element that may be updated
        if (i == 0 && !location.pathname.includes("contact.html")) {
            // First use of sharedElts[i] refers to placeholders on the page
            // Second use (after load.html) refers to elements of load.html
            // Reusing the names doesn't appear to create conflicts
            $(sharedElts[i]).load("load.html " + sharedElts[i], customize);
        } else {
            $(sharedElts[i]).load("load.html " + sharedElts[i]);
        }
    }
});
