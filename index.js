"use strict";
var exec = require("promised-exec");
var Promise = require("bluebird");
var Os = require("os");
var lsusbdev = require("lsusbdev");
var async = require("async");
var apiVersion = require(__dirname + "/package.json").apiVersion;
function getAlarms(cmd, address, dev) {
    return new Promise(function (resolve, reject) {
        exec(cmd + " -a" + address + " -A -Y20 " + dev + " | cut -d: -f2- | sed 's/               //g'").then(function (data) {
            var lines = data.split("\n");
            var alarms = [];
            for (var i = 0; i < lines.length; i++) {
                if (lines[i] !== "No Alarm" && lines[i].length > 3) {
                    alarms.push({ alarm: lines[i] });
                }
            }
            return alarms;
        }).catch(function (err) {
            console.log(err);
            reject(err);
        });
    });
}
function checking(checkanswer, exe) {
    var cmd = exe + " -a " + checkanswer.address + " -Y 20 -n -f -g -p " + checkanswer.dev;
    return new Promise(function (resolve, reject) {
        exec(cmd).then(function (data) {
            var lines = data.split("\n");
            for (var i = 0; i < lines.length; i++) {
                if (lines[i].split("erial Number:").length > 1) {
                    if (lines[i].split("erial Number: ")[1].length > 1) {
                        checkanswer.serial = lines[i].split("erial Number: ")[1];
                    }
                    else {
                        checkanswer.serial = "none";
                    }
                }
                if (lines[i].split("art Number:").length > 1) {
                    if (lines[i].split("art Number: ")[1].length > 1) {
                        checkanswer.pn = lines[i].split("art Number: ")[1];
                    }
                    else {
                        checkanswer.pn = "none";
                    }
                }
                if (lines[i].split("irmware:").length > 1) {
                    if (lines[i].split("irmware: ")[1].length > 1) {
                        checkanswer.firmware = lines[i].split("irmware: ")[1];
                    }
                    else {
                        checkanswer.firmware = "none";
                    }
                }
                if (lines[i].split("anufacturing Date:").length > 1) {
                    if (lines[i].split("anufacturing Date: ")[1].length > 1) {
                        checkanswer.dateprod = lines[i].split("anufacturing Date: ")[1];
                    }
                    else {
                        checkanswer.dateprod = "none";
                    }
                }
            }
            if (checkanswer.serial && checkanswer.firmware && checkanswer.dateprod) {
                resolve(checkanswer);
            }
            else {
                reject("malformed answer");
            }
        }).catch(function (err) {
            reject(err);
        });
    });
}
function prepare_address(addresses) {
    var readdr = [];
    for (var i = 0; i < addresses.length; i++) {
        readdr[i] = { uuid: addresses[i].uuid, dev: addresses[i].hub, address: addresses[i].address };
    }
    return JSON.stringify(readdr);
}
var AJS = (function () {
    function AJS(addresses, timezone, exe) {
        this.apiVersion = apiVersion;
        this.addresses = addresses;
        this.timezone = timezone;
        var cmd;
        if (exe) {
            cmd = exe;
        }
        else {
            if (Os.arch() === "arm") {
                cmd = __dirname + "/bin/rasp2/aurora.bin";
            }
            else if (Os.arch() === "x64") {
                cmd = __dirname + "/bin/x64/aurora.bin";
            }
            else if (Os.arch() === "ia32") {
                cmd = __dirname + "/bin/ia32/aurora.bin";
            }
            else {
                cmd = "aurora";
            }
        }
        this.exec = cmd;
    }
    AJS.prototype.alarm = function (uuid) {
        var exe = this.exec;
        var timezone = this.timezone;
        var checkanswer = { uuid: uuid };
        var addresses = this.addresses;
        var apiVersion = this.apiVersion;
        var ala = {
            model: "Aurora",
            apiVersion: apiVersion,
            createdAt: new Date().getTime()
        };
        for (var i = 0; i < addresses.length; i++) {
            if (addresses[i].uuid === uuid) {
                checkanswer.hub = addresses[i].hub;
                checkanswer.address = addresses[i].address;
                if (addresses[i].dev)
                    checkanswer.dev = addresses[i].dev;
                if (addresses[i].firmware)
                    ala.firmware = addresses[i].firmware;
                if (addresses[i].dateprod)
                    ala.dateprod = addresses[i].dateprod;
                if (addresses[i].serial)
                    ala.serial = addresses[i].serial;
                if (addresses[i].address)
                    ala.address = addresses[i].address;
                if (addresses[i].pn)
                    ala.pn = addresses[i].pn;
            }
        }
        return new Promise(function (resolve, reject) {
            if (!checkanswer.dev) {
                lsusbdev().then(function (devis) {
                    for (var i = 0; i < devis.length; i++) {
                        if (devis[i].hub === checkanswer.hub) {
                            checkanswer.dev = devis[i].dev;
                        }
                    }
                    getAlarms(exe, checkanswer.address, checkanswer.dev).then(function (alarms) {
                        if (alarms.length > 0) {
                            resolve();
                        }
                        else {
                        }
                    }).catch(function (err) {
                        console.error("errrrrr2");
                        reject(err);
                    });
                }).catch(function (err) {
                    console.error("errrrrr2");
                    reject(err);
                });
            }
            else {
            }
        });
    };
    AJS.prototype.alarms = function (adds) {
        var addresses = [];
        var thisaddresses = this.addresses;
        if (adds) {
            for (var i = 0; i < thisaddresses.length; i++) {
                for (var a = 0; a < adds.length; a++) {
                    if (thisaddresses[i].uuid === adds[a]) {
                        addresses.push(thisaddresses[i]);
                    }
                }
            }
        }
        else {
            addresses = thisaddresses;
        }
        var that = this;
        var allanswers = [];
        return new Promise(function (resolve, reject) {
            async.each(addresses, function (iterator, callback) {
                that.alarm(iterator.uuid).then(function (ala) {
                    allanswers.push(ala);
                    callback();
                }).catch(function (err) {
                    console.log("err", err);
                    callback();
                });
            }, function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(allanswers);
                }
            });
        });
    };
    AJS.prototype.data = function () {
        var exe = this.exec;
        var timezone = this.timezone;
        var addressesoptions = this.addresses;
        var prepared_addresses = prepare_address(addressesoptions);
        var that = this;
        return new Promise(function (resolve, reject) {
            var checkmodel = [];
            for (var i = 0; i < addressesoptions.length; i++) {
                if (!addressesoptions[i].serial || addressesoptions[i].serial === "none" || !addressesoptions[i].pn || addressesoptions[i].pn === "none" || !addressesoptions[i].firmware || addressesoptions[i].firmware === "none" || !addressesoptions[i].dateprod || addressesoptions[i].dateprod === "none") {
                    checkmodel.push(addressesoptions[i].uuid);
                }
            }
            if (checkmodel.length > 0) {
                console.log("checking versions");
                that.checkAll(checkmodel).then(function (a) {
                    for (var i = 0; i < a.length; i++) {
                        if (a[i].serial && a[i].serial !== "none" && a[i].pn && a[i].pn !== "none" && a[i].firmware && a[i].firmware !== "none" && a[i].dateprod && a[i].dateprod !== "none") {
                            for (var add = 0; add < that.addresses.length; add++) {
                                if (that.addresses[add].uuid === a[i].uuid) {
                                    that.addresses[add] = a[i];
                                }
                            }
                        }
                    }
                    exec(__dirname + "/aurora.sh -a \"" + prepared_addresses + "\" -t \"" + timezone + "\" -e \"" + exe + "\"").then(function (data) {
                        var apians = JSON.parse(data);
                        for (var i = 0; i < apians.length; i++) {
                            for (var f = 0; f < a.length; f++) {
                                if (apians[i].uid === a[f].uuid) {
                                    if (a[f].firmware)
                                        apians[i].firmware = a[f].firmware;
                                    if (a[f].dateprod)
                                        apians[i].dateprod = a[f].dateprod;
                                    if (a[f].serial)
                                        apians[i].serial = a[f].serial;
                                    if (a[f].address)
                                        apians[i].address = a[f].address;
                                    if (a[f].pn)
                                        apians[i].pn = a[f].pn;
                                    apians[i].model = "Aurora";
                                    apians[i].apiVersion = apiVersion;
                                }
                            }
                        }
                        resolve(apians);
                    }).catch(function (err) {
                        console.log(err);
                        reject(err);
                    });
                }).catch(function (err) {
                    console.log(err);
                    exec(__dirname + "/aurora.sh -a \"" + prepared_addresses + "\" -t \"" + timezone + "\" -e \"" + exe + "\"").then(function (data) {
                        var apians = JSON.parse(data);
                        for (var i = 0; i < apians.length; i++) {
                            apians[i].model = "Aurora";
                            apians[i].apiVersion = apiVersion;
                        }
                        resolve(apians);
                    }).catch(function (err) {
                        console.log(err);
                        reject(err);
                    });
                });
            }
            else {
                exec(__dirname + "/aurora.sh -a \"" + prepared_addresses + "\" -t \"" + timezone + "\" -e \"" + exe + "\"").then(function (data) {
                    var apians = JSON.parse(data);
                    for (var i = 0; i < apians.length; i++) {
                        for (var f = 0; f < addressesoptions.length; f++) {
                            if (apians[i].uid === addressesoptions[f].uuid) {
                                if (addressesoptions[f].firmware)
                                    apians[i].firmware = addressesoptions[f].firmware;
                                if (addressesoptions[f].dateprod)
                                    apians[i].dateprod = addressesoptions[f].dateprod;
                                if (addressesoptions[f].serial)
                                    apians[i].serial = addressesoptions[f].serial;
                                if (addressesoptions[f].address)
                                    apians[i].address = addressesoptions[f].address;
                                if (addressesoptions[f].pn)
                                    apians[i].pn = addressesoptions[f].pn;
                                apians[i].model = "Aurora";
                                apians[i].apiVersion = apiVersion;
                            }
                        }
                    }
                    resolve(apians);
                }).catch(function (err) {
                    reject(err);
                });
            }
        });
    };
    AJS.prototype.check = function (uuid) {
        if (!uuid)
            throw Error("no uid provided");
        var exe = this.exec;
        var addresses = this.addresses;
        var checkanswer = { uuid: uuid };
        return new Promise(function (resolve, reject) {
            for (var i = 0; i < addresses.length; i++) {
                if (addresses[i].uuid === uuid) {
                    checkanswer.hub = addresses[i].hub;
                    checkanswer.address = addresses[i].address;
                }
            }
            lsusbdev().then(function (devis) {
                for (var i = 0; i < devis.length; i++) {
                    if (devis[i].hub === checkanswer.hub) {
                        checkanswer.dev = devis[i].dev;
                    }
                }
                checking(checkanswer, exe).then(function (a) {
                    resolve(a);
                }).catch(function () {
                    checking(checkanswer, exe).then(function (a) {
                        resolve(a);
                    }).catch(function () {
                        checking(checkanswer, exe).then(function (a) {
                            resolve(a);
                        }).catch(function () {
                            checking(checkanswer, exe).then(function (a) {
                                resolve(a);
                            }).catch(function (err) {
                                console.log(err);
                                checkanswer.serial = "none";
                                checkanswer.firmware = "none";
                                checkanswer.dateprod = "none";
                                checkanswer.pn = "none";
                                resolve(checkanswer);
                            });
                        });
                    });
                });
            }).catch(function (err) {
                console.error("errrrrr2");
                reject(err);
            });
        });
    };
    AJS.prototype.checkAll = function (adds) {
        var addresses = [];
        var thisaddresses = this.addresses;
        if (adds) {
            for (var i = 0; i < thisaddresses.length; i++) {
                for (var a = 0; a < adds.length; a++) {
                    if (thisaddresses[i].uuid === adds[a]) {
                        addresses.push(thisaddresses[i]);
                    }
                }
            }
        }
        else {
            addresses = thisaddresses;
        }
        var that = this;
        var allanswers = [];
        return new Promise(function (resolve, reject) {
            async.each(addresses, function (iterator, callback) {
                that.check(iterator.uuid).then(function (chkansw) {
                    allanswers.push(chkansw);
                    callback();
                }).catch(function (err) {
                    console.log("err", err);
                    for (var i = 0; i < thisaddresses.length; i++) {
                        if (thisaddresses[i].uuid === iterator.uuid) {
                            allanswers.push(thisaddresses[i]);
                        }
                    }
                    callback();
                });
            }, function (err) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(allanswers);
                }
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
}());
module.exports = AJS;

//# sourceMappingURL=data:application/json;base64,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QztnQkFBQyxJQUFJLENBQUMsU0FBUyxHQUFHLEdBQUcsQ0FBQyxTQUFTLENBQUM7WUFDbEQsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQztnQkFBQyxJQUFJLENBQUMsUUFBUSxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUM7WUFDL0MsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQztnQkFBQyxJQUFJLENBQUMsSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUM7UUFDdkMsQ0FBQztJQUNMLENBQUM7SUFDTCxVQUFDO0FBQUQsQ0E5YkEsQUE4YkMsSUFBQTtBQUNELGlCQUFTLEdBQUcsQ0FBQSIsImZpbGUiOiJpbmRleC5qcyIsInNvdXJjZXNDb250ZW50IjpbImxldCBleGVjID0gcmVxdWlyZShcInByb21pc2VkLWV4ZWNcIik7XG5pbXBvcnQgKiBhcyBQcm9taXNlIGZyb20gXCJibHVlYmlyZFwiO1xuaW1wb3J0ICogYXMgT3MgZnJvbSBcIm9zXCI7XG5pbXBvcnQgbHN1c2JkZXYgPSByZXF1aXJlKFwibHN1c2JkZXZcIik7XG5pbXBvcnQgYXN5bmMgPSByZXF1aXJlKFwiYXN5bmNcIik7XG5cbmxldCBhcGlWZXJzaW9uOiBzdHJpbmcgPSByZXF1aXJlKF9fZGlybmFtZSArIFwiL3BhY2thZ2UuanNvblwiKS5hcGlWZXJzaW9uO1xuXG5cblxuZnVuY3Rpb24gZ2V0QWxhcm1zKGNtZDogc3RyaW5nLCBhZGRyZXNzOiBudW1iZXIsIGRldjogc3RyaW5nKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPElhbGFybVtdPihmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcblxuICAgICAgICBleGVjKGNtZCArIFwiIC1hXCIgKyBhZGRyZXNzICsgXCIgLUEgLVkyMCBcIiArIGRldiArIFwiIHwgY3V0IC1kOiAtZjItIHwgc2VkICdzLyAgICAgICAgICAgICAgIC8vZydcIikudGhlbihmdW5jdGlvbihkYXRhOiBzdHJpbmcpIHtcblxuICAgICAgICAgICAgbGV0IGxpbmVzID0gZGF0YS5zcGxpdChcIlxcblwiKTtcbiAgICAgICAgICAgIGxldCBhbGFybXMgPSA8SWFsYXJtW10+W107XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGxpbmVzW2ldICE9PSBcIk5vIEFsYXJtXCIgJiYgbGluZXNbaV0ubGVuZ3RoID4gMykge1xuICAgICAgICAgICAgICAgICAgICBhbGFybXMucHVzaCh7IGFsYXJtOiBsaW5lc1tpXSB9KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIHJldHVybiBhbGFybXM7XG5cbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG59XG5cblxuZnVuY3Rpb24gY2hlY2tpbmcoY2hlY2thbnN3ZXIsIGV4ZSkge1xuXG4gICAgbGV0IGNtZCA9IGV4ZSArIFwiIC1hIFwiICsgY2hlY2thbnN3ZXIuYWRkcmVzcyArIFwiIC1ZIDIwIC1uIC1mIC1nIC1wIFwiICsgY2hlY2thbnN3ZXIuZGV2O1xuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPElBZGRyZXNzPihmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcblxuXG4gICAgICAgIGV4ZWMoY21kKS50aGVuKGZ1bmN0aW9uKGRhdGEpIHsgLy8gZmlybXdhcmVcbiAgICAgICAgICAgIGxldCBsaW5lcyA9IGRhdGEuc3BsaXQoXCJcXG5cIik7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XG5cbiAgICAgICAgICAgICAgICBpZiAobGluZXNbaV0uc3BsaXQoXCJlcmlhbCBOdW1iZXI6XCIpLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxpbmVzW2ldLnNwbGl0KFwiZXJpYWwgTnVtYmVyOiBcIilbMV0ubGVuZ3RoID4gMSkge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBjaGVja2Fuc3dlci5zZXJpYWwgPSBsaW5lc1tpXS5zcGxpdChcImVyaWFsIE51bWJlcjogXCIpWzFdO1xuXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaGVja2Fuc3dlci5zZXJpYWwgPSBcIm5vbmVcIjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuXG4gICAgICAgICAgICAgICAgaWYgKGxpbmVzW2ldLnNwbGl0KFwiYXJ0IE51bWJlcjpcIikubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAobGluZXNbaV0uc3BsaXQoXCJhcnQgTnVtYmVyOiBcIilbMV0ubGVuZ3RoID4gMSkge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBjaGVja2Fuc3dlci5wbiA9IGxpbmVzW2ldLnNwbGl0KFwiYXJ0IE51bWJlcjogXCIpWzFdO1xuXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaGVja2Fuc3dlci5wbiA9IFwibm9uZVwiO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG5cblxuICAgICAgICAgICAgICAgIGlmIChsaW5lc1tpXS5zcGxpdChcImlybXdhcmU6XCIpLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxpbmVzW2ldLnNwbGl0KFwiaXJtd2FyZTogXCIpWzFdLmxlbmd0aCA+IDEpIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2thbnN3ZXIuZmlybXdhcmUgPSBsaW5lc1tpXS5zcGxpdChcImlybXdhcmU6IFwiKVsxXTtcblxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2thbnN3ZXIuZmlybXdhcmUgPSBcIm5vbmVcIjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAobGluZXNbaV0uc3BsaXQoXCJhbnVmYWN0dXJpbmcgRGF0ZTpcIikubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAobGluZXNbaV0uc3BsaXQoXCJhbnVmYWN0dXJpbmcgRGF0ZTogXCIpWzFdLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoZWNrYW5zd2VyLmRhdGVwcm9kID0gbGluZXNbaV0uc3BsaXQoXCJhbnVmYWN0dXJpbmcgRGF0ZTogXCIpWzFdO1xuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2thbnN3ZXIuZGF0ZXByb2QgPSBcIm5vbmVcIjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfVxuXG5cblxuICAgICAgICAgICAgaWYgKGNoZWNrYW5zd2VyLnNlcmlhbCAmJiBjaGVja2Fuc3dlci5maXJtd2FyZSAmJiBjaGVja2Fuc3dlci5kYXRlcHJvZCkge1xuICAgICAgICAgICAgICAgIHJlc29sdmUoY2hlY2thbnN3ZXIpO1xuXG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlamVjdChcIm1hbGZvcm1lZCBhbnN3ZXJcIik7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vICAgY2hlY2thbnN3ZXIuZmlybXdhcmUgPSBkYXRhO1xuXG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgIH0pO1xuXG5cblxuICAgIH0pO1xuXG59XG5cblxuXG5mdW5jdGlvbiBwcmVwYXJlX2FkZHJlc3MoYWRkcmVzc2VzOiBJQWRkcmVzc1tdKSB7XG4gICAgbGV0IHJlYWRkciA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYWRkcmVzc2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHJlYWRkcltpXSA9IHsgdXVpZDogYWRkcmVzc2VzW2ldLnV1aWQsIGRldjogYWRkcmVzc2VzW2ldLmh1YiwgYWRkcmVzczogYWRkcmVzc2VzW2ldLmFkZHJlc3MgfTtcblxuICAgIH1cbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkocmVhZGRyKTtcbn1cblxuXG5cbmludGVyZmFjZSBJc3RyaW5nIHtcbiAgICB2b2x0YWdlOiBudW1iZXI7XG4gICAgY3VycmVudDogbnVtYmVyO1xuICAgIHBvd2VyOiBudW1iZXI7XG59XG5cbmludGVyZmFjZSBJYWxhcm0ge1xuICAgIGFsYXJtOiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBJQWxhcm0ge1xuXG4gICAgYWxhcm1zOiBJYWxhcm1bXTtcbiAgICBmaXJtd2FyZTogc3RyaW5nO1xuICAgIGRhdGVwcm9kOiBzdHJpbmc7XG4gICAgc2VyaWFsOiBzdHJpbmc7XG4gICAgcG46IHN0cmluZztcbiAgICBhZGRyZXNzOiBudW1iZXI7XG4gICAgbW9kZWw6IHN0cmluZztcbiAgICBhcGlWZXJzaW9uOiBzdHJpbmc7XG4gICAgY3JlYXRlZEF0OiBudW1iZXI7XG5cbn1cblxuaW50ZXJmYWNlIElBUEkge1xuXG4gICAgX2lkOiBzdHJpbmc7XG4gICAgdWlkOiBzdHJpbmc7XG4gICAgYm9vdElkOiBzdHJpbmc7XG4gICAgYm9vdFRpbWU6IG51bWJlcjtcbiAgICBhY3RpdmU6IGJvb2xlYW47XG4gICAgdXBkYXRlZEF0OiBudW1iZXI7XG4gICAgZGF0ZTogc3RyaW5nO1xuICAgIHN0cmluZ3M6IElzdHJpbmdbXTtcbiAgICBncmlkOiB7XG4gICAgICAgIHZvbHRhZ2U6IG51bWJlcjtcbiAgICAgICAgY3VycmVudDogbnVtYmVyO1xuICAgICAgICBwb3dlcjogbnVtYmVyO1xuICAgICAgICBoejogbnVtYmVyO1xuICAgIH07XG4gICAgRGNBY0N2ckVmZjogbnVtYmVyO1xuICAgIGludlRlbXA6IG51bWJlcjtcbiAgICBlbnZUZW1wOiBudW1iZXI7XG4gICAgZGFpbHlFbmVyZ3k6IG51bWJlcjtcbiAgICB3ZWVrbHlFbmVyZ3k6IG51bWJlcjtcbiAgICBsYXN0N0RheXNFbmVyZ3k6IG51bWJlcjtcbiAgICBtb250aGx5RW5lcmd5OiBudW1iZXI7XG4gICAgeWVhcmx5RW5lcmd5OiBudW1iZXI7XG4gICAgdG90YWxFbmVyZ3k6IG51bWJlcjtcbiAgICBwYXJ0aWFsRW5lcmd5OiBudW1iZXI7XG4gICAgYnVsa1Y6IG51bWJlcjtcbiAgICBidWxrTVY6IG51bWJlcjtcbiAgICBidWxrREM6IG51bWJlcjtcbiAgICBpc29SZXM6IG51bWJlcjtcbiAgICBncmlkVkRDOiBudW1iZXI7XG4gICAgZ3JpZEF2Z1Y6IG51bWJlcjtcbiAgICBncmlkRENIejogbnVtYmVyO1xuICAgIHBlYWtNYXg6IG51bWJlcjtcbiAgICBwZWFrRGF5OiBudW1iZXI7XG4gICAgcGluMVc6IG51bWJlcjtcbiAgICBwaW4yVzogbnVtYmVyO1xuXG4gICAgZmlybXdhcmU6IHN0cmluZztcbiAgICBkYXRlcHJvZDogc3RyaW5nO1xuICAgIHNlcmlhbDogc3RyaW5nO1xuICAgIHBuOiBzdHJpbmc7XG4gICAgYWRkcmVzczogbnVtYmVyO1xuICAgIG1vZGVsOiBzdHJpbmc7XG4gICAgYXBpVmVyc2lvbjogc3RyaW5nO1xufVxuXG5cblxuaW50ZXJmYWNlIElBZGRyZXNzIHtcbiAgICB1dWlkOiBzdHJpbmc7XG4gICAgZGV2Pzogc3RyaW5nO1xuICAgIGFkZHJlc3M6IG51bWJlcjtcbiAgICBodWI/OiBzdHJpbmc7XG4gICAgZmlybXdhcmU/OiBzdHJpbmc7XG4gICAgZGF0ZXByb2Q/OiBzdHJpbmc7XG4gICAgcG4/OiBzdHJpbmc7XG4gICAgc2VyaWFsPzogc3RyaW5nO1xuICAgIG1vZGVsPzogc3RyaW5nO1xuICAgIGFwaVZlcnNpb24/OiBzdHJpbmc7XG59XG5cbmNsYXNzIEFKUyB7XG4gICAgYWRkcmVzc2VzOiBJQWRkcmVzc1tdO1xuICAgIHRpbWV6b25lOiBzdHJpbmc7XG4gICAgZXhlYzogc3RyaW5nO1xuICAgIGFwaVZlcnNpb246IHN0cmluZztcbiAgICBjb25zdHJ1Y3RvcihhZGRyZXNzZXM6IElBZGRyZXNzW10sIHRpbWV6b25lOiBzdHJpbmcsIGV4ZT86IHN0cmluZykge1xuICAgICAgICB0aGlzLmFwaVZlcnNpb24gPSBhcGlWZXJzaW9uO1xuICAgICAgICB0aGlzLmFkZHJlc3NlcyA9IGFkZHJlc3NlcztcbiAgICAgICAgdGhpcy50aW1lem9uZSA9IHRpbWV6b25lO1xuICAgICAgICBsZXQgY21kOiBzdHJpbmc7XG4gICAgICAgIGlmIChleGUpIHtcbiAgICAgICAgICAgIGNtZCA9IGV4ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGlmIChPcy5hcmNoKCkgPT09IFwiYXJtXCIpIHtcbiAgICAgICAgICAgICAgICBjbWQgPSBfX2Rpcm5hbWUgKyBcIi9iaW4vcmFzcDIvYXVyb3JhLmJpblwiO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChPcy5hcmNoKCkgPT09IFwieDY0XCIpIHtcbiAgICAgICAgICAgICAgICBjbWQgPSBfX2Rpcm5hbWUgKyBcIi9iaW4veDY0L2F1cm9yYS5iaW5cIjtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoT3MuYXJjaCgpID09PSBcImlhMzJcIikge1xuICAgICAgICAgICAgICAgIGNtZCA9IF9fZGlybmFtZSArIFwiL2Jpbi9pYTMyL2F1cm9yYS5iaW5cIjtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgY21kID0gXCJhdXJvcmFcIjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZXhlYyA9IGNtZDtcbiAgICB9XG5cbiAgICBhbGFybSh1dWlkOiBzdHJpbmcpIHtcbiAgICAgICAgbGV0IGV4ZSA9IHRoaXMuZXhlYztcbiAgICAgICAgbGV0IHRpbWV6b25lID0gdGhpcy50aW1lem9uZTtcbiAgICAgICAgbGV0IGNoZWNrYW5zd2VyID0gPElBZGRyZXNzPnsgdXVpZDogdXVpZCB9O1xuICAgICAgICBsZXQgYWRkcmVzc2VzID0gdGhpcy5hZGRyZXNzZXM7XG4gICAgICAgIGxldCBhcGlWZXJzaW9uID0gdGhpcy5hcGlWZXJzaW9uO1xuXG5cbiAgICAgICAgbGV0IGFsYSA9IDxJQWxhcm0+e1xuICAgICAgICAgICAgbW9kZWw6IFwiQXVyb3JhXCIsXG4gICAgICAgICAgICBhcGlWZXJzaW9uOiBhcGlWZXJzaW9uLFxuICAgICAgICAgICAgY3JlYXRlZEF0OiBuZXcgRGF0ZSgpLmdldFRpbWUoKVxuICAgICAgICB9O1xuXG5cbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhZGRyZXNzZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGlmIChhZGRyZXNzZXNbaV0udXVpZCA9PT0gdXVpZCkge1xuICAgICAgICAgICAgICAgIGNoZWNrYW5zd2VyLmh1YiA9IGFkZHJlc3Nlc1tpXS5odWI7XG4gICAgICAgICAgICAgICAgY2hlY2thbnN3ZXIuYWRkcmVzcyA9IGFkZHJlc3Nlc1tpXS5hZGRyZXNzO1xuICAgICAgICAgICAgICAgIGlmIChhZGRyZXNzZXNbaV0uZGV2KSBjaGVja2Fuc3dlci5kZXYgPSBhZGRyZXNzZXNbaV0uZGV2O1xuXG4gICAgICAgICAgICAgICAgaWYgKGFkZHJlc3Nlc1tpXS5maXJtd2FyZSkgYWxhLmZpcm13YXJlID0gYWRkcmVzc2VzW2ldLmZpcm13YXJlO1xuICAgICAgICAgICAgICAgIGlmIChhZGRyZXNzZXNbaV0uZGF0ZXByb2QpIGFsYS5kYXRlcHJvZCA9IGFkZHJlc3Nlc1tpXS5kYXRlcHJvZDtcbiAgICAgICAgICAgICAgICBpZiAoYWRkcmVzc2VzW2ldLnNlcmlhbCkgYWxhLnNlcmlhbCA9IGFkZHJlc3Nlc1tpXS5zZXJpYWw7XG4gICAgICAgICAgICAgICAgaWYgKGFkZHJlc3Nlc1tpXS5hZGRyZXNzKSBhbGEuYWRkcmVzcyA9IGFkZHJlc3Nlc1tpXS5hZGRyZXNzO1xuICAgICAgICAgICAgICAgIGlmIChhZGRyZXNzZXNbaV0ucG4pIGFsYS5wbiA9IGFkZHJlc3Nlc1tpXS5wbjtcblxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxJQWxhcm0+KGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgaWYgKCFjaGVja2Fuc3dlci5kZXYpIHtcblxuXG4gICAgICAgICAgICAgICAgbHN1c2JkZXYoKS50aGVuKGZ1bmN0aW9uKGRldmlzKSB7XG5cblxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGRldmlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZGV2aXNbaV0uaHViID09PSBjaGVja2Fuc3dlci5odWIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGVja2Fuc3dlci5kZXYgPSBkZXZpc1tpXS5kZXY7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuXG4gICAgICAgICAgICAgICAgICAgIGdldEFsYXJtcyhleGUsIGNoZWNrYW5zd2VyLmFkZHJlc3MsIGNoZWNrYW5zd2VyLmRldikudGhlbihmdW5jdGlvbihhbGFybXMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhbGFybXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiZXJycnJycjJcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cblxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiZXJycnJycjJcIik7XG5cbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG5cbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuXG4gICAgYWxhcm1zKGFkZHM/OiBzdHJpbmdbXSkge1xuXG4gICAgICAgIGxldCBhZGRyZXNzZXM6IElBZGRyZXNzW10gPSBbXTtcbiAgICAgICAgbGV0IHRoaXNhZGRyZXNzZXMgPSB0aGlzLmFkZHJlc3NlcztcbiAgICAgICAgaWYgKGFkZHMpIHtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpc2FkZHJlc3Nlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGEgPSAwOyBhIDwgYWRkcy5sZW5ndGg7IGErKykge1xuXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzYWRkcmVzc2VzW2ldLnV1aWQgPT09IGFkZHNbYV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFkZHJlc3Nlcy5wdXNoKHRoaXNhZGRyZXNzZXNbaV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhZGRyZXNzZXMgPSB0aGlzYWRkcmVzc2VzO1xuICAgICAgICB9XG5cblxuXG5cbiAgICAgICAgbGV0IHRoYXQgPSB0aGlzO1xuXG4gICAgICAgIGxldCBhbGxhbnN3ZXJzOiBJQWxhcm1bXSA9IFtdO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxJQWxhcm1bXT4oZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG5cblxuICAgICAgICAgICAgYXN5bmMuZWFjaChhZGRyZXNzZXMsIGZ1bmN0aW9uKGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuXG4gICAgICAgICAgICAgICAgdGhhdC5hbGFybShpdGVyYXRvci51dWlkKS50aGVuKGZ1bmN0aW9uKGFsYSkge1xuXG4gICAgICAgICAgICAgICAgICAgIGFsbGFuc3dlcnMucHVzaChhbGEpO1xuXG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG5cbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbihlcnIpIHtcblxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImVyclwiLCBlcnIpO1xuXG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG5cbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgfSwgZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAvLyBPbmUgb2YgdGhlIGl0ZXJhdGlvbnMgcHJvZHVjZWQgYW4gZXJyb3IuXG4gICAgICAgICAgICAgICAgICAgIC8vIEFsbCBwcm9jZXNzaW5nIHdpbGwgbm93IHN0b3AuXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShhbGxhbnN3ZXJzKTtcblxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSk7XG5cblxuXG5cbiAgICAgICAgfSk7XG5cblxuXG5cblxuICAgIH1cblxuXG4gICAgZGF0YSgpIHtcblxuICAgICAgICBsZXQgZXhlID0gdGhpcy5leGVjO1xuICAgICAgICBsZXQgdGltZXpvbmUgPSB0aGlzLnRpbWV6b25lO1xuXG4gICAgICAgIGxldCBhZGRyZXNzZXNvcHRpb25zID0gdGhpcy5hZGRyZXNzZXM7XG5cbiAgICAgICAgbGV0IHByZXBhcmVkX2FkZHJlc3NlcyA9IHByZXBhcmVfYWRkcmVzcyhhZGRyZXNzZXNvcHRpb25zKTtcblxuICAgICAgICBsZXQgdGhhdCA9IHRoaXM7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPElBUElbXT4oZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG5cbiAgICAgICAgICAgIGxldCBjaGVja21vZGVsID0gW107XG5cbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYWRkcmVzc2Vzb3B0aW9ucy5sZW5ndGg7IGkrKykge1xuXG4gICAgICAgICAgICAgICAgaWYgKCFhZGRyZXNzZXNvcHRpb25zW2ldLnNlcmlhbCB8fCBhZGRyZXNzZXNvcHRpb25zW2ldLnNlcmlhbCA9PT0gXCJub25lXCIgfHwgIWFkZHJlc3Nlc29wdGlvbnNbaV0ucG4gfHwgYWRkcmVzc2Vzb3B0aW9uc1tpXS5wbiA9PT0gXCJub25lXCIgfHwgIWFkZHJlc3Nlc29wdGlvbnNbaV0uZmlybXdhcmUgfHwgYWRkcmVzc2Vzb3B0aW9uc1tpXS5maXJtd2FyZSA9PT0gXCJub25lXCIgfHwgIWFkZHJlc3Nlc29wdGlvbnNbaV0uZGF0ZXByb2QgfHwgYWRkcmVzc2Vzb3B0aW9uc1tpXS5kYXRlcHJvZCA9PT0gXCJub25lXCIpIHtcbiAgICAgICAgICAgICAgICAgICAgY2hlY2ttb2RlbC5wdXNoKGFkZHJlc3Nlc29wdGlvbnNbaV0udXVpZCk7XG5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cblxuICAgICAgICAgICAgaWYgKGNoZWNrbW9kZWwubGVuZ3RoID4gMCkge1xuXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJjaGVja2luZyB2ZXJzaW9uc1wiKTtcblxuICAgICAgICAgICAgICAgIHRoYXQuY2hlY2tBbGwoY2hlY2ttb2RlbCkudGhlbihmdW5jdGlvbihhKSB7XG5cblxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGEubGVuZ3RoOyBpKyspIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFbaV0uc2VyaWFsICYmIGFbaV0uc2VyaWFsICE9PSBcIm5vbmVcIiAmJiBhW2ldLnBuICYmIGFbaV0ucG4gIT09IFwibm9uZVwiICYmIGFbaV0uZmlybXdhcmUgJiYgYVtpXS5maXJtd2FyZSAhPT0gXCJub25lXCIgJiYgYVtpXS5kYXRlcHJvZCAmJiBhW2ldLmRhdGVwcm9kICE9PSBcIm5vbmVcIikge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgYWRkID0gMDsgYWRkIDwgdGhhdC5hZGRyZXNzZXMubGVuZ3RoOyBhZGQrKykge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGF0LmFkZHJlc3Nlc1thZGRdLnV1aWQgPT09IGFbaV0udXVpZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhhdC5hZGRyZXNzZXNbYWRkXSA9IGFbaV07XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIGV4ZWMoX19kaXJuYW1lICsgXCIvYXVyb3JhLnNoIC1hIFxcXCJcIiArIHByZXBhcmVkX2FkZHJlc3NlcyArIFwiXFxcIiAtdCBcXFwiXCIgKyB0aW1lem9uZSArIFwiXFxcIiAtZSBcXFwiXCIgKyBleGUgKyBcIlxcXCJcIikudGhlbihmdW5jdGlvbihkYXRhOiBzdHJpbmcpIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFwaWFuczogSUFQSVtdID0gSlNPTi5wYXJzZShkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXBpYW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgZiA9IDA7IGYgPCBhLmxlbmd0aDsgZisrKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFwaWFuc1tpXS51aWQgPT09IGFbZl0udXVpZCkge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYVtmXS5maXJtd2FyZSkgYXBpYW5zW2ldLmZpcm13YXJlID0gYVtmXS5maXJtd2FyZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhW2ZdLmRhdGVwcm9kKSBhcGlhbnNbaV0uZGF0ZXByb2QgPSBhW2ZdLmRhdGVwcm9kO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFbZl0uc2VyaWFsKSBhcGlhbnNbaV0uc2VyaWFsID0gYVtmXS5zZXJpYWw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYVtmXS5hZGRyZXNzKSBhcGlhbnNbaV0uYWRkcmVzcyA9IGFbZl0uYWRkcmVzcztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhW2ZdLnBuKSBhcGlhbnNbaV0ucG4gPSBhW2ZdLnBuO1xuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwaWFuc1tpXS5tb2RlbCA9IFwiQXVyb3JhXCI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcGlhbnNbaV0uYXBpVmVyc2lvbiA9IGFwaVZlcnNpb247XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGFwaWFucyk7XG5cbiAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cblxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgICAgICAgICBleGVjKF9fZGlybmFtZSArIFwiL2F1cm9yYS5zaCAtYSBcXFwiXCIgKyBwcmVwYXJlZF9hZGRyZXNzZXMgKyBcIlxcXCIgLXQgXFxcIlwiICsgdGltZXpvbmUgKyBcIlxcXCIgLWUgXFxcIlwiICsgZXhlICsgXCJcXFwiXCIpLnRoZW4oZnVuY3Rpb24oZGF0YTogc3RyaW5nKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhcGlhbnM6IElBUElbXSA9IEpTT04ucGFyc2UoZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFwaWFucy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwaWFuc1tpXS5tb2RlbCA9IFwiQXVyb3JhXCI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBpYW5zW2ldLmFwaVZlcnNpb24gPSBhcGlWZXJzaW9uO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGFwaWFucyk7XG4gICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIH0pO1xuXG5cbiAgICAgICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgICAgICBleGVjKF9fZGlybmFtZSArIFwiL2F1cm9yYS5zaCAtYSBcXFwiXCIgKyBwcmVwYXJlZF9hZGRyZXNzZXMgKyBcIlxcXCIgLXQgXFxcIlwiICsgdGltZXpvbmUgKyBcIlxcXCIgLWUgXFxcIlwiICsgZXhlICsgXCJcXFwiXCIpLnRoZW4oZnVuY3Rpb24oZGF0YTogc3RyaW5nKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgbGV0IGFwaWFuczogSUFQSVtdID0gSlNPTi5wYXJzZShkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcGlhbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGYgPSAwOyBmIDwgYWRkcmVzc2Vzb3B0aW9ucy5sZW5ndGg7IGYrKykge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFwaWFuc1tpXS51aWQgPT09IGFkZHJlc3Nlc29wdGlvbnNbZl0udXVpZCkge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhZGRyZXNzZXNvcHRpb25zW2ZdLmZpcm13YXJlKSBhcGlhbnNbaV0uZmlybXdhcmUgPSBhZGRyZXNzZXNvcHRpb25zW2ZdLmZpcm13YXJlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWRkcmVzc2Vzb3B0aW9uc1tmXS5kYXRlcHJvZCkgYXBpYW5zW2ldLmRhdGVwcm9kID0gYWRkcmVzc2Vzb3B0aW9uc1tmXS5kYXRlcHJvZDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFkZHJlc3Nlc29wdGlvbnNbZl0uc2VyaWFsKSBhcGlhbnNbaV0uc2VyaWFsID0gYWRkcmVzc2Vzb3B0aW9uc1tmXS5zZXJpYWw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhZGRyZXNzZXNvcHRpb25zW2ZdLmFkZHJlc3MpIGFwaWFuc1tpXS5hZGRyZXNzID0gYWRkcmVzc2Vzb3B0aW9uc1tmXS5hZGRyZXNzO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWRkcmVzc2Vzb3B0aW9uc1tmXS5wbikgYXBpYW5zW2ldLnBuID0gYWRkcmVzc2Vzb3B0aW9uc1tmXS5wbjtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcGlhbnNbaV0ubW9kZWwgPSBcIkF1cm9yYVwiO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcGlhbnNbaV0uYXBpVmVyc2lvbiA9IGFwaVZlcnNpb247XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGFwaWFucyk7XG5cbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICB9XG5cbiAgICBjaGVjayh1dWlkOiBzdHJpbmcpIHsgLy8gZ2V0IG1vZGVsLCBmaXJtd2FyZSwgcHJvZHVjdGlvbiBkYXRlXG5cblxuICAgICAgICBpZiAoIXV1aWQpIHRocm93IEVycm9yKFwibm8gdWlkIHByb3ZpZGVkXCIpO1xuXG5cbiAgICAgICAgbGV0IGV4ZSA9IHRoaXMuZXhlYztcblxuICAgICAgICBsZXQgYWRkcmVzc2VzID0gdGhpcy5hZGRyZXNzZXM7XG5cblxuXG4gICAgICAgIGxldCBjaGVja2Fuc3dlciA9IDxJQWRkcmVzcz57IHV1aWQ6IHV1aWQgfTtcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8SUFkZHJlc3M+KGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuXG5cbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYWRkcmVzc2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKGFkZHJlc3Nlc1tpXS51dWlkID09PSB1dWlkKSB7XG4gICAgICAgICAgICAgICAgICAgIGNoZWNrYW5zd2VyLmh1YiA9IGFkZHJlc3Nlc1tpXS5odWI7XG4gICAgICAgICAgICAgICAgICAgIGNoZWNrYW5zd2VyLmFkZHJlc3MgPSBhZGRyZXNzZXNbaV0uYWRkcmVzcztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG5cblxuICAgICAgICAgICAgbHN1c2JkZXYoKS50aGVuKGZ1bmN0aW9uKGRldmlzKSB7XG5cblxuICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZGV2aXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRldmlzW2ldLmh1YiA9PT0gY2hlY2thbnN3ZXIuaHViKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaGVja2Fuc3dlci5kZXYgPSBkZXZpc1tpXS5kZXY7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICBjaGVja2luZyhjaGVja2Fuc3dlciwgZXhlKS50aGVuKGZ1bmN0aW9uKGEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShhKTtcbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgY2hlY2tpbmcoY2hlY2thbnN3ZXIsIGV4ZSkudGhlbihmdW5jdGlvbihhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGEpO1xuICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoZWNraW5nKGNoZWNrYW5zd2VyLCBleGUpLnRoZW4oZnVuY3Rpb24oYSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoYSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGVja2luZyhjaGVja2Fuc3dlciwgZXhlKS50aGVuKGZ1bmN0aW9uKGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbihlcnIpIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoZWNrYW5zd2VyLnNlcmlhbCA9IFwibm9uZVwiO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGVja2Fuc3dlci5maXJtd2FyZSA9IFwibm9uZVwiO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGVja2Fuc3dlci5kYXRlcHJvZCA9IFwibm9uZVwiO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGVja2Fuc3dlci5wbiA9IFwibm9uZVwiO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoY2hlY2thbnN3ZXIpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgfSk7XG5cblxuICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcImVycnJycnIyXCIpO1xuXG4gICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG5cbiAgICAgICAgICAgIH0pO1xuXG5cbiAgICAgICAgfSk7XG5cbiAgICB9XG5cblxuICAgIGNoZWNrQWxsKGFkZHM/OiBzdHJpbmdbXSkge1xuXG4gICAgICAgIGxldCBhZGRyZXNzZXM6IElBZGRyZXNzW10gPSBbXTtcbiAgICAgICAgbGV0IHRoaXNhZGRyZXNzZXMgPSB0aGlzLmFkZHJlc3NlcztcbiAgICAgICAgaWYgKGFkZHMpIHtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpc2FkZHJlc3Nlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGZvciAobGV0IGEgPSAwOyBhIDwgYWRkcy5sZW5ndGg7IGErKykge1xuXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzYWRkcmVzc2VzW2ldLnV1aWQgPT09IGFkZHNbYV0pIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFkZHJlc3Nlcy5wdXNoKHRoaXNhZGRyZXNzZXNbaV0pO1xuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBhZGRyZXNzZXMgPSB0aGlzYWRkcmVzc2VzO1xuICAgICAgICB9XG5cblxuXG4gICAgICAgIGxldCB0aGF0ID0gdGhpcztcblxuICAgICAgICBsZXQgYWxsYW5zd2VyczogSUFkZHJlc3NbXSA9IFtdO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxJQWRkcmVzc1tdPihmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcblxuXG4gICAgICAgICAgICBhc3luYy5lYWNoKGFkZHJlc3NlcywgZnVuY3Rpb24oaXRlcmF0b3IsIGNhbGxiYWNrKSB7XG5cbiAgICAgICAgICAgICAgICB0aGF0LmNoZWNrKGl0ZXJhdG9yLnV1aWQpLnRoZW4oZnVuY3Rpb24oY2hrYW5zdykge1xuXG4gICAgICAgICAgICAgICAgICAgIGFsbGFuc3dlcnMucHVzaChjaGthbnN3KTtcblxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuXG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJlcnJcIiwgZXJyKTtcblxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXNhZGRyZXNzZXMubGVuZ3RoOyBpKyspIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXNhZGRyZXNzZXNbaV0udXVpZCA9PT0gaXRlcmF0b3IudXVpZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFsbGFuc3dlcnMucHVzaCh0aGlzYWRkcmVzc2VzW2ldKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gT25lIG9mIHRoZSBpdGVyYXRpb25zIHByb2R1Y2VkIGFuIGVycm9yLlxuICAgICAgICAgICAgICAgICAgICAvLyBBbGwgcHJvY2Vzc2luZyB3aWxsIG5vdyBzdG9wLlxuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoYWxsYW5zd2Vycyk7XG5cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH0pO1xuXG5cblxuXG4gICAgICAgIH0pO1xuXG5cbiAgICB9XG5cblxuICAgIHJlY29uZmlndXJlKG9wdDogeyBhZGRyZXNzZXM/OiBJQWRkcmVzc1tdLCB0aW1lem9uZT86IHN0cmluZywgZXhlYz86IHN0cmluZyB9KSB7XG4gICAgICAgIGlmIChvcHQpIHtcbiAgICAgICAgICAgIGlmIChvcHQuYWRkcmVzc2VzKSB0aGlzLmFkZHJlc3NlcyA9IG9wdC5hZGRyZXNzZXM7XG4gICAgICAgICAgICBpZiAob3B0LnRpbWV6b25lKSB0aGlzLnRpbWV6b25lID0gb3B0LnRpbWV6b25lO1xuICAgICAgICAgICAgaWYgKG9wdC5leGVjKSB0aGlzLmV4ZWMgPSBvcHQuZXhlYztcbiAgICAgICAgfVxuICAgIH1cbn1cbmV4cG9ydCA9IEFKU1xuIl0sInNvdXJjZVJvb3QiOiIvc291cmNlLyJ9
