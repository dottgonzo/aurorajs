var exec = require("promised-exec");
var Promise = require("bluebird");
var Os = require("os");
function prepare_address(addresses) {
    var readdr = [];
    for (var i = 0; i < addresses.length; i++) {
        readdr[i] = { uuid: addresses[i].uuid, dev: addresses[i].dev, address: addresses[i].address };
    }
    return JSON.stringify(readdr);
}
var AJS = (function () {
    function AJS(addresses, timezone, exe) {
        this.addresses = addresses;
        this.timezone = timezone;
        var cmd;
        if (exe) {
            cmd = exe;
        }
        else {
            if (Os.arch() == "arm" && Os.cpus()[0].model == "ARMv7 Processor rev 5 (v7l)") {
                console.log("CMD aurora arm");
                cmd = __dirname + "/bin/rasp2/aurora.bin";
            }
            else if (Os.arch() == "x64") {
                console.log("CMD aurora x64");
                cmd = __dirname + "/bin/x64/aurora.bin";
            }
            else if (Os.arch() == "ia32") {
                console.log("CMD aurora ia32");
                cmd = __dirname + "/bin/ia32/aurora.bin";
            }
            else {
                console.log("CMD aurora");
                cmd = "aurora";
            }
        }
        this.exec = cmd;
    }
    AJS.prototype.data = function () {
        var exe = this.exec;
        var addresses = prepare_address(this.addresses);
        var timezone = this.timezone;
        return new Promise(function (resolve, reject) {
            exec(__dirname + "/aurora.sh -a \"" + addresses + "\" -t \"" + timezone + "\" -e \"" + exe + "\"").then(function (data) {
                resolve(JSON.parse(data));
            }).catch(function (err) {
                reject(err);
            });
        });
    };
    AJS.prototype.reconfigure = function (opt) {
        if (opt) {
            if (opt.addresses)
                this.addresses = opt.addresses;
            if (opt.timezone)
                this.timezone = opt.timezone;
            if (opt.exec)
                this.exec = opt.exec;
        }
    };
    return AJS;
})();
module.exports = AJS;

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZGV4LnRzIl0sIm5hbWVzIjpbInByZXBhcmVfYWRkcmVzcyIsIkFKUyIsIkFKUy5jb25zdHJ1Y3RvciIsIkFKUy5kYXRhIiwiQUpTLnJlY29uZmlndXJlIl0sIm1hcHBpbmdzIjoiQUFBQSxJQUFJLElBQUksR0FBRyxPQUFPLENBQUMsZUFBZSxDQUFDLENBQUM7QUFDcEMsSUFBWSxPQUFPLFdBQU0sVUFBVSxDQUFDLENBQUE7QUFDcEMsSUFBWSxFQUFFLFdBQU0sSUFBSSxDQUFDLENBQUE7QUFFekIseUJBQXlCLFNBQXFCO0lBQzFDQSxJQUFJQSxNQUFNQSxHQUFHQSxFQUFFQSxDQUFDQTtJQUNoQkEsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsRUFBRUEsQ0FBQ0EsR0FBR0EsU0FBU0EsQ0FBQ0EsTUFBTUEsRUFBRUEsQ0FBQ0EsRUFBRUEsRUFBRUEsQ0FBQ0E7UUFDeENBLE1BQU1BLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLEVBQUVBLElBQUlBLEVBQUVBLFNBQVNBLENBQUNBLENBQUNBLENBQUNBLENBQUNBLElBQUlBLEVBQUVBLEdBQUdBLEVBQUVBLFNBQVNBLENBQUNBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLEVBQUVBLE9BQU9BLEVBQUVBLFNBQVNBLENBQUNBLENBQUNBLENBQUNBLENBQUNBLE9BQU9BLEVBQUVBLENBQUNBO0lBRWxHQSxDQUFDQTtJQUNEQSxNQUFNQSxDQUFDQSxJQUFJQSxDQUFDQSxTQUFTQSxDQUFDQSxNQUFNQSxDQUFDQSxDQUFDQTtBQUNsQ0EsQ0FBQ0E7QUErQ0Q7SUFJSUMsYUFBWUEsU0FBcUJBLEVBQUVBLFFBQWdCQSxFQUFFQSxHQUFZQTtRQUM3REMsSUFBSUEsQ0FBQ0EsU0FBU0EsR0FBR0EsU0FBU0EsQ0FBQ0E7UUFDM0JBLElBQUlBLENBQUNBLFFBQVFBLEdBQUdBLFFBQVFBLENBQUNBO1FBQ3pCQSxJQUFJQSxHQUFXQSxDQUFDQTtRQUNoQkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDTkEsR0FBR0EsR0FBR0EsR0FBR0EsQ0FBQ0E7UUFDZEEsQ0FBQ0E7UUFBQ0EsSUFBSUEsQ0FBQ0EsQ0FBQ0E7WUFDSkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsRUFBRUEsQ0FBQ0EsSUFBSUEsRUFBRUEsSUFBSUEsS0FBS0EsSUFBSUEsRUFBRUEsQ0FBQ0EsSUFBSUEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsS0FBS0EsSUFBSUEsNkJBQTZCQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDNUVBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLGdCQUFnQkEsQ0FBQ0EsQ0FBQUE7Z0JBQzdCQSxHQUFHQSxHQUFHQSxTQUFTQSxHQUFHQSx1QkFBdUJBLENBQUFBO1lBQzdDQSxDQUFDQTtZQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxFQUFFQSxDQUFDQSxJQUFJQSxFQUFFQSxJQUFJQSxLQUFLQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDNUJBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLGdCQUFnQkEsQ0FBQ0EsQ0FBQ0E7Z0JBQzlCQSxHQUFHQSxHQUFHQSxTQUFTQSxHQUFHQSxxQkFBcUJBLENBQUFBO1lBQzNDQSxDQUFDQTtZQUFDQSxJQUFJQSxDQUFDQSxFQUFFQSxDQUFDQSxDQUFDQSxFQUFFQSxDQUFDQSxJQUFJQSxFQUFFQSxJQUFJQSxNQUFNQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDN0JBLE9BQU9BLENBQUNBLEdBQUdBLENBQUNBLGlCQUFpQkEsQ0FBQ0EsQ0FBQ0E7Z0JBQy9CQSxHQUFHQSxHQUFHQSxTQUFTQSxHQUFHQSxzQkFBc0JBLENBQUFBO1lBQzVDQSxDQUFDQTtZQUFDQSxJQUFJQSxDQUFDQSxDQUFDQTtnQkFDSkEsT0FBT0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsWUFBWUEsQ0FBQ0EsQ0FBQ0E7Z0JBQzFCQSxHQUFHQSxHQUFHQSxRQUFRQSxDQUFDQTtZQUNuQkEsQ0FBQ0E7UUFDTEEsQ0FBQ0E7UUFFREEsSUFBSUEsQ0FBQ0EsSUFBSUEsR0FBR0EsR0FBR0EsQ0FBQ0E7SUFDcEJBLENBQUNBO0lBQ0RELGtCQUFJQSxHQUFKQTtRQUNJRSxJQUFJQSxHQUFHQSxHQUFHQSxJQUFJQSxDQUFDQSxJQUFJQSxDQUFDQTtRQUNwQkEsSUFBSUEsU0FBU0EsR0FBR0EsZUFBZUEsQ0FBQ0EsSUFBSUEsQ0FBQ0EsU0FBU0EsQ0FBQ0EsQ0FBQ0E7UUFDaERBLElBQUlBLFFBQVFBLEdBQUdBLElBQUlBLENBQUNBLFFBQVFBLENBQUNBO1FBQzdCQSxNQUFNQSxDQUFDQSxJQUFJQSxPQUFPQSxDQUFTQSxVQUFTQSxPQUFPQSxFQUFFQSxNQUFNQTtZQUMvQyxJQUFJLENBQUMsU0FBUyxHQUFHLGtCQUFrQixHQUFHLFNBQVMsR0FBRyxVQUFVLEdBQUcsUUFBUSxHQUFHLFVBQVUsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVMsSUFBWTtnQkFDekgsT0FBTyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztZQUM5QixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBUyxHQUFHO2dCQUNqQixNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDaEIsQ0FBQyxDQUFDLENBQUM7UUFDUCxDQUFDLENBQUNBLENBQUNBO0lBQ1BBLENBQUNBO0lBQ0RGLHlCQUFXQSxHQUFYQSxVQUFZQSxHQUFpRUE7UUFDekVHLEVBQUVBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLENBQUNBLENBQUNBO1lBQ05BLEVBQUVBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLFNBQVNBLENBQUNBO2dCQUFDQSxJQUFJQSxDQUFDQSxTQUFTQSxHQUFHQSxHQUFHQSxDQUFDQSxTQUFTQSxDQUFDQTtZQUNsREEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsUUFBUUEsQ0FBQ0E7Z0JBQUNBLElBQUlBLENBQUNBLFFBQVFBLEdBQUdBLEdBQUdBLENBQUNBLFFBQVFBLENBQUNBO1lBQy9DQSxFQUFFQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxJQUFJQSxDQUFDQTtnQkFBQ0EsSUFBSUEsQ0FBQ0EsSUFBSUEsR0FBR0EsR0FBR0EsQ0FBQ0EsSUFBSUEsQ0FBQ0E7UUFDdkNBLENBQUNBO0lBQ0xBLENBQUNBO0lBQ0xILFVBQUNBO0FBQURBLENBL0NBLEFBK0NDQSxJQUFBO0FBQ0QsaUJBQVMsR0FBRyxDQUFBIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsibGV0IGV4ZWMgPSByZXF1aXJlKFwicHJvbWlzZWQtZXhlY1wiKTtcbmltcG9ydCAqIGFzIFByb21pc2UgZnJvbSBcImJsdWViaXJkXCI7XG5pbXBvcnQgKiBhcyBPcyBmcm9tIFwib3NcIjtcblxuZnVuY3Rpb24gcHJlcGFyZV9hZGRyZXNzKGFkZHJlc3NlczogSUFkZHJlc3NbXSkge1xuICAgIGxldCByZWFkZHIgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGFkZHJlc3Nlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICByZWFkZHJbaV0gPSB7IHV1aWQ6IGFkZHJlc3Nlc1tpXS51dWlkLCBkZXY6IGFkZHJlc3Nlc1tpXS5kZXYsIGFkZHJlc3M6IGFkZHJlc3Nlc1tpXS5hZGRyZXNzIH07XG5cbiAgICB9XG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHJlYWRkcik7XG59XG5cbmludGVyZmFjZSBJc3RyaW5nIHtcbiAgICB2b2x0YWdlOiBudW1iZXI7XG4gICAgY3VycmVudDogbnVtYmVyO1xuICAgIHBvd2VyOiBudW1iZXI7XG59XG5cbmludGVyZmFjZSBJQVBJIHtcblxuICAgIF9pZDogc3RyaW5nO1xuICAgIHVpZDogc3RyaW5nO1xuICAgIGJvb3RJZDogc3RyaW5nO1xuICAgIGJvb3RUaW1lOiBudW1iZXI7XG4gICAgYWN0aXZlOiBib29sZWFuO1xuICAgIHVwZGF0ZWRBdDogbnVtYmVyO1xuICAgIGRhdGU6IHN0cmluZztcbiAgICBzdHJpbmdzOiBJc3RyaW5nW107XG4gICAgZ3JpZDogSXN0cmluZztcbiAgICBEY0FjQ3ZyRWZmOiBudW1iZXI7XG4gICAgaW52VGVtcDogbnVtYmVyO1xuICAgIGVudlRlbXA6IG51bWJlcjtcbiAgICBkYWlseUVuZXJneTogbnVtYmVyO1xuICAgIHdlZWtseUVuZXJneTogbnVtYmVyO1xuICAgIGxhc3Q3RGF5c0VuZXJneTogbnVtYmVyO1xuICAgIG1vbnRobHlFbmVyZ3k6IG51bWJlcjtcbiAgICB5ZWFybHlFbmVyZ3k6IG51bWJlcjtcbiAgICB0b3RhbEVuZXJneTogbnVtYmVyO1xuICAgIHBhcnRpYWxFbmVyZ3k6IG51bWJlcjtcbiAgICBidWxrVjogbnVtYmVyO1xuICAgIGJ1bGtNVjogbnVtYmVyO1xuICAgIGJ1bGtEQzogbnVtYmVyO1xuICAgIGlzb1JlczogbnVtYmVyO1xuICAgIGdyaWRWREM6IG51bWJlcjtcbiAgICBncmlkQXZnVjogbnVtYmVyO1xuICAgIGdyaWREQ0h6OiBudW1iZXI7XG4gICAgcGVha01heDogbnVtYmVyO1xuICAgIHBlYWtEYXk6IG51bWJlcjtcbiAgICBwaW4xVzogbnVtYmVyO1xuICAgIHBpbjJXOiBudW1iZXI7XG59XG5cbmludGVyZmFjZSBJQWRkcmVzcyB7XG4gICAgdXVpZDogc3RyaW5nO1xuICAgIGRldjogc3RyaW5nO1xuICAgIGFkZHJlc3M6IG51bWJlcjtcbn1cbmNsYXNzIEFKUyB7XG4gICAgYWRkcmVzc2VzOiBJQWRkcmVzc1tdO1xuICAgIHRpbWV6b25lOiBzdHJpbmc7XG4gICAgZXhlYzogc3RyaW5nO1xuICAgIGNvbnN0cnVjdG9yKGFkZHJlc3NlczogSUFkZHJlc3NbXSwgdGltZXpvbmU6IHN0cmluZywgZXhlPzogc3RyaW5nKSB7XG4gICAgICAgIHRoaXMuYWRkcmVzc2VzID0gYWRkcmVzc2VzO1xuICAgICAgICB0aGlzLnRpbWV6b25lID0gdGltZXpvbmU7XG4gICAgICAgIGxldCBjbWQ6IHN0cmluZztcbiAgICAgICAgaWYgKGV4ZSkge1xuICAgICAgICAgICAgY21kID0gZXhlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKE9zLmFyY2goKSA9PSBcImFybVwiICYmIE9zLmNwdXMoKVswXS5tb2RlbCA9PSBcIkFSTXY3IFByb2Nlc3NvciByZXYgNSAodjdsKVwiKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJDTUQgYXVyb3JhIGFybVwiKVxuICAgICAgICAgICAgICAgIGNtZCA9IF9fZGlybmFtZSArIFwiL2Jpbi9yYXNwMi9hdXJvcmEuYmluXCJcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoT3MuYXJjaCgpID09IFwieDY0XCIpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkNNRCBhdXJvcmEgeDY0XCIpO1xuICAgICAgICAgICAgICAgIGNtZCA9IF9fZGlybmFtZSArIFwiL2Jpbi94NjQvYXVyb3JhLmJpblwiXG4gICAgICAgICAgICB9IGVsc2UgaWYgKE9zLmFyY2goKSA9PSBcImlhMzJcIikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiQ01EIGF1cm9yYSBpYTMyXCIpO1xuICAgICAgICAgICAgICAgIGNtZCA9IF9fZGlybmFtZSArIFwiL2Jpbi9pYTMyL2F1cm9yYS5iaW5cIlxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcIkNNRCBhdXJvcmFcIik7XG4gICAgICAgICAgICAgICAgY21kID0gXCJhdXJvcmFcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZXhlYyA9IGNtZDtcbiAgICB9XG4gICAgZGF0YSgpIHtcbiAgICAgICAgbGV0IGV4ZSA9IHRoaXMuZXhlYztcbiAgICAgICAgbGV0IGFkZHJlc3NlcyA9IHByZXBhcmVfYWRkcmVzcyh0aGlzLmFkZHJlc3Nlcyk7XG4gICAgICAgIGxldCB0aW1lem9uZSA9IHRoaXMudGltZXpvbmU7XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxJQVBJW10+KGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgZXhlYyhfX2Rpcm5hbWUgKyBcIi9hdXJvcmEuc2ggLWEgXFxcIlwiICsgYWRkcmVzc2VzICsgXCJcXFwiIC10IFxcXCJcIiArIHRpbWV6b25lICsgXCJcXFwiIC1lIFxcXCJcIiArIGV4ZSArIFwiXFxcIlwiKS50aGVuKGZ1bmN0aW9uKGRhdGE6IHN0cmluZykge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoSlNPTi5wYXJzZShkYXRhKSk7XG4gICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9XG4gICAgcmVjb25maWd1cmUob3B0OiB7IGFkZHJlc3Nlcz86IElBZGRyZXNzW10sIHRpbWV6b25lPzogc3RyaW5nLCBleGVjPzogc3RyaW5nIH0pIHtcbiAgICAgICAgaWYgKG9wdCkge1xuICAgICAgICAgICAgaWYgKG9wdC5hZGRyZXNzZXMpIHRoaXMuYWRkcmVzc2VzID0gb3B0LmFkZHJlc3NlcztcbiAgICAgICAgICAgIGlmIChvcHQudGltZXpvbmUpIHRoaXMudGltZXpvbmUgPSBvcHQudGltZXpvbmU7XG4gICAgICAgICAgICBpZiAob3B0LmV4ZWMpIHRoaXMuZXhlYyA9IG9wdC5leGVjO1xuICAgICAgICB9XG4gICAgfVxufVxuZXhwb3J0ID0gQUpTXG4iXSwic291cmNlUm9vdCI6Ii9zb3VyY2UvIn0=
