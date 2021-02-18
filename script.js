function handleCSV() {
    Papa.parse("plants.csv", {
        download: true,
        delimiter: '|',
        header: true,
        //dynamicTyping: true,
        skipEmptyLines: true,
        complete: function(results) {
            function zoneMatcher(itemVal, reqVal) {
                // Split the plant's zone range on non-digits and drop
                // non-numbers, in case of comments at the end
                var zoneRange = itemVal.split(/\D+/).filter(Number);
                // Exclude plants without Zone numbers
                if (zoneRange.length == 0) return false;

                // Multiply by 1 to convert strings to numbers
                var zoneMin = zoneRange[0] * 1;
                var zoneMax = zoneRange[zoneRange.length - 1] * 1;
                var selectedZone = reqVal * 1;
                return selectedZone >= zoneMin && selectedZone <= zoneMax;
            }
            var content = results.data;  // Save the CSV data
            var idKeys = ["Scientific Name"];
            var titleKeys = ["Scientific Name", "Common Name"];
            var contentDisplay = new ContentDisplay(null, null, content,
                idKeys, titleKeys, '; ', {"Zone" : zoneMatcher}, true);

            // If the location includes a search entry, we're customizing the
            // details page for the requested plant; otherwise, we're
            // setting up the top-level page (plants.html).
            if (location.search) {
                contentDisplay.details.generate(true);
            } else {
                function visCallback(filteredContent) {
                    var plantVis = new PlantVis(filteredContent, $("div.column.main")[0]);
                    plantVis.zoneChart();
                    plantVis.bloomChart();
                    $(window).on("resize", function () {
                        plantVis.zoneChart();
                        plantVis.bloomChart();
                    });
                }

                // Register on-click listener for filter selections
                $("#filter-group .dropdown-content button").click(function () {
                    contentDisplay.filters.updateFilter(this, visCallback);
                });
                // Register on-click listener for clear-all-filters
                var $cf = $("#clear-filters").click(function () {
                    contentDisplay.filters.clearFilters(this, visCallback);
                });
                $cf.hide();  // hide the clear-all-filters button initially
                // Click on the latest value in the last dropdown (current year)
                // This is the first button under dropdown-content of the last div
                // (a dropdown) under filter-group
                $("#filter-group div:last-child .dropdown-content button:first-child").click();

                // Configure plant search (using autocomplete); search only through names
                contentDisplay.search.configureSearch("right", {},
                    ["Year(s) Sold"], ["Scientific Name", "Common Name"]);
            }
        }
    });
}

$(function() {  // Call this from DOM's .ready()
    // Define header, topnav, and footer in one place (load.html) and
    // reuse them for every page (for consistency and easier updates)
    var placeholders = ["#header", "#topnav", "#footer"];

    // Replace placeholders with matching shared elements in load.html
    for (var i = 0; i < placeholders.length; i++) {
        var sharedEltUrl = "load.html " + placeholders[i] + "-shared";
        // Call customize for plant pages (plants.html & details.html).
        // Do this after the header load is completed because
        // the header is the only loaded element that may be updated
        if (i == 0 && (location.pathname.includes("plants.html") ||
                       location.pathname.includes("details.html"))) {
            $(placeholders[i]).load(sharedEltUrl, handleCSV);
        } else {
            $(placeholders[i]).load(sharedEltUrl);
        }
    }
    if (location.pathname.includes("faq") ||
        location.pathname.includes("contact")) {
        // Register slideToggle for buttons on FAQ and contact pages
        var $slideBtn = $(".slide-down-btn");
        $slideBtn.click(function() {
            $(this).next().slideToggle();
        });
    }
});
