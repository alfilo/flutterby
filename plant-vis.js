"use strict";

function PlantVis(content, parent) {
    var tooltip = d3.select("body").selectAll(".tooltip");
    if (tooltip.empty()) {
        tooltip = d3.select("body").append("div")
            .classed("tooltip", true)
            .style("position", "absolute")
            .style("pointer-events", "none")
            .style("opacity", 0);
    }

    var zoneData = content.reduce(function (accum, plant) {
        if (plant["Zone"] && /^\d+/.test(plant["Zone"])) {
            // Split the plant's zone range on non-digits and drop
            // non-numbers, in case of comments at the end
            var zoneRange = plant["Zone"].split(/\D+/).filter(Number);
            // Multiply by 1 to convert strings to numbers
            var zoneLow = zoneRange[0] * 1;
            var zoneHigh = zoneRange[zoneRange.length - 1] * 1;

            accum.push({
                name: plant["Scientific Name"],
                link: plant.link,
                zone: { low: zoneLow, high: zoneHigh }
            });
        }
        return accum;
    }, []);

    var bloomData = content.reduce(function (accum, plant) {
        if (plant["When it Blooms"]) {
            function makeDate(str, day = 1) {
                var dateMap = { "early": "5", "mid": "15", "late": "25" };
                var range = str.split(/\W+/);
                var dateStr = range.length > 1 ? range[1] + dateMap[range[0].toLowerCase()] : range[0] + day;
                var parseDate = d3.timeParse("%B%d");
                return parseDate(dateStr);
            }
            // Take only the part before ' (', if present
            var bloomRange = plant["When it Blooms"]
                .split(/\s*\(/, 1)[0]
                .split(/\s*\-\s*/);
            var bloomLow = makeDate(bloomRange[0]);
            var bloomHigh = makeDate(bloomRange[bloomRange.length - 1], 30);
            accum.push({
                name: plant["Scientific Name"],
                link: plant.link,
                bloom: { low: bloomLow, high: bloomHigh }
            });
        }
        return accum;
    }, []);

    this.bloomChart = function () {
        d3.selectAll("svg.bloom").remove();
        if (!bloomData.length) return;

        var margin = { top: 50, bottom: 100, left: 250, right: 10 };
        var width = Math.max(parent.clientWidth, 500) - margin.left - margin.right;
        var height = 20 * bloomData.length;
        var rainbow = d3.scaleSequential(d3.interpolateRainbow)
            .domain([0, bloomData.length]);
        var svg = d3.select(parent).append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .classed("bloom", true);
        svg.append("text")
            .style("text-anchor", "middle")
            .attr("x", margin.left + width / 2)
            .attr("y", margin.top / 2)
            .style("font-weight", "bold")
            .style("fill", "currentColor")
            .text("Bloom Periods for Selected Plants");
        var chartGroup = svg.append("g")
            .attr("transform", "translate(" + margin.left + ", " + margin.top + ")");
        var y = d3.scaleBand()
            .domain(bloomData.map(function (d) { return d.name; }))
            // Don't reverse plant order (alphabetically from top down)
            .range([0, height])
            .paddingInner(.1);
        var minBloom = d3.min(bloomData, function (d) { return d.bloom.low; });
        var maxBloom = d3.max(bloomData, function (d) { return d.bloom.high; });
        var x = d3.scaleTime()
            .domain([minBloom, maxBloom])
            .range([0, width]);
        chartGroup.selectAll("rect")
          .data(bloomData)
          .enter()
          .append("a")
            .attr("href", function (d) { return d.link.href; })
            .attr("target", "_blank")  // Open link in new tab
          .append("rect")
            .attr("y", function (d) { return y(d.name); })
            .attr("x", function (d) { return x(d.bloom.low); })
            .attr("height", y.bandwidth())
            .attr("width", function (d) { return x(d.bloom.high) - x(d.bloom.low); })
            .attr("fill", function (d, i) { return rainbow(i); })
            .on("mouseover", function (e, d) {
                var svgBox = svg.node().getBoundingClientRect();
                tooltip.html(d.name)
                    .style("left", window.pageXOffset + svgBox.left + margin.left + x(d.bloom.low) + "px")
                    .style("top", window.pageYOffset + svgBox.top + margin.top + y(d.name) + "px")
                    .style("opacity", 1);
                d3.select(this).attr("opacity", .6);
            })
            .on("mouseout", function (e, d) {
                tooltip.style("opacity", 0);
                d3.select(this).attr("opacity", 1);
            })
        var xAxis = d3.axisBottom(x);
        var yAxis = d3.axisLeft(y).tickSizeOuter(0);
        chartGroup.append("g").call(xAxis)
            .attr("transform", "translate(0, " + height + ")")
          .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("transform", "rotate(-65)");
        chartGroup.append("g").call(yAxis);
    }

    this.zoneChart = function () {
        d3.selectAll("svg.zone").remove();
        if (!zoneData.length) return;

        var margin = { top: 50, bottom: 50, left: 250, right: 10 };
        var width = Math.max(parent.clientWidth, 500) - margin.left - margin.right;
        var height = 20 * zoneData.length;
        var rainbow = d3.scaleSequential(d3.interpolateRainbow)
            .domain([0, zoneData.length]);
        var svg = d3.select(parent).append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .classed("zone", true);
        svg.append("text")
            .style("text-anchor", "middle")
            .attr("x", margin.left + width / 2)
            .attr("y", margin.top / 2)
            .style("font-weight", "bold")
            .style("fill", "currentColor")
            .text("Zone Ranges for Selected Plants");
        var chartGroup = svg.append("g")
            .attr("transform", "translate(" + margin.left + ", " + margin.top + ")");
        var y = d3.scaleBand()
            .domain(zoneData.map(function (d) { return d.name; }))
            // Don't reverse plant order (alphabetically from top down)
            .range([0, height])
            .paddingInner(.1);
        var minZone = d3.min(zoneData, function (d) { return d.zone.low; });
        var maxZone = d3.max(zoneData, function (d) { return d.zone.high; });
        var x = d3.scaleLinear()
            .domain([minZone, maxZone])
            .range([0, width]);
        chartGroup.selectAll("rect")
          .data(zoneData)
          .enter()
          .append("a")
            .attr("href", function (d) { return d.link.href; })
            .attr("target", "_blank")  // Open link in new tab
          .append("rect")
            .attr("y", function (d) { return y(d.name); })
            .attr("x", function (d) { return x(d.zone.low); })
            .attr("height", y.bandwidth())
            .attr("width", function (d) { return x(d.zone.high) - x(d.zone.low); })
            .attr("fill", function (d, i) { return rainbow(i); })
            .on("mouseover", function (e, d) {
                var svgBox = svg.node().getBoundingClientRect();
                tooltip.html(d.name)
                    .style("left", window.pageXOffset + svgBox.left + margin.left + x(d.zone.low) + "px")
                    .style("top", window.pageYOffset + svgBox.top + margin.top + y(d.name) + "px")
                    .style("opacity", 1);
                d3.select(this).attr("opacity", .6);
            })
            .on("mouseout", function (e, d) {
                tooltip.style("opacity", 0);
                d3.select(this).attr("opacity", 1);
            })
        var xAxis = d3.axisBottom(x).ticks(5);  // Don't create fractional zone ticks
        var yAxis = d3.axisLeft(y).tickSizeOuter(0);
        chartGroup.append("g").call(xAxis)
            .attr("transform", "translate(0, " + height + ")");
        chartGroup.append("g").call(yAxis);
    }
}
