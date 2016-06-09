"use strict";
var exec = require("promised-exec");
var Promise = require("bluebird");
var Os = require("os");
var lsusbdev = require("lsusbdev");
var async = require("async");
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
        this.apiVersion = require(__dirname + "/package.json").version;
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
                        ala.alarms = alarms;
                        resolve(ala);
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
                                    apians[i].apiVersion = that.apiVersion;
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
                            apians[i].apiVersion = that.apiVersion;
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
                                apians[i].apiVersion = that.apiVersion;
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

//# sourceMappingURL=data:application/json;base64,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QUksQ0FBQyxTQUFTLEdBQUcsa0JBQWtCLEdBQUcsa0JBQWtCLEdBQUcsVUFBVSxHQUFHLFFBQVEsR0FBRyxVQUFVLEdBQUcsR0FBRyxHQUFHLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFTLElBQVk7d0JBRWxJLElBQUksTUFBTSxHQUFXLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7d0JBQ3RDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsTUFBTSxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDOzRCQUNyQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQ0FFaEMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztvQ0FFOUIsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQzt3Q0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7b0NBQ3RELEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7d0NBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO29DQUN0RCxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO3dDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztvQ0FDaEQsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFD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LENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDO2dCQUFDLElBQUksQ0FBQyxRQUFRLEdBQUcsR0FBRyxDQUFDLFFBQVEsQ0FBQztZQUMvQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDO2dCQUFDLElBQUksQ0FBQyxJQUFJLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQztRQUN2QyxDQUFDO0lBQ0wsQ0FBQztJQUNMLFVBQUM7QUFBRCxDQTViQSxBQTRiQyxJQUFBO0FBQ0QsaUJBQVMsR0FBRyxDQUFBIiwiZmlsZSI6ImluZGV4LmpzIiwic291cmNlc0NvbnRlbnQiOlsibGV0IGV4ZWMgPSByZXF1aXJlKFwicHJvbWlzZWQtZXhlY1wiKTtcbmltcG9ydCAqIGFzIFByb21pc2UgZnJvbSBcImJsdWViaXJkXCI7XG5pbXBvcnQgKiBhcyBPcyBmcm9tIFwib3NcIjtcbmltcG9ydCBsc3VzYmRldiA9IHJlcXVpcmUoXCJsc3VzYmRldlwiKTtcbmltcG9ydCBhc3luYyA9IHJlcXVpcmUoXCJhc3luY1wiKTtcblxuXG5cbmZ1bmN0aW9uIGdldEFsYXJtcyhjbWQ6IHN0cmluZywgYWRkcmVzczogbnVtYmVyLCBkZXY6IHN0cmluZykge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZTxJYWxhcm1bXT4oZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG5cbiAgICAgICAgZXhlYyhjbWQgKyBcIiAtYVwiICsgYWRkcmVzcyArIFwiIC1BIC1ZMjAgXCIgKyBkZXYgKyBcIiB8IGN1dCAtZDogLWYyLSB8IHNlZCAncy8gICAgICAgICAgICAgICAvL2cnXCIpLnRoZW4oZnVuY3Rpb24oZGF0YTogc3RyaW5nKSB7XG5cbiAgICAgICAgICAgIGxldCBsaW5lcyA9IGRhdGEuc3BsaXQoXCJcXG5cIik7XG4gICAgICAgICAgICBsZXQgYWxhcm1zID0gPElhbGFybVtdPltdO1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChsaW5lc1tpXSAhPT0gXCJObyBBbGFybVwiICYmIGxpbmVzW2ldLmxlbmd0aCA+IDMpIHtcbiAgICAgICAgICAgICAgICAgICAgYWxhcm1zLnB1c2goeyBhbGFybTogbGluZXNbaV0gfSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gYWxhcm1zO1xuXG4gICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICB9KTtcbiAgICB9KTtcblxufVxuXG5cbmZ1bmN0aW9uIGNoZWNraW5nKGNoZWNrYW5zd2VyLCBleGUpIHtcblxuICAgIGxldCBjbWQgPSBleGUgKyBcIiAtYSBcIiArIGNoZWNrYW5zd2VyLmFkZHJlc3MgKyBcIiAtWSAyMCAtbiAtZiAtZyAtcCBcIiArIGNoZWNrYW5zd2VyLmRldjtcblxuICAgIHJldHVybiBuZXcgUHJvbWlzZTxJQWRkcmVzcz4oZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG5cblxuICAgICAgICBleGVjKGNtZCkudGhlbihmdW5jdGlvbihkYXRhKSB7IC8vIGZpcm13YXJlXG4gICAgICAgICAgICBsZXQgbGluZXMgPSBkYXRhLnNwbGl0KFwiXFxuXCIpO1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBsaW5lcy5sZW5ndGg7IGkrKykge1xuXG4gICAgICAgICAgICAgICAgaWYgKGxpbmVzW2ldLnNwbGl0KFwiZXJpYWwgTnVtYmVyOlwiKS5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChsaW5lc1tpXS5zcGxpdChcImVyaWFsIE51bWJlcjogXCIpWzFdLmxlbmd0aCA+IDEpIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2thbnN3ZXIuc2VyaWFsID0gbGluZXNbaV0uc3BsaXQoXCJlcmlhbCBOdW1iZXI6IFwiKVsxXTtcblxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2thbnN3ZXIuc2VyaWFsID0gXCJub25lXCI7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cblxuICAgICAgICAgICAgICAgIGlmIChsaW5lc1tpXS5zcGxpdChcImFydCBOdW1iZXI6XCIpLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxpbmVzW2ldLnNwbGl0KFwiYXJ0IE51bWJlcjogXCIpWzFdLmxlbmd0aCA+IDEpIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2thbnN3ZXIucG4gPSBsaW5lc1tpXS5zcGxpdChcImFydCBOdW1iZXI6IFwiKVsxXTtcblxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2thbnN3ZXIucG4gPSBcIm5vbmVcIjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuXG5cbiAgICAgICAgICAgICAgICBpZiAobGluZXNbaV0uc3BsaXQoXCJpcm13YXJlOlwiKS5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChsaW5lc1tpXS5zcGxpdChcImlybXdhcmU6IFwiKVsxXS5sZW5ndGggPiAxKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGNoZWNrYW5zd2VyLmZpcm13YXJlID0gbGluZXNbaV0uc3BsaXQoXCJpcm13YXJlOiBcIilbMV07XG5cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoZWNrYW5zd2VyLmZpcm13YXJlID0gXCJub25lXCI7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgaWYgKGxpbmVzW2ldLnNwbGl0KFwiYW51ZmFjdHVyaW5nIERhdGU6XCIpLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKGxpbmVzW2ldLnNwbGl0KFwiYW51ZmFjdHVyaW5nIERhdGU6IFwiKVsxXS5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaGVja2Fuc3dlci5kYXRlcHJvZCA9IGxpbmVzW2ldLnNwbGl0KFwiYW51ZmFjdHVyaW5nIERhdGU6IFwiKVsxXTtcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoZWNrYW5zd2VyLmRhdGVwcm9kID0gXCJub25lXCI7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH1cblxuXG5cbiAgICAgICAgICAgIGlmIChjaGVja2Fuc3dlci5zZXJpYWwgJiYgY2hlY2thbnN3ZXIuZmlybXdhcmUgJiYgY2hlY2thbnN3ZXIuZGF0ZXByb2QpIHtcbiAgICAgICAgICAgICAgICByZXNvbHZlKGNoZWNrYW5zd2VyKTtcblxuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZWplY3QoXCJtYWxmb3JtZWQgYW5zd2VyXCIpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyAgIGNoZWNrYW5zd2VyLmZpcm13YXJlID0gZGF0YTtcblxuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICB9KTtcblxuXG5cbiAgICB9KTtcblxufVxuXG5cblxuZnVuY3Rpb24gcHJlcGFyZV9hZGRyZXNzKGFkZHJlc3NlczogSUFkZHJlc3NbXSkge1xuICAgIGxldCByZWFkZHIgPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFkZHJlc3Nlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICByZWFkZHJbaV0gPSB7IHV1aWQ6IGFkZHJlc3Nlc1tpXS51dWlkLCBkZXY6IGFkZHJlc3Nlc1tpXS5odWIsIGFkZHJlc3M6IGFkZHJlc3Nlc1tpXS5hZGRyZXNzIH07XG5cbiAgICB9XG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHJlYWRkcik7XG59XG5cblxuXG5pbnRlcmZhY2UgSXN0cmluZyB7XG4gICAgdm9sdGFnZTogbnVtYmVyO1xuICAgIGN1cnJlbnQ6IG51bWJlcjtcbiAgICBwb3dlcjogbnVtYmVyO1xufVxuXG5pbnRlcmZhY2UgSWFsYXJtIHtcbiAgICBhbGFybTogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgSUFsYXJtIHtcblxuICAgIGFsYXJtczogSWFsYXJtW107XG4gICAgZmlybXdhcmU6IHN0cmluZztcbiAgICBkYXRlcHJvZDogc3RyaW5nO1xuICAgIHNlcmlhbDogc3RyaW5nO1xuICAgIHBuOiBzdHJpbmc7XG4gICAgYWRkcmVzczogbnVtYmVyO1xuICAgIG1vZGVsOiBzdHJpbmc7XG4gICAgYXBpVmVyc2lvbjogc3RyaW5nO1xuICAgIGNyZWF0ZWRBdDogbnVtYmVyO1xuXG59XG5cbmludGVyZmFjZSBJQVBJIHtcblxuICAgIF9pZDogc3RyaW5nO1xuICAgIHVpZDogc3RyaW5nO1xuICAgIGJvb3RJZDogc3RyaW5nO1xuICAgIGJvb3RUaW1lOiBudW1iZXI7XG4gICAgYWN0aXZlOiBib29sZWFuO1xuICAgIHVwZGF0ZWRBdDogbnVtYmVyO1xuICAgIGRhdGU6IHN0cmluZztcbiAgICBzdHJpbmdzOiBJc3RyaW5nW107XG4gICAgZ3JpZDoge1xuICAgICAgICB2b2x0YWdlOiBudW1iZXI7XG4gICAgICAgIGN1cnJlbnQ6IG51bWJlcjtcbiAgICAgICAgcG93ZXI6IG51bWJlcjtcbiAgICAgICAgaHo6IG51bWJlcjtcbiAgICB9O1xuICAgIERjQWNDdnJFZmY6IG51bWJlcjtcbiAgICBpbnZUZW1wOiBudW1iZXI7XG4gICAgZW52VGVtcDogbnVtYmVyO1xuICAgIGRhaWx5RW5lcmd5OiBudW1iZXI7XG4gICAgd2Vla2x5RW5lcmd5OiBudW1iZXI7XG4gICAgbGFzdDdEYXlzRW5lcmd5OiBudW1iZXI7XG4gICAgbW9udGhseUVuZXJneTogbnVtYmVyO1xuICAgIHllYXJseUVuZXJneTogbnVtYmVyO1xuICAgIHRvdGFsRW5lcmd5OiBudW1iZXI7XG4gICAgcGFydGlhbEVuZXJneTogbnVtYmVyO1xuICAgIGJ1bGtWOiBudW1iZXI7XG4gICAgYnVsa01WOiBudW1iZXI7XG4gICAgYnVsa0RDOiBudW1iZXI7XG4gICAgaXNvUmVzOiBudW1iZXI7XG4gICAgZ3JpZFZEQzogbnVtYmVyO1xuICAgIGdyaWRBdmdWOiBudW1iZXI7XG4gICAgZ3JpZERDSHo6IG51bWJlcjtcbiAgICBwZWFrTWF4OiBudW1iZXI7XG4gICAgcGVha0RheTogbnVtYmVyO1xuICAgIHBpbjFXOiBudW1iZXI7XG4gICAgcGluMlc6IG51bWJlcjtcblxuICAgIGZpcm13YXJlOiBzdHJpbmc7XG4gICAgZGF0ZXByb2Q6IHN0cmluZztcbiAgICBzZXJpYWw6IHN0cmluZztcbiAgICBwbjogc3RyaW5nO1xuICAgIGFkZHJlc3M6IG51bWJlcjtcbiAgICBtb2RlbDogc3RyaW5nO1xuICAgIGFwaVZlcnNpb246IHN0cmluZztcbn1cblxuXG5cbmludGVyZmFjZSBJQWRkcmVzcyB7XG4gICAgdXVpZDogc3RyaW5nO1xuICAgIGRldj86IHN0cmluZztcbiAgICBhZGRyZXNzOiBudW1iZXI7XG4gICAgaHViPzogc3RyaW5nO1xuICAgIGZpcm13YXJlPzogc3RyaW5nO1xuICAgIGRhdGVwcm9kPzogc3RyaW5nO1xuICAgIHBuPzogc3RyaW5nO1xuICAgIHNlcmlhbD86IHN0cmluZztcbiAgICBtb2RlbD86IHN0cmluZztcbiAgICBhcGlWZXJzaW9uPzogc3RyaW5nO1xufVxuXG5jbGFzcyBBSlMge1xuICAgIGFkZHJlc3NlczogSUFkZHJlc3NbXTtcbiAgICB0aW1lem9uZTogc3RyaW5nO1xuICAgIGV4ZWM6IHN0cmluZztcbiAgICBhcGlWZXJzaW9uOiBzdHJpbmc7XG4gICAgY29uc3RydWN0b3IoYWRkcmVzc2VzOiBJQWRkcmVzc1tdLCB0aW1lem9uZTogc3RyaW5nLCBleGU/OiBzdHJpbmcpIHtcbiAgICAgICAgdGhpcy5hcGlWZXJzaW9uID0gcmVxdWlyZShfX2Rpcm5hbWUgKyBcIi9wYWNrYWdlLmpzb25cIikudmVyc2lvbjtcbiAgICAgICAgdGhpcy5hZGRyZXNzZXMgPSBhZGRyZXNzZXM7XG4gICAgICAgIHRoaXMudGltZXpvbmUgPSB0aW1lem9uZTtcbiAgICAgICAgbGV0IGNtZDogc3RyaW5nO1xuICAgICAgICBpZiAoZXhlKSB7XG4gICAgICAgICAgICBjbWQgPSBleGU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpZiAoT3MuYXJjaCgpID09PSBcImFybVwiKSB7XG4gICAgICAgICAgICAgICAgY21kID0gX19kaXJuYW1lICsgXCIvYmluL3Jhc3AyL2F1cm9yYS5iaW5cIjtcbiAgICAgICAgICAgIH0gZWxzZSBpZiAoT3MuYXJjaCgpID09PSBcIng2NFwiKSB7XG4gICAgICAgICAgICAgICAgY21kID0gX19kaXJuYW1lICsgXCIvYmluL3g2NC9hdXJvcmEuYmluXCI7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKE9zLmFyY2goKSA9PT0gXCJpYTMyXCIpIHtcbiAgICAgICAgICAgICAgICBjbWQgPSBfX2Rpcm5hbWUgKyBcIi9iaW4vaWEzMi9hdXJvcmEuYmluXCI7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNtZCA9IFwiYXVyb3JhXCI7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmV4ZWMgPSBjbWQ7XG4gICAgfVxuXG4gICAgYWxhcm0odXVpZDogc3RyaW5nKSB7XG4gICAgICAgIGxldCBleGUgPSB0aGlzLmV4ZWM7XG4gICAgICAgIGxldCB0aW1lem9uZSA9IHRoaXMudGltZXpvbmU7XG4gICAgICAgIGxldCBjaGVja2Fuc3dlciA9IDxJQWRkcmVzcz57IHV1aWQ6IHV1aWQgfTtcbiAgICAgICAgbGV0IGFkZHJlc3NlcyA9IHRoaXMuYWRkcmVzc2VzO1xuICAgICAgICBsZXQgYXBpVmVyc2lvbiA9IHRoaXMuYXBpVmVyc2lvbjtcblxuXG4gICAgICAgIGxldCBhbGEgPSA8SUFsYXJtPntcbiAgICAgICAgICAgIG1vZGVsOiBcIkF1cm9yYVwiLFxuICAgICAgICAgICAgYXBpVmVyc2lvbjogYXBpVmVyc2lvbixcbiAgICAgICAgICAgIGNyZWF0ZWRBdDogbmV3IERhdGUoKS5nZXRUaW1lKClcbiAgICAgICAgfTtcblxuXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYWRkcmVzc2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBpZiAoYWRkcmVzc2VzW2ldLnV1aWQgPT09IHV1aWQpIHtcbiAgICAgICAgICAgICAgICBjaGVja2Fuc3dlci5odWIgPSBhZGRyZXNzZXNbaV0uaHViO1xuICAgICAgICAgICAgICAgIGNoZWNrYW5zd2VyLmFkZHJlc3MgPSBhZGRyZXNzZXNbaV0uYWRkcmVzcztcbiAgICAgICAgICAgICAgICBpZiAoYWRkcmVzc2VzW2ldLmRldikgY2hlY2thbnN3ZXIuZGV2ID0gYWRkcmVzc2VzW2ldLmRldjtcblxuICAgICAgICAgICAgICAgIGlmIChhZGRyZXNzZXNbaV0uZmlybXdhcmUpIGFsYS5maXJtd2FyZSA9IGFkZHJlc3Nlc1tpXS5maXJtd2FyZTtcbiAgICAgICAgICAgICAgICBpZiAoYWRkcmVzc2VzW2ldLmRhdGVwcm9kKSBhbGEuZGF0ZXByb2QgPSBhZGRyZXNzZXNbaV0uZGF0ZXByb2Q7XG4gICAgICAgICAgICAgICAgaWYgKGFkZHJlc3Nlc1tpXS5zZXJpYWwpIGFsYS5zZXJpYWwgPSBhZGRyZXNzZXNbaV0uc2VyaWFsO1xuICAgICAgICAgICAgICAgIGlmIChhZGRyZXNzZXNbaV0uYWRkcmVzcykgYWxhLmFkZHJlc3MgPSBhZGRyZXNzZXNbaV0uYWRkcmVzcztcbiAgICAgICAgICAgICAgICBpZiAoYWRkcmVzc2VzW2ldLnBuKSBhbGEucG4gPSBhZGRyZXNzZXNbaV0ucG47XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8SUFsYXJtPihmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgICAgIGlmICghY2hlY2thbnN3ZXIuZGV2KSB7XG5cblxuICAgICAgICAgICAgICAgIGxzdXNiZGV2KCkudGhlbihmdW5jdGlvbihkZXZpcykge1xuXG5cbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkZXZpcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRldmlzW2ldLmh1YiA9PT0gY2hlY2thbnN3ZXIuaHViKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2thbnN3ZXIuZGV2ID0gZGV2aXNbaV0uZGV2O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cblxuICAgICAgICAgICAgICAgICAgICBnZXRBbGFybXMoZXhlLCBjaGVja2Fuc3dlci5hZGRyZXNzLCBjaGVja2Fuc3dlci5kZXYpLnRoZW4oZnVuY3Rpb24oYWxhcm1zKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGFsYS5hbGFybXMgPSBhbGFybXM7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGFsYSk7XG4gICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcImVycnJycnIyXCIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG5cbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcImVycnJycnIyXCIpO1xuXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGFsYXJtcyhhZGRzPzogc3RyaW5nW10pIHtcblxuICAgICAgICBsZXQgYWRkcmVzc2VzOiBJQWRkcmVzc1tdID0gW107XG4gICAgICAgIGxldCB0aGlzYWRkcmVzc2VzID0gdGhpcy5hZGRyZXNzZXM7XG4gICAgICAgIGlmIChhZGRzKSB7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXNhZGRyZXNzZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBhID0gMDsgYSA8IGFkZHMubGVuZ3RoOyBhKyspIHtcblxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpc2FkZHJlc3Nlc1tpXS51dWlkID09PSBhZGRzW2FdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhZGRyZXNzZXMucHVzaCh0aGlzYWRkcmVzc2VzW2ldKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYWRkcmVzc2VzID0gdGhpc2FkZHJlc3NlcztcbiAgICAgICAgfVxuXG5cblxuXG4gICAgICAgIGxldCB0aGF0ID0gdGhpcztcblxuICAgICAgICBsZXQgYWxsYW5zd2VyczogSUFsYXJtW10gPSBbXTtcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8SUFsYXJtW10+KGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuXG5cbiAgICAgICAgICAgIGFzeW5jLmVhY2goYWRkcmVzc2VzLCBmdW5jdGlvbihpdGVyYXRvciwgY2FsbGJhY2spIHtcblxuICAgICAgICAgICAgICAgIHRoYXQuYWxhcm0oaXRlcmF0b3IudXVpZCkudGhlbihmdW5jdGlvbihhbGEpIHtcblxuICAgICAgICAgICAgICAgICAgICBhbGxhbnN3ZXJzLnB1c2goYWxhKTtcblxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuXG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJlcnJcIiwgZXJyKTtcblxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgIGlmIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgLy8gT25lIG9mIHRoZSBpdGVyYXRpb25zIHByb2R1Y2VkIGFuIGVycm9yLlxuICAgICAgICAgICAgICAgICAgICAvLyBBbGwgcHJvY2Vzc2luZyB3aWxsIG5vdyBzdG9wLlxuICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoYWxsYW5zd2Vycyk7XG5cbiAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH0pO1xuXG5cblxuXG4gICAgICAgIH0pO1xuXG5cblxuXG5cbiAgICB9XG5cblxuICAgIGRhdGEoKSB7XG5cbiAgICAgICAgbGV0IGV4ZSA9IHRoaXMuZXhlYztcbiAgICAgICAgbGV0IHRpbWV6b25lID0gdGhpcy50aW1lem9uZTtcblxuICAgICAgICBsZXQgYWRkcmVzc2Vzb3B0aW9ucyA9IHRoaXMuYWRkcmVzc2VzO1xuXG4gICAgICAgIGxldCBwcmVwYXJlZF9hZGRyZXNzZXMgPSBwcmVwYXJlX2FkZHJlc3MoYWRkcmVzc2Vzb3B0aW9ucyk7XG5cbiAgICAgICAgbGV0IHRoYXQgPSB0aGlzO1xuXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZTxJQVBJW10+KGZ1bmN0aW9uKHJlc29sdmUsIHJlamVjdCkge1xuXG4gICAgICAgICAgICBsZXQgY2hlY2ttb2RlbCA9IFtdO1xuXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFkZHJlc3Nlc29wdGlvbnMubGVuZ3RoOyBpKyspIHtcblxuICAgICAgICAgICAgICAgIGlmICghYWRkcmVzc2Vzb3B0aW9uc1tpXS5zZXJpYWwgfHwgYWRkcmVzc2Vzb3B0aW9uc1tpXS5zZXJpYWwgPT09IFwibm9uZVwiIHx8ICFhZGRyZXNzZXNvcHRpb25zW2ldLnBuIHx8IGFkZHJlc3Nlc29wdGlvbnNbaV0ucG4gPT09IFwibm9uZVwiIHx8ICFhZGRyZXNzZXNvcHRpb25zW2ldLmZpcm13YXJlIHx8IGFkZHJlc3Nlc29wdGlvbnNbaV0uZmlybXdhcmUgPT09IFwibm9uZVwiIHx8ICFhZGRyZXNzZXNvcHRpb25zW2ldLmRhdGVwcm9kIHx8IGFkZHJlc3Nlc29wdGlvbnNbaV0uZGF0ZXByb2QgPT09IFwibm9uZVwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGNoZWNrbW9kZWwucHVzaChhZGRyZXNzZXNvcHRpb25zW2ldLnV1aWQpO1xuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgIGlmIChjaGVja21vZGVsLmxlbmd0aCA+IDApIHtcblxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiY2hlY2tpbmcgdmVyc2lvbnNcIik7XG5cbiAgICAgICAgICAgICAgICB0aGF0LmNoZWNrQWxsKGNoZWNrbW9kZWwpLnRoZW4oZnVuY3Rpb24oYSkge1xuXG5cbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhLmxlbmd0aDsgaSsrKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhW2ldLnNlcmlhbCAmJiBhW2ldLnNlcmlhbCAhPT0gXCJub25lXCIgJiYgYVtpXS5wbiAmJiBhW2ldLnBuICE9PSBcIm5vbmVcIiAmJiBhW2ldLmZpcm13YXJlICYmIGFbaV0uZmlybXdhcmUgIT09IFwibm9uZVwiICYmIGFbaV0uZGF0ZXByb2QgJiYgYVtpXS5kYXRlcHJvZCAhPT0gXCJub25lXCIpIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGFkZCA9IDA7IGFkZCA8IHRoYXQuYWRkcmVzc2VzLmxlbmd0aDsgYWRkKyspIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhhdC5hZGRyZXNzZXNbYWRkXS51dWlkID09PSBhW2ldLnV1aWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoYXQuYWRkcmVzc2VzW2FkZF0gPSBhW2ldO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICBleGVjKF9fZGlybmFtZSArIFwiL2F1cm9yYS5zaCAtYSBcXFwiXCIgKyBwcmVwYXJlZF9hZGRyZXNzZXMgKyBcIlxcXCIgLXQgXFxcIlwiICsgdGltZXpvbmUgKyBcIlxcXCIgLWUgXFxcIlwiICsgZXhlICsgXCJcXFwiXCIpLnRoZW4oZnVuY3Rpb24oZGF0YTogc3RyaW5nKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhcGlhbnM6IElBUElbXSA9IEpTT04ucGFyc2UoZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFwaWFucy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGYgPSAwOyBmIDwgYS5sZW5ndGg7IGYrKykge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcGlhbnNbaV0udWlkID09PSBhW2ZdLnV1aWQpIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFbZl0uZmlybXdhcmUpIGFwaWFuc1tpXS5maXJtd2FyZSA9IGFbZl0uZmlybXdhcmU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYVtmXS5kYXRlcHJvZCkgYXBpYW5zW2ldLmRhdGVwcm9kID0gYVtmXS5kYXRlcHJvZDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhW2ZdLnNlcmlhbCkgYXBpYW5zW2ldLnNlcmlhbCA9IGFbZl0uc2VyaWFsO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFbZl0uYWRkcmVzcykgYXBpYW5zW2ldLmFkZHJlc3MgPSBhW2ZdLmFkZHJlc3M7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYVtmXS5wbikgYXBpYW5zW2ldLnBuID0gYVtmXS5wbjtcblxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcGlhbnNbaV0ubW9kZWwgPSBcIkF1cm9yYVwiO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBpYW5zW2ldLmFwaVZlcnNpb24gPSB0aGF0LmFwaVZlcnNpb247XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGFwaWFucyk7XG5cbiAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cblxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgICAgICAgICBleGVjKF9fZGlybmFtZSArIFwiL2F1cm9yYS5zaCAtYSBcXFwiXCIgKyBwcmVwYXJlZF9hZGRyZXNzZXMgKyBcIlxcXCIgLXQgXFxcIlwiICsgdGltZXpvbmUgKyBcIlxcXCIgLWUgXFxcIlwiICsgZXhlICsgXCJcXFwiXCIpLnRoZW4oZnVuY3Rpb24oZGF0YTogc3RyaW5nKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhcGlhbnM6IElBUElbXSA9IEpTT04ucGFyc2UoZGF0YSk7XG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFwaWFucy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwaWFuc1tpXS5tb2RlbCA9IFwiQXVyb3JhXCI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBpYW5zW2ldLmFwaVZlcnNpb24gPSB0aGF0LmFwaVZlcnNpb247XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoYXBpYW5zKTtcbiAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgfSk7XG5cblxuICAgICAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgICAgIGV4ZWMoX19kaXJuYW1lICsgXCIvYXVyb3JhLnNoIC1hIFxcXCJcIiArIHByZXBhcmVkX2FkZHJlc3NlcyArIFwiXFxcIiAtdCBcXFwiXCIgKyB0aW1lem9uZSArIFwiXFxcIiAtZSBcXFwiXCIgKyBleGUgKyBcIlxcXCJcIikudGhlbihmdW5jdGlvbihkYXRhOiBzdHJpbmcpIHtcblxuICAgICAgICAgICAgICAgICAgICBsZXQgYXBpYW5zOiBJQVBJW10gPSBKU09OLnBhcnNlKGRhdGEpO1xuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFwaWFucy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgZiA9IDA7IGYgPCBhZGRyZXNzZXNvcHRpb25zLmxlbmd0aDsgZisrKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXBpYW5zW2ldLnVpZCA9PT0gYWRkcmVzc2Vzb3B0aW9uc1tmXS51dWlkKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFkZHJlc3Nlc29wdGlvbnNbZl0uZmlybXdhcmUpIGFwaWFuc1tpXS5maXJtd2FyZSA9IGFkZHJlc3Nlc29wdGlvbnNbZl0uZmlybXdhcmU7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhZGRyZXNzZXNvcHRpb25zW2ZdLmRhdGVwcm9kKSBhcGlhbnNbaV0uZGF0ZXByb2QgPSBhZGRyZXNzZXNvcHRpb25zW2ZdLmRhdGVwcm9kO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWRkcmVzc2Vzb3B0aW9uc1tmXS5zZXJpYWwpIGFwaWFuc1tpXS5zZXJpYWwgPSBhZGRyZXNzZXNvcHRpb25zW2ZdLnNlcmlhbDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFkZHJlc3Nlc29wdGlvbnNbZl0uYWRkcmVzcykgYXBpYW5zW2ldLmFkZHJlc3MgPSBhZGRyZXNzZXNvcHRpb25zW2ZdLmFkZHJlc3M7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhZGRyZXNzZXNvcHRpb25zW2ZdLnBuKSBhcGlhbnNbaV0ucG4gPSBhZGRyZXNzZXNvcHRpb25zW2ZdLnBuO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwaWFuc1tpXS5tb2RlbCA9IFwiQXVyb3JhXCI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwaWFuc1tpXS5hcGlWZXJzaW9uID0gdGhhdC5hcGlWZXJzaW9uO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShhcGlhbnMpO1xuXG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuXG4gICAgfVxuXG4gICAgY2hlY2sodXVpZDogc3RyaW5nKSB7IC8vIGdldCBtb2RlbCwgZmlybXdhcmUsIHByb2R1Y3Rpb24gZGF0ZVxuXG5cbiAgICAgICAgaWYgKCF1dWlkKSB0aHJvdyBFcnJvcihcIm5vIHVpZCBwcm92aWRlZFwiKTtcblxuXG4gICAgICAgIGxldCBleGUgPSB0aGlzLmV4ZWM7XG5cbiAgICAgICAgbGV0IGFkZHJlc3NlcyA9IHRoaXMuYWRkcmVzc2VzO1xuXG5cblxuICAgICAgICBsZXQgY2hlY2thbnN3ZXIgPSA8SUFkZHJlc3M+eyB1dWlkOiB1dWlkIH07XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPElBZGRyZXNzPihmdW5jdGlvbihyZXNvbHZlLCByZWplY3QpIHtcblxuXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFkZHJlc3Nlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChhZGRyZXNzZXNbaV0udXVpZCA9PT0gdXVpZCkge1xuICAgICAgICAgICAgICAgICAgICBjaGVja2Fuc3dlci5odWIgPSBhZGRyZXNzZXNbaV0uaHViO1xuICAgICAgICAgICAgICAgICAgICBjaGVja2Fuc3dlci5hZGRyZXNzID0gYWRkcmVzc2VzW2ldLmFkZHJlc3M7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgIGxzdXNiZGV2KCkudGhlbihmdW5jdGlvbihkZXZpcykge1xuXG5cbiAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGRldmlzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChkZXZpc1tpXS5odWIgPT09IGNoZWNrYW5zd2VyLmh1Yikge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2thbnN3ZXIuZGV2ID0gZGV2aXNbaV0uZGV2O1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgY2hlY2tpbmcoY2hlY2thbnN3ZXIsIGV4ZSkudGhlbihmdW5jdGlvbihhKSB7XG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoYSk7XG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgIGNoZWNraW5nKGNoZWNrYW5zd2VyLCBleGUpLnRoZW4oZnVuY3Rpb24oYSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShhKTtcbiAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaGVja2luZyhjaGVja2Fuc3dlciwgZXhlKS50aGVuKGZ1bmN0aW9uKGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2tpbmcoY2hlY2thbnN3ZXIsIGV4ZSkudGhlbihmdW5jdGlvbihhKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoYSk7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24oZXJyKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGVja2Fuc3dlci5zZXJpYWwgPSBcIm5vbmVcIjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2thbnN3ZXIuZmlybXdhcmUgPSBcIm5vbmVcIjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2thbnN3ZXIuZGF0ZXByb2QgPSBcIm5vbmVcIjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2thbnN3ZXIucG4gPSBcIm5vbmVcIjtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGNoZWNrYW5zd2VyKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuXG5cbiAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoXCJlcnJycnJyMlwiKTtcblxuICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuXG4gICAgICAgICAgICB9KTtcblxuXG4gICAgICAgIH0pO1xuXG4gICAgfVxuXG5cbiAgICBjaGVja0FsbChhZGRzPzogc3RyaW5nW10pIHtcblxuICAgICAgICBsZXQgYWRkcmVzc2VzOiBJQWRkcmVzc1tdID0gW107XG4gICAgICAgIGxldCB0aGlzYWRkcmVzc2VzID0gdGhpcy5hZGRyZXNzZXM7XG4gICAgICAgIGlmIChhZGRzKSB7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXNhZGRyZXNzZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBhID0gMDsgYSA8IGFkZHMubGVuZ3RoOyBhKyspIHtcblxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpc2FkZHJlc3Nlc1tpXS51dWlkID09PSBhZGRzW2FdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhZGRyZXNzZXMucHVzaCh0aGlzYWRkcmVzc2VzW2ldKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYWRkcmVzc2VzID0gdGhpc2FkZHJlc3NlcztcbiAgICAgICAgfVxuXG5cblxuICAgICAgICBsZXQgdGhhdCA9IHRoaXM7XG5cbiAgICAgICAgbGV0IGFsbGFuc3dlcnM6IElBZGRyZXNzW10gPSBbXTtcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8SUFkZHJlc3NbXT4oZnVuY3Rpb24ocmVzb2x2ZSwgcmVqZWN0KSB7XG5cblxuICAgICAgICAgICAgYXN5bmMuZWFjaChhZGRyZXNzZXMsIGZ1bmN0aW9uKGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuXG4gICAgICAgICAgICAgICAgdGhhdC5jaGVjayhpdGVyYXRvci51dWlkKS50aGVuKGZ1bmN0aW9uKGNoa2Fuc3cpIHtcblxuICAgICAgICAgICAgICAgICAgICBhbGxhbnN3ZXJzLnB1c2goY2hrYW5zdyk7XG5cbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcblxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uKGVycikge1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZXJyXCIsIGVycik7XG5cbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzYWRkcmVzc2VzLmxlbmd0aDsgaSsrKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzYWRkcmVzc2VzW2ldLnV1aWQgPT09IGl0ZXJhdG9yLnV1aWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhbGxhbnN3ZXJzLnB1c2godGhpc2FkZHJlc3Nlc1tpXSk7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcblxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB9LCBmdW5jdGlvbihlcnIpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIE9uZSBvZiB0aGUgaXRlcmF0aW9ucyBwcm9kdWNlZCBhbiBlcnJvci5cbiAgICAgICAgICAgICAgICAgICAgLy8gQWxsIHByb2Nlc3Npbmcgd2lsbCBub3cgc3RvcC5cbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGFsbGFuc3dlcnMpO1xuXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9KTtcblxuXG5cblxuICAgICAgICB9KTtcblxuXG4gICAgfVxuXG5cbiAgICByZWNvbmZpZ3VyZShvcHQ6IHsgYWRkcmVzc2VzPzogSUFkZHJlc3NbXSwgdGltZXpvbmU/OiBzdHJpbmcsIGV4ZWM/OiBzdHJpbmcgfSkge1xuICAgICAgICBpZiAob3B0KSB7XG4gICAgICAgICAgICBpZiAob3B0LmFkZHJlc3NlcykgdGhpcy5hZGRyZXNzZXMgPSBvcHQuYWRkcmVzc2VzO1xuICAgICAgICAgICAgaWYgKG9wdC50aW1lem9uZSkgdGhpcy50aW1lem9uZSA9IG9wdC50aW1lem9uZTtcbiAgICAgICAgICAgIGlmIChvcHQuZXhlYykgdGhpcy5leGVjID0gb3B0LmV4ZWM7XG4gICAgICAgIH1cbiAgICB9XG59XG5leHBvcnQgPSBBSlNcbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
