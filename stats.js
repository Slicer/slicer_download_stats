'use strict';

var app = function() {
	var exports = {};

    function blankContent(state) {
        d3.selectAll('.initially-hidden').classed('initially-hidden', state);
    }

    function createSpinner() {
        var _spinner = new Spinner().spin();
        return {
            start: function() {
                document.querySelector('#all-of-page').appendChild(_spinner.el);
                return _spinner;
            },
            stop: function() {
                _spinner.stop();
                return _spinner;
            }
        }
    }

    function main(defaults) {
        blankContent(true);

        var spinner = createSpinner().start();
        d3.json(defaults.downloadDataFile, function(err, data) {
            if(err) {
                d3.json(defaults.fallbackDataFile, function(err, data) {
                    console.error('primary data file not found, reverting to fallback data.')
                    processData(data);
                });
            } else {
                processData(data);
            }
            blankContent(false);
            spinner.stop();
        });
    }

    function processData(data) {
    	var refData = _.map(data.access, function(x) { return referenceRecord(x, data); });
    	var accessf = crossfilter(refData);
    	var allAccess = accessf.groupAll();

    	var chartColorValues = colorbrewer.Set3[12];
    	var dateTextFormat = d3.time.format('%x');

    	var byOS = accessf.dimension(function(x) { return x[0].os; });
    	var byMinorVersion = accessf.dimension(function(x) { return x[0].version.split('.').slice(0, 2).join('.'); });
    	var byStable = accessf.dimension(function(x) { return !!x[0].stable ? "release": "nightly"; });
    	var bySubregion =  accessf.dimension(function(x) { return x[3][1]; });
    	var byCountry =  accessf.dimension(function(x) { return x[3][0]; });
    	var byDay = accessf.dimension(function(x) { return d3.time.day(x[1]); });
    	var dayRange = expandDateRange([byDay.bottom(1)[0][1],
    		byDay.top(1)[0][1]],
    		'day');
    	var groupByOS = byOS.group();
    	var groupBySubregion = bySubregion.group();

    	var groupByDay = byDay.group();

    	var groupByMinorVersion = byMinorVersion.group();
    	var groupByMinorVersion = byMinorVersion.group();
    	var groupByCountry = byCountry.group();
    	var groupByStable = byStable.group();

    	var versionChart = dc.rowChart("#version-chart");
    	var osChart = dc.rowChart("#os-chart");
    	var regionChart = dc.rowChart("#region-chart");
    	var countryChart = dc.rowChart("#country-chart");
    	var stableChart = dc.rowChart('#stable-chart');
    	var monthChart = dc.lineChart('#month-chart');

    	var dateRangeEl = $('#daterange');
    	var dateRangeContentEl = $('#daterange-content');

    	var datepicker = dateRangeEl.daterangepicker({
    		startDate: dayRange[0],
    		endDate: dayRange[1],
    		minDate: dayRange[0],
    		ranges: {
    			"all downloads": dayRange,
    			"past week": [moment().subtract(1, 'week').startOf('day'), moment().endOf('day')],
    			"past month": [moment().subtract(1, 'month').startOf('day'), moment().endOf('day')],
    			"past year": [moment().subtract(1, 'year').startOf('day'), moment().endOf('day')],
    		}
    	}, function() {});

    	function setDateRangeText(start, end) {
    		dateRangeContentEl.html(start.format('ll') + ' - ' + end.format('ll'));
    	}

    	datepicker.on('apply.daterangepicker', function(ev, picker) {
    		setDateRangeText(picker.startDate, picker.endDate);
    		monthChart.x(d3.time.scale().domain([picker.startDate, picker.endDate]));
            byDay.filterRange(expandDateRange([picker.startDate, picker.endDate], 'day'));
    		monthChart.render();
    		dc.redrawAll();
    	}).on('show.daterangepicker', function(ev, picker) {
            setDateRangeText(picker.startDate, picker.endDate);
    	});

    	setDateRangeText(dayRange[0], dayRange[1]);


    	exports.versionChart = versionChart;
    	exports.osChart = osChart;
    	exports.regionChart = regionChart;
    	exports.countryChart = countryChart;
    	exports.stableChart = stableChart;
    	exports.monthChart = monthChart;

    	versionChart.width(320)
    	.height(170)
    	.ordinalColors([chartColorValues[0]])
    	.dimension(byMinorVersion)
    	.group(groupByMinorVersion)
    	.elasticX(true)
    	.label(function(x) { return keyAndPercentValueLabel(allAccess.value(), x) })
    	.xAxis().ticks(4);

    	osChart.width(320)
    	.height(130)
    	.ordinalColors([chartColorValues[6]])
    	.dimension(byOS)
    	.group(groupByOS)
    	.label(osLabel)
    	.elasticX(true)
    	.label(function(x) { return osPercentLabel(allAccess.value(), x) })
    	.xAxis().ticks(4);

    	stableChart.width(320)
    	.height(100)
    	.ordinalColors([chartColorValues[5]])

    	.dimension(byStable)
    	.group(groupByStable)
    	.label(function(x) { return keyAndPercentValueLabel(allAccess.value(), x) })
    	.elasticX(true)
    	.xAxis().ticks(4);

    	regionChart.width(320)
    	.height(550)
    	.ordinalColors([chartColorValues[3]])
    	.dimension(bySubregion)
    	.group(groupBySubregion)
    	.label(keyAndValueLabel)
    	.elasticX(true)
    	.cap(18)
    	.ordering(function(d) { return -d.value; })
    	.xAxis().ticks(4);

    	countryChart.width(320)
    	.height(550)
    	.ordinalColors([chartColorValues[4]])
    	.dimension(byCountry)
    	.group(groupByCountry)
    	.label(keyAndValueLabel)
    	.elasticX(true)
    	.cap(18)
    	.ordering(function(d) { return -d.value; })
    	.xAxis().ticks(4);

    	monthChart.width(900)
    	.height(100)
    	.ordinalColors(['#5555aa'])
    	.elasticY(true)
    	.dimension(byDay)
    	.group(groupByDay)
    	.brushOn(false)
    	.x(d3.time.scale().domain(dayRange))
    	.renderlet(function(chart) {
    		var top = chart.dimension().top(1)[0];
    		var bot = chart.dimension().bottom(1)[0];
    		outputDateRange(dateTextFormat(bot[1]), dateTextFormat(top[1]));
    	})
    	.interpolate('basis')
    	.round(d3.time.day.round)
    	.yAxis().ticks(3);

    	dc.dataCount('.dc-data-count')
    	.dimension(accessf)
    	.group(allAccess);

	// these calls are required to set up the initial state of the visualization.
	dc.filterAll();
	dc.renderAll();
	dc.redrawAll();
}

function chartReset(chart) {
	chart.filterAll();
	dc.redrawAll();
};


    // expand the date range by a fixed amount of time both before
    // and after in order to be sure to include endpoints in the data
    // range.
    function expandDateRange(range, amt) {
        return [moment(range[0]).startOf(amt),
        moment(range[1]).endOf(amt)];
    }

    // Returns a truth function for matching selected versions.
    // Version numbers with only major or major.minor numbers match
    // all appropriate major.minor.release numbers.
    function versionSelectFilter(v) {
        return function(d) {
            if (v === '*') { return true };
            var matchVersion = v.split('.');
            var testVersion = d.split('.');
            var testLength = Math.min(matchVersion.length, testVersion.length);
            for(var i = testLength - 1; i >=0; i--) {
                if(matchVersion[i] != testVersion[i]) {
                    return false;
                }
            }
            return true;
        }
    }

    // converts a "data and id" representation to a reference-based one.
    function referenceRecord(a, data) {
        var result = [
        data.bitstream[a[0]],
        new Date(a[1] + 'Z'),
        a[2],
        data.countryCode[a[2]],
        data.location[a[3]]
        ];
        return result;
    }

    // various formatting helpers
    function keyAndValueLabel(d) {
        return "" + d.key + "  (" + d.value + ")";
    }

    function keyAndPercentValueLabel(total_value, d) {
        return "" + d.key + "  (" + d3.round(d.value/total_value*100.0, 0) + "%)";
    }

    var osLabelDict = {
        linux: "Linux",
        macosx: "Mac",
        win: "Windows"
    };

    function osLabel(d) {
        return keyAndValueLabel({key: osLabelDict[d.key], value: d.value});
    }

    function osPercentLabel(total_value, d) {
        return keyAndPercentValueLabel(total_value, {key: osLabelDict[d.key], value: d.value});
    }

    function outputDateRange(low, high) {
        d3.select('#date-low').text(low);
        d3.select('#date-high').text(high);
    }

    exports.chartReset = chartReset;
    exports.main = main;
    return exports;
}();
