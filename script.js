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

            function visCallback(items) {
                var plantVis = new PlantVis(items, $("div.column.main")[0]);
                plantVis.zoneChart();
                plantVis.bloomChart();
                $(window).on("resize", function () {
                    plantVis.zoneChart();
                    plantVis.bloomChart();
                });
            }

            var contentDisplay = new ContentDisplay(content, idKeys,
                {
                    titleKeys: titleKeys,
                    titleSep: '; ',
                    customFltrMatchers: { "Zone": zoneMatcher },
                    newTab: true,
                    trackSelection: true,
                    selectionCallback: visCallback
                });

            // If the location includes a search entry, we're customizing the
            // details page for the requested plant; otherwise, we're
            // setting up the top-level page (plants.html).
            if (location.search) {
                contentDisplay.details.generate(true);
            } else {
                // Register on-click listener for filter selections
                $("#filter-group .dropdown-content button").click(function () {
                    contentDisplay.filters.updateFilter(this);
                });
                // Register on-click listener for clear-all-filters
                var $cf = $("#clear-filters").click(function () {
                    contentDisplay.filters.clearFilters(this);
                });
                $cf.hide();  // hide the clear-all-filters button initially
                // Click on the latest value in the last dropdown (current year)
                // This is the first button under dropdown-content of the last div
                // (a dropdown) under filter-group
                $("#filter-group div:last-of-type .dropdown-content button:first-child").click();

                // Register on-click listeners for visualization selections
                $("#select-all").click(function () {
                    contentDisplay.links.selectAll();
                });
                $("#clear-select").click(function () {
                    contentDisplay.links.clearSelect();
                });

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

    try {
        // Check for localStorage availability and successful modification
        window.localStorage.setItem("test-key", "test-value");
        window.localStorage.removeItem("test-key");

        if (location.pathname.includes("plants.html")) {
            $("#select-btns")
                .before("<p>Selections are also used to prepopulate Request" +
                    " form, which you will be able to modify.</p>");
        }
        if (location.pathname.includes("request.html")) {
            var reqStr = "Qty Plant\n";
            for (var i = 0; i < window.localStorage.length; i++) {
                var key = window.localStorage.key(i);
                var value = window.localStorage.getItem(key);
                reqStr += value + "\t" + key + "\n";
            }
            if (window.localStorage.length) {
                $("#plants").val(reqStr);
                $("#plants")
                    .before("<p>The request below includes your selections." +
                        "<br>Please update plants and quantities as needed.</p>");
            }
        }
    } catch (err) {
        console.log("Local storage not available; not persisting selections");
        console.log(err.name + ": " + err.message);
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
