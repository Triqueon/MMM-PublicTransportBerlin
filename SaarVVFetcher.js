"use strict";
const saarvvClient = require('hafas-client');

let SaarvvFetcher = function (config) {
    this.config = config;
};

SaarvvFetcher.prototype.getStationId = function () {
    return this.config.stationId;
};

SaarvvFetcher.prototype.getStationName = function () {
    return saarvvClient.station(this.config.stationId).then((response) => {
        return response.name;
    });
};

SaarvvFetcher.prototype.fetchDepartures = function () {

    // when value for a request is calculated to be 5 minutes before delay time
    // so we can also show the non-reachable departures in the module
    let when;

    if (this.config.delay > 0) {
        when = new Date();
        when.setTime((Date.now() + this.config.delay * 60000) - (5 * 60000));
    } else {
        when = Date.now();
    }

    let opt;

    // Handle single direction case
    if(!this.config.directionStationId) {
        opt = {
            when: when,
            duration: this.config.departureMinutes
        };
    } else {
        let results = this.config.maxUnreachableDepartures + this.config.maxReachableDepartures;
        opt = {
            nextStation: this.config.directionStationId,
            when: when,
            results: results
        };
    }

    // For use in testing environments:
    // opt.identifier = "Testing - MagicMirror module MMM-PublicTransportBerlin";    // send testing identifier

    return saarvvClient.departures(this.config.stationId, opt)
        .then((response) => {
            return this.processData(response);
        }).catch((e) => {
            throw e;
        });
};

SaarvvFetcher.prototype.processData = function (data) {

    let departuresData = {
        stationId: this.config.stationId,
        departuresArray: []
    };

    data.forEach((row) => {
        // check for:
        // ignored stations
        // excluded transportation types
        // ignored lines
        if (!this.config.ignoredStations.includes(row.station.id)
            && !this.config.excludedTransportationTypes.includes(row.line.product)
                && !this.config.ignoredLines.includes(row.line.name)
        ) {

            let delay = row.delay;

            if (!delay) {
                row.delay = 0
            }
            
            let current = {
                when: row.when,
                delay: row.delay,
                name: row.line.name,
                nr: row.line.nr,
                type: row.line.product,
                direction: row.direction
            };

            departuresData.departuresArray.push(current);
        }
    });

    departuresData.departuresArray.sort(compareTimes);
    return departuresData;
};

function compareTimes(a, b) {

    // delay must be converted to milliseconds
    let timeA = a.when.getTime() + a.delay * 1000;
    let timeB = b.when.getTime() + b.delay * 1000;

    if (timeA < timeB) {
        return -1;
    }
    if (timeA > timeB) {
        return 1
    }
    return 0
}

// helper function to print departure for debugging
function printDeparture(row) {

    let delayMinutes = Math.floor((((delay % 31536000) % 86400) % 3600) / 60);

    let time = row.when.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});

    console.log(time + " " + delayMinutes + " " + row.product.type.unicode + " " + row.direction + " | stationId: " + row.station.id);
}

module.exports = SaarvvFetcher;