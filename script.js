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

function fullName(scientificName, commonName) {
    return scientificName + (commonName ? " (" + commonName + ")" : "");
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
    var titles = plantInfo["Image Titles"];
    var imgTitles = titles ? titles.split(':') : [ sciName ];
    delete plantInfo["Scientific Name"];
    delete plantInfo["Common Name"];
    delete plantInfo["Image Titles"];

    // Update heading
    $("#header h1").text(fullName(sciName, comName));

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
            .prop("src", "images/" + id + ".jpg")
            .prop("title", title)
            .prop("alt", title)
            .prop("onerror", "this.src='butterflies.jpg'")
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
            // $(location).prop('href', url) is the jQuery way but it's not
            // an improvement over the below.

            // Navigate to the selected plant
            location.href = "plant-details.html?name=" + plantId;
        }
    }).autocomplete( "instance" )._renderItem = function(ul, item) {
        var sciName = item["Scientific Name"];
        var comNameStr = item["Common Name"] ?
            " (" + item["Common Name"] + ")" : "";
        return $("<li>")
            .append("<div><i>" + sciName + "</i>" + comNameStr + "</div>")
            .appendTo(ul);
    };
}

// The data from the CSV file
var plantData;

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

            // Save the CSV data in a global for filtering
            plantData = results.data;

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
    var local = LOCAL_DOMAINS.indexOf(location.hostname) >= 0;
    if (local) {
        // Get the contents of (local) plants.csv and call
        // handleCSV with the text of the file as argument
        $.get("plants.csv", handleCSV);
    } else {
        handleCSV();  // No argument (text is undefined)
    }
}

// Tracks the current filter selections {feature: detail, ...}
var curFilters = {};

function updateFilter() {
    // Get the value for filter (in this node) and the filter
    // (in grandparent's first element child)
    var value = this.textContent.toLowerCase();
    var filterBtn = this.parentNode.parentNode.firstElementChild;
    var filter = filterBtn.textContent;

    // Clear selected style in buttons of this filter's dropdown-content
    // (in case there was a selection in this filter before)
    $(this.parentNode).find(".selected").removeClass("selected");

    if (curFilters[filter] === value) {
        // Same setting for filter clicked: delete from current
        // filters and clear selected style for filter button
        delete curFilters[filter];
        $(filterBtn).removeClass("selected");
    } else {
        // New or different setting for filter: update current filters
        // and add selected style to the filter and value buttons
        curFilters[filter] = value;
        $(this).addClass("selected");
        $(filterBtn).addClass("selected");
    }

    // Recompute the array of plants matching the filters from scratch
    var filterPlants = $.grep(plantData, function(item) {
        // Check item's entries against every filter's selection
        for (var filter in curFilters) {
            if (filter === "Zone") {
                // Split the plant's zone range on non-digits and drop
                // non-numbers, in case of comments at the end
                var zoneRange = item[filter].split(/\D+/).filter(Number);
                // Exclude plants without Zone numbers
                if (zoneRange.length == 0) return false;

                // Multiply by 1 to convert strings to numbers
                var zoneMin = zoneRange[0] * 1;
                var zoneMax = zoneRange[zoneRange.length - 1] * 1;
                var selectedZone = curFilters[filter] * 1;
                if (selectedZone < zoneMin || selectedZone > zoneMax)
                    return false;  // Out of range, not a match

            } else if (!item[filter].toLowerCase().includes(curFilters[filter]))
                // Values in curFilters are lowercase
                return false;  // Any match fails: skip item (plant)
        }
        return true;  // Passed all filters: keep item (plant)
    });

    // Re-populate the results list with links to plant-detail pages
    var $frUl = $("#filter-results").empty();
    for (var i = 0; i < filterPlants.length; i++) {
        var sciName = filterPlants[i]["Scientific Name"];
        var comName = filterPlants[i]["Common Name"];
        var href = "plant-details.html?name=" + makeId(sciName);
        var $a = $("<a>").prop("href", href).text(fullName(sciName, comName));
        $("<li>").append($a).appendTo($frUl);
    }
}

$(function() {  // Call this from DOM's .ready()
    // Define header, topnav, and footer in one place (load.html) and
    // reuse them for every page (for consistency and easier updates)
    var placeholders = ["#header", "#topnav", "#footer"];

    // Replace placeholders with matching shared elements in load.html
    for (var i = 0; i < placeholders.length; i++) {
        var sharedEltUrl = "load.html " + placeholders[i] + "-shared";
        // Call customize for plant pages (plants.html & plant-details.html).
        // Do this after the header load is completed because
        // the header is the only loaded element that may be updated
        if (i == 0 && location.pathname.includes("plant")) {
            $(placeholders[i]).load(sharedEltUrl, customize);
        } else {
            $(placeholders[i]).load(sharedEltUrl);
        }
    }

    // Register on-click listener for filter selections
    $("#filter-group .dropdown-content button").click(updateFilter);
});
