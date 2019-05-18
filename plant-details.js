// Convert scientific name to ID; e.g.:
//   "Penstemon digitalis 'Mystica'" --> "penstemon-digitalis-mystica"
// Ignore extra descriptors in image titles:
//   "Sedum spurium 'Summer Glory'; red/dark pink" -->
//   "sedum-spurium-summer-glory"
function makeId(scientificName) {
    var res = scientificName.toLowerCase()
        .split(';', 1)[0]  // Take only the part before ';', if present
        .replace(/[^a-z ]+/g, '')  // Delete non-alpha, non-space chars
        .replace(/ /g, '-');  // Replace spaces with dashes
    console.log("ID for '" + scientificName + "': " + res);
    return res;
}

// Customize the page for the requested plant
function customizePage(data) {
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
    var fullName = sciName + " (" + plantInfo["Common Name"] + ")";
    var titles = plantInfo["Image Titles"];
    var imgTitles = titles ? titles.split(':') : [ sciName ];
    delete plantInfo["Scientific Name"];
    delete plantInfo["Common Name"];
    delete plantInfo["Image Titles"];

    // Update heading
    $(".header h1").text(fullName);

    // Fill in the table
    var $tbody = $(".main tbody");
    for (var prop in plantInfo) {
        $("<tr>")
            .append($("<td>").text(prop))
            .append($("<td>").text(plantInfo[prop]))
            .appendTo($tbody);
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
            .css({'width' : '100%', 'margin-left' : '15px'})
            .appendTo($rdiv);
    }
}

$(function() {  // Call this from DOM's .ready()
    Papa.parse('plants.csv', {
        download: true,
        delimiter: '|',
        header: true,
        //dynamicTyping: true,
        skipEmptyLines: true,
        complete: function(results) {
            console.log("CSV-file parse results:");
            console.log(results);
            customizePage(results.data)
        }
    });
});
