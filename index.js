var Os = require("os");
var Promise = require("bluebird");
var async = require("async");
var lsusbdev_1 = require("lsusbdev");
var exec = require("promised-exec");
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
var default_1 = (function () {
    function default_1(addresses, timezone, exe) {
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
    default_1.prototype.alarm = function (uuid) {
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
                lsusbdev_1.default().then(function (devis) {
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
    default_1.prototype.alarms = function (adds) {
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
    default_1.prototype.data = function () {
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
    default_1.prototype.check = function (uuid) {
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
            lsusbdev_1.default().then(function (devis) {
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
    default_1.prototype.checkAll = function (adds) {
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
    default_1.prototype.reconfigure = function (opt) {
        if (opt) {
            if (opt.addresses)
                this.addresses = opt.addresses;
            if (opt.timezone)
                this.timezone = opt.timezone;
            if (opt.exec)
                this.exec = opt.exec;
        }
    };
    return default_1;
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImluZGV4LnRzIl0sIm5hbWVzIjpbImdldEFsYXJtcyIsImNoZWNraW5nIiwicHJlcGFyZV9hZGRyZXNzIiwiY29uc3RydWN0b3IiLCJhbGFybSIsImFsYXJtcyIsImRhdGEiLCJjaGVjayIsImNoZWNrQWxsIiwicmVjb25maWd1cmUiXSwibWFwcGluZ3MiOiJBQUFBLElBQVksRUFBRSxXQUFNLElBQUksQ0FBQyxDQUFBO0FBRXpCLElBQVksT0FBTyxXQUFNLFVBQVUsQ0FBQyxDQUFBO0FBQ3BDLElBQVksS0FBSyxXQUFNLE9BQU8sQ0FBQyxDQUFBO0FBRS9CLHlCQUFxQixVQUFVLENBQUMsQ0FBQTtBQUVoQyxJQUFNLElBQUksR0FBZ0MsT0FBTyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBSW5FLG1CQUFtQixHQUFXLEVBQUUsT0FBZSxFQUFFLEdBQVc7SUFDeERBLE1BQU1BLENBQUNBLElBQUlBLE9BQU9BLENBQVdBLFVBQVVBLE9BQU9BLEVBQUVBLE1BQU1BO1FBRWxELElBQUksQ0FBQyxHQUFHLEdBQUcsS0FBSyxHQUFHLE9BQU8sR0FBRyxXQUFXLEdBQUcsR0FBRyxHQUFHLDhDQUE4QyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsSUFBWTtZQUV4SCxJQUFJLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzdCLElBQUksTUFBTSxHQUFhLEVBQUUsQ0FBQztZQUMxQixHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsS0FBSyxDQUFDLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO2dCQUNwQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssVUFBVSxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDakQsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssRUFBRSxLQUFL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QVNBLENBQUNBLE1BQU1BLEVBQUVBLENBQUNBLEVBQUVBLEVBQUVBLENBQUNBO1lBQ3hDQSxFQUFFQSxDQUFDQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxJQUFJQSxLQUFLQSxJQUFJQSxDQUFDQSxDQUFDQSxDQUFDQTtnQkFDN0JBLFdBQVdBLENBQUNBLEdBQUdBLEdBQUdBLFNBQVNBLENBQUNBLENBQUNBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBO2dCQUNuQ0EsV0FBV0EsQ0FBQ0EsT0FBT0EsR0FBR0EsU0FBU0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsT0FBT0EsQ0FBQ0E7Z0JBQzNDQSxFQUFFQSxDQUFDQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQTtvQkFBQ0EsV0FBV0EsQ0FBQ0EsR0FBR0EsR0FBR0EsU0FBU0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0E7Z0JBRXpEQSxFQUFFQSxDQUFDQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxRQUFRQSxDQUFDQTtvQkFBQ0EsR0FBR0EsQ0FBQ0EsUUFBUUEsR0FBR0EsU0FBU0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsUUFBUUEsQ0FBQ0E7Z0JBQ2hFQSxFQUFFQSxDQUFDQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxRQUFRQSxDQUFDQTtvQkFBQ0EsR0FBR0EsQ0FBQ0EsUUFBUUEsR0FBR0EsU0FBU0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsUUFBUUEsQ0FBQ0E7Z0JBQ2hFQSxFQUFFQSxDQUFDQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQSxDQUFDQSxDQUFDQSxNQUFNQSxDQUFDQTtvQkFBQ0EsR0FBR0EsQ0FBQ0EsTUFBTUEsR0FBR0EsU0FBU0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0EsTUFBTUEsQ0FBQ0E7Z0JBQzFEQSxFQUFFQSxDQUFDQSxDQUFDQSxTQUFTQSxDQUFDQSxDQUFDQSxDQUFDQSxD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RyxrQkFBa0IsR0FBRyxrQkFBa0IsR0FBRyxVQUFVLEdBQUcsUUFBUSxHQUFHLFVBQVUsR0FBRyxHQUFHLEdBQUcsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsSUFBWTt3QkFFbkksSUFBSSxNQUFNLEdBQVcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQzt3QkFDdEMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLE1BQU0sQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQzs0QkFDckMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQ0FFaEMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztvQ0FFOUIsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQzt3Q0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7b0NBQ3RELEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7d0NBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO29DQUN0RCxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO3dDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztvQ0FDaEQsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMs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QkFFeEIsQ0FBQztZQUVMLENBQUMsQ0FBQyxDQUFDO1FBS1AsQ0FBQyxDQUFDQSxDQUFDQTtJQUdQQSxDQUFDQTtJQUdELCtCQUFXLEdBQVgsVUFBWSxHQUFpRTtRQUN6RUMsRUFBRUEsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsQ0FBQ0EsQ0FBQ0E7WUFDTkEsRUFBRUEsQ0FBQ0EsQ0FBQ0EsR0FBR0EsQ0FBQ0EsU0FBU0EsQ0FBQ0E7Z0JBQUNBLElBQUlBLENBQUNBLFNBQVNBLEdBQUdBLEdBQUdBLENBQUNBLFNBQVNBLENBQUNBO1lBQ2xEQSxFQUFFQSxDQUFDQSxDQUFDQSxHQUFHQSxDQUFDQSxRQUFRQSxDQUFDQTtnQkFBQ0EsSUFBSUEsQ0FBQ0EsUUFBUUEsR0FBR0EsR0FBR0EsQ0FBQ0EsUUFBUUEsQ0FBQ0E7WUFDL0NBLEVBQUVBLENBQUNBLENBQUNBLEdBQUdBLENBQUNBLElBQUlBLENBQUNBO2dCQUFDQSxJQUFJQSxDQUFDQSxJQUFJQSxHQUFHQSxHQUFHQSxDQUFDQSxJQUFJQSxDQUFDQTtRQUN2Q0EsQ0FBQ0E7SUFDTEEsQ0FBQ0E7SUFDTCxnQkFBQztBQUFELENBNWJBLEFBNGJDLElBQUE7QUE1YkQ7MkJBNGJDLENBQUEiLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBPcyBmcm9tIFwib3NcIjtcblxuaW1wb3J0ICogYXMgUHJvbWlzZSBmcm9tIFwiYmx1ZWJpcmRcIjtcbmltcG9ydCAqIGFzIGFzeW5jIGZyb20gXCJhc3luY1wiO1xuXG5pbXBvcnQgbHN1c2JkZXYgZnJvbSBcImxzdXNiZGV2XCI7XG5cbmNvbnN0IGV4ZWM6IChzdHJpbmcpID0+IFByb21pc2U8c3RyaW5nPiA9IHJlcXVpcmUoXCJwcm9taXNlZC1leGVjXCIpO1xuXG5cblxuZnVuY3Rpb24gZ2V0QWxhcm1zKGNtZDogc3RyaW5nLCBhZGRyZXNzOiBudW1iZXIsIGRldjogc3RyaW5nKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPElhbGFybVtdPihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cbiAgICAgICAgZXhlYyhjbWQgKyBcIiAtYVwiICsgYWRkcmVzcyArIFwiIC1BIC1ZMjAgXCIgKyBkZXYgKyBcIiB8IGN1dCAtZDogLWYyLSB8IHNlZCAncy8gICAgICAgICAgICAgICAvL2cnXCIpLnRoZW4oZnVuY3Rpb24gKGRhdGE6IHN0cmluZykge1xuXG4gICAgICAgICAgICBsZXQgbGluZXMgPSBkYXRhLnNwbGl0KFwiXFxuXCIpO1xuICAgICAgICAgICAgbGV0IGFsYXJtcyA9IDxJYWxhcm1bXT5bXTtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBpZiAobGluZXNbaV0gIT09IFwiTm8gQWxhcm1cIiAmJiBsaW5lc1tpXS5sZW5ndGggPiAzKSB7XG4gICAgICAgICAgICAgICAgICAgIGFsYXJtcy5wdXNoKHsgYWxhcm06IGxpbmVzW2ldIH0pO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuIGFsYXJtcztcblxuICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuXG59XG5cblxuZnVuY3Rpb24gY2hlY2tpbmcoY2hlY2thbnN3ZXIsIGV4ZSkge1xuXG4gICAgbGV0IGNtZCA9IGV4ZSArIFwiIC1hIFwiICsgY2hlY2thbnN3ZXIuYWRkcmVzcyArIFwiIC1ZIDIwIC1uIC1mIC1nIC1wIFwiICsgY2hlY2thbnN3ZXIuZGV2O1xuXG4gICAgcmV0dXJuIG5ldyBQcm9taXNlPElBZGRyZXNzPihmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG5cblxuICAgICAgICBleGVjKGNtZCkudGhlbihmdW5jdGlvbiAoZGF0YSkgeyAvLyBmaXJtd2FyZVxuICAgICAgICAgICAgbGV0IGxpbmVzID0gZGF0YS5zcGxpdChcIlxcblwiKTtcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgbGluZXMubGVuZ3RoOyBpKyspIHtcblxuICAgICAgICAgICAgICAgIGlmIChsaW5lc1tpXS5zcGxpdChcImVyaWFsIE51bWJlcjpcIikubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAobGluZXNbaV0uc3BsaXQoXCJlcmlhbCBOdW1iZXI6IFwiKVsxXS5sZW5ndGggPiAxKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGNoZWNrYW5zd2VyLnNlcmlhbCA9IGxpbmVzW2ldLnNwbGl0KFwiZXJpYWwgTnVtYmVyOiBcIilbMV07XG5cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoZWNrYW5zd2VyLnNlcmlhbCA9IFwibm9uZVwiO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgICAgICBpZiAobGluZXNbaV0uc3BsaXQoXCJhcnQgTnVtYmVyOlwiKS5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChsaW5lc1tpXS5zcGxpdChcImFydCBOdW1iZXI6IFwiKVsxXS5sZW5ndGggPiAxKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIGNoZWNrYW5zd2VyLnBuID0gbGluZXNbaV0uc3BsaXQoXCJhcnQgTnVtYmVyOiBcIilbMV07XG5cbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoZWNrYW5zd2VyLnBuID0gXCJub25lXCI7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG5cblxuXG4gICAgICAgICAgICAgICAgaWYgKGxpbmVzW2ldLnNwbGl0KFwiaXJtd2FyZTpcIikubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgICAgICBpZiAobGluZXNbaV0uc3BsaXQoXCJpcm13YXJlOiBcIilbMV0ubGVuZ3RoID4gMSkge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBjaGVja2Fuc3dlci5maXJtd2FyZSA9IGxpbmVzW2ldLnNwbGl0KFwiaXJtd2FyZTogXCIpWzFdO1xuXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaGVja2Fuc3dlci5maXJtd2FyZSA9IFwibm9uZVwiO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGlmIChsaW5lc1tpXS5zcGxpdChcImFudWZhY3R1cmluZyBEYXRlOlwiKS5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmIChsaW5lc1tpXS5zcGxpdChcImFudWZhY3R1cmluZyBEYXRlOiBcIilbMV0ubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2thbnN3ZXIuZGF0ZXByb2QgPSBsaW5lc1tpXS5zcGxpdChcImFudWZhY3R1cmluZyBEYXRlOiBcIilbMV07XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjaGVja2Fuc3dlci5kYXRlcHJvZCA9IFwibm9uZVwiO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9XG5cblxuXG4gICAgICAgICAgICBpZiAoY2hlY2thbnN3ZXIuc2VyaWFsICYmIGNoZWNrYW5zd2VyLmZpcm13YXJlICYmIGNoZWNrYW5zd2VyLmRhdGVwcm9kKSB7XG4gICAgICAgICAgICAgICAgcmVzb2x2ZShjaGVja2Fuc3dlcik7XG5cbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVqZWN0KFwibWFsZm9ybWVkIGFuc3dlclwiKTtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gICBjaGVja2Fuc3dlci5maXJtd2FyZSA9IGRhdGE7XG5cbiAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgIH0pO1xuXG5cblxuICAgIH0pO1xuXG59XG5cblxuXG5mdW5jdGlvbiBwcmVwYXJlX2FkZHJlc3MoYWRkcmVzc2VzOiBJQWRkcmVzc1tdKSB7XG4gICAgbGV0IHJlYWRkciA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYWRkcmVzc2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHJlYWRkcltpXSA9IHsgdXVpZDogYWRkcmVzc2VzW2ldLnV1aWQsIGRldjogYWRkcmVzc2VzW2ldLmh1YiwgYWRkcmVzczogYWRkcmVzc2VzW2ldLmFkZHJlc3MgfTtcblxuICAgIH1cbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkocmVhZGRyKTtcbn1cblxuXG5cbmludGVyZmFjZSBJc3RyaW5nIHtcbiAgICB2b2x0YWdlOiBudW1iZXI7XG4gICAgY3VycmVudDogbnVtYmVyO1xuICAgIHBvd2VyOiBudW1iZXI7XG59XG5cbmludGVyZmFjZSBJYWxhcm0ge1xuICAgIGFsYXJtOiBzdHJpbmc7XG59XG5cbmludGVyZmFjZSBJQWxhcm0ge1xuXG4gICAgYWxhcm1zOiBJYWxhcm1bXTtcbiAgICBmaXJtd2FyZTogc3RyaW5nO1xuICAgIGRhdGVwcm9kOiBzdHJpbmc7XG4gICAgc2VyaWFsOiBzdHJpbmc7XG4gICAgcG46IHN0cmluZztcbiAgICBhZGRyZXNzOiBudW1iZXI7XG4gICAgbW9kZWw6IHN0cmluZztcbiAgICBhcGlWZXJzaW9uOiBzdHJpbmc7XG4gICAgY3JlYXRlZEF0OiBudW1iZXI7XG5cbn1cblxuaW50ZXJmYWNlIElBUEkge1xuXG4gICAgX2lkOiBzdHJpbmc7XG4gICAgdWlkOiBzdHJpbmc7XG4gICAgYm9vdElkOiBzdHJpbmc7XG4gICAgYm9vdFRpbWU6IG51bWJlcjtcbiAgICBhY3RpdmU6IGJvb2xlYW47XG4gICAgdXBkYXRlZEF0OiBudW1iZXI7XG4gICAgZGF0ZTogc3RyaW5nO1xuICAgIHN0cmluZ3M6IElzdHJpbmdbXTtcbiAgICBncmlkOiB7XG4gICAgICAgIHZvbHRhZ2U6IG51bWJlcjtcbiAgICAgICAgY3VycmVudDogbnVtYmVyO1xuICAgICAgICBwb3dlcjogbnVtYmVyO1xuICAgICAgICBoejogbnVtYmVyO1xuICAgIH07XG4gICAgRGNBY0N2ckVmZjogbnVtYmVyO1xuICAgIGludlRlbXA6IG51bWJlcjtcbiAgICBlbnZUZW1wOiBudW1iZXI7XG4gICAgZGFpbHlFbmVyZ3k6IG51bWJlcjtcbiAgICB3ZWVrbHlFbmVyZ3k6IG51bWJlcjtcbiAgICBsYXN0N0RheXNFbmVyZ3k6IG51bWJlcjtcbiAgICBtb250aGx5RW5lcmd5OiBudW1iZXI7XG4gICAgeWVhcmx5RW5lcmd5OiBudW1iZXI7XG4gICAgdG90YWxFbmVyZ3k6IG51bWJlcjtcbiAgICBwYXJ0aWFsRW5lcmd5OiBudW1iZXI7XG4gICAgYnVsa1Y6IG51bWJlcjtcbiAgICBidWxrTVY6IG51bWJlcjtcbiAgICBidWxrREM6IG51bWJlcjtcbiAgICBpc29SZXM6IG51bWJlcjtcbiAgICBncmlkVkRDOiBudW1iZXI7XG4gICAgZ3JpZEF2Z1Y6IG51bWJlcjtcbiAgICBncmlkRENIejogbnVtYmVyO1xuICAgIHBlYWtNYXg6IG51bWJlcjtcbiAgICBwZWFrRGF5OiBudW1iZXI7XG4gICAgcGluMVc6IG51bWJlcjtcbiAgICBwaW4yVzogbnVtYmVyO1xuXG4gICAgZmlybXdhcmU6IHN0cmluZztcbiAgICBkYXRlcHJvZDogc3RyaW5nO1xuICAgIHNlcmlhbDogc3RyaW5nO1xuICAgIHBuOiBzdHJpbmc7XG4gICAgYWRkcmVzczogbnVtYmVyO1xuICAgIG1vZGVsOiBzdHJpbmc7XG4gICAgYXBpVmVyc2lvbjogc3RyaW5nO1xufVxuXG5cblxuaW50ZXJmYWNlIElBZGRyZXNzIHtcbiAgICB1dWlkOiBzdHJpbmc7XG4gICAgZGV2Pzogc3RyaW5nO1xuICAgIGFkZHJlc3M6IG51bWJlcjtcbiAgICBodWI/OiBzdHJpbmc7XG4gICAgZmlybXdhcmU/OiBzdHJpbmc7XG4gICAgZGF0ZXByb2Q/OiBzdHJpbmc7XG4gICAgcG4/OiBzdHJpbmc7XG4gICAgc2VyaWFsPzogc3RyaW5nO1xuICAgIG1vZGVsPzogc3RyaW5nO1xuICAgIGFwaVZlcnNpb24/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBkZWZhdWx0IGNsYXNzIHtcbiAgICBhZGRyZXNzZXM6IElBZGRyZXNzW107XG4gICAgdGltZXpvbmU6IHN0cmluZztcbiAgICBleGVjOiBzdHJpbmc7XG4gICAgYXBpVmVyc2lvbjogc3RyaW5nO1xuICAgIGNvbnN0cnVjdG9yKGFkZHJlc3NlczogSUFkZHJlc3NbXSwgdGltZXpvbmU6IHN0cmluZywgZXhlPzogc3RyaW5nKSB7XG4gICAgICAgIHRoaXMuYXBpVmVyc2lvbiA9IHJlcXVpcmUoX19kaXJuYW1lICsgXCIvcGFja2FnZS5qc29uXCIpLnZlcnNpb247XG4gICAgICAgIHRoaXMuYWRkcmVzc2VzID0gYWRkcmVzc2VzO1xuICAgICAgICB0aGlzLnRpbWV6b25lID0gdGltZXpvbmU7XG4gICAgICAgIGxldCBjbWQ6IHN0cmluZztcbiAgICAgICAgaWYgKGV4ZSkge1xuICAgICAgICAgICAgY21kID0gZXhlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaWYgKE9zLmFyY2goKSA9PT0gXCJhcm1cIikge1xuICAgICAgICAgICAgICAgIGNtZCA9IF9fZGlybmFtZSArIFwiL2Jpbi9yYXNwMi9hdXJvcmEuYmluXCI7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKE9zLmFyY2goKSA9PT0gXCJ4NjRcIikge1xuICAgICAgICAgICAgICAgIGNtZCA9IF9fZGlybmFtZSArIFwiL2Jpbi94NjQvYXVyb3JhLmJpblwiO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChPcy5hcmNoKCkgPT09IFwiaWEzMlwiKSB7XG4gICAgICAgICAgICAgICAgY21kID0gX19kaXJuYW1lICsgXCIvYmluL2lhMzIvYXVyb3JhLmJpblwiO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBjbWQgPSBcImF1cm9yYVwiO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgdGhpcy5leGVjID0gY21kO1xuICAgIH1cblxuICAgIGFsYXJtKHV1aWQ6IHN0cmluZykge1xuICAgICAgICBsZXQgZXhlID0gdGhpcy5leGVjO1xuICAgICAgICBsZXQgdGltZXpvbmUgPSB0aGlzLnRpbWV6b25lO1xuICAgICAgICBsZXQgY2hlY2thbnN3ZXIgPSA8SUFkZHJlc3M+eyB1dWlkOiB1dWlkIH07XG4gICAgICAgIGxldCBhZGRyZXNzZXMgPSB0aGlzLmFkZHJlc3NlcztcbiAgICAgICAgbGV0IGFwaVZlcnNpb24gPSB0aGlzLmFwaVZlcnNpb247XG5cblxuICAgICAgICBsZXQgYWxhID0gPElBbGFybT57XG4gICAgICAgICAgICBtb2RlbDogXCJBdXJvcmFcIixcbiAgICAgICAgICAgIGFwaVZlcnNpb246IGFwaVZlcnNpb24sXG4gICAgICAgICAgICBjcmVhdGVkQXQ6IG5ldyBEYXRlKCkuZ2V0VGltZSgpXG4gICAgICAgIH07XG5cblxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFkZHJlc3Nlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgaWYgKGFkZHJlc3Nlc1tpXS51dWlkID09PSB1dWlkKSB7XG4gICAgICAgICAgICAgICAgY2hlY2thbnN3ZXIuaHViID0gYWRkcmVzc2VzW2ldLmh1YjtcbiAgICAgICAgICAgICAgICBjaGVja2Fuc3dlci5hZGRyZXNzID0gYWRkcmVzc2VzW2ldLmFkZHJlc3M7XG4gICAgICAgICAgICAgICAgaWYgKGFkZHJlc3Nlc1tpXS5kZXYpIGNoZWNrYW5zd2VyLmRldiA9IGFkZHJlc3Nlc1tpXS5kZXY7XG5cbiAgICAgICAgICAgICAgICBpZiAoYWRkcmVzc2VzW2ldLmZpcm13YXJlKSBhbGEuZmlybXdhcmUgPSBhZGRyZXNzZXNbaV0uZmlybXdhcmU7XG4gICAgICAgICAgICAgICAgaWYgKGFkZHJlc3Nlc1tpXS5kYXRlcHJvZCkgYWxhLmRhdGVwcm9kID0gYWRkcmVzc2VzW2ldLmRhdGVwcm9kO1xuICAgICAgICAgICAgICAgIGlmIChhZGRyZXNzZXNbaV0uc2VyaWFsKSBhbGEuc2VyaWFsID0gYWRkcmVzc2VzW2ldLnNlcmlhbDtcbiAgICAgICAgICAgICAgICBpZiAoYWRkcmVzc2VzW2ldLmFkZHJlc3MpIGFsYS5hZGRyZXNzID0gYWRkcmVzc2VzW2ldLmFkZHJlc3M7XG4gICAgICAgICAgICAgICAgaWYgKGFkZHJlc3Nlc1tpXS5wbikgYWxhLnBuID0gYWRkcmVzc2VzW2ldLnBuO1xuXG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPElBbGFybT4oZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuICAgICAgICAgICAgaWYgKCFjaGVja2Fuc3dlci5kZXYpIHtcblxuXG4gICAgICAgICAgICAgICAgbHN1c2JkZXYoKS50aGVuKGZ1bmN0aW9uIChkZXZpcykge1xuXG5cbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkZXZpcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGRldmlzW2ldLmh1YiA9PT0gY2hlY2thbnN3ZXIuaHViKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2thbnN3ZXIuZGV2ID0gZGV2aXNbaV0uZGV2O1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cblxuICAgICAgICAgICAgICAgICAgICBnZXRBbGFybXMoZXhlLCBjaGVja2Fuc3dlci5hZGRyZXNzLCBjaGVja2Fuc3dlci5kZXYpLnRoZW4oZnVuY3Rpb24gKGFsYXJtcykge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBhbGEuYWxhcm1zID0gYWxhcm1zO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShhbGEpO1xuICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiZXJycnJycjJcIik7XG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cblxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcImVycnJycnIyXCIpO1xuXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cblxuICAgIGFsYXJtcyhhZGRzPzogc3RyaW5nW10pIHtcblxuICAgICAgICBsZXQgYWRkcmVzc2VzOiBJQWRkcmVzc1tdID0gW107XG4gICAgICAgIGxldCB0aGlzYWRkcmVzc2VzID0gdGhpcy5hZGRyZXNzZXM7XG4gICAgICAgIGlmIChhZGRzKSB7XG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXNhZGRyZXNzZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBmb3IgKGxldCBhID0gMDsgYSA8IGFkZHMubGVuZ3RoOyBhKyspIHtcblxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpc2FkZHJlc3Nlc1tpXS51dWlkID09PSBhZGRzW2FdKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBhZGRyZXNzZXMucHVzaCh0aGlzYWRkcmVzc2VzW2ldKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgYWRkcmVzc2VzID0gdGhpc2FkZHJlc3NlcztcbiAgICAgICAgfVxuXG5cblxuXG4gICAgICAgIGxldCB0aGF0ID0gdGhpcztcblxuICAgICAgICBsZXQgYWxsYW5zd2VyczogSUFsYXJtW10gPSBbXTtcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8SUFsYXJtW10+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblxuXG4gICAgICAgICAgICBhc3luYy5lYWNoKGFkZHJlc3NlcywgZnVuY3Rpb24gKGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuXG4gICAgICAgICAgICAgICAgdGhhdC5hbGFybShpdGVyYXRvci51dWlkKS50aGVuKGZ1bmN0aW9uIChhbGEpIHtcblxuICAgICAgICAgICAgICAgICAgICBhbGxhbnN3ZXJzLnB1c2goYWxhKTtcblxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuXG4gICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKGVycikge1xuXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZXJyXCIsIGVycik7XG5cbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soKTtcblxuICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgaWYgKGVycikge1xuICAgICAgICAgICAgICAgICAgICAvLyBPbmUgb2YgdGhlIGl0ZXJhdGlvbnMgcHJvZHVjZWQgYW4gZXJyb3IuXG4gICAgICAgICAgICAgICAgICAgIC8vIEFsbCBwcm9jZXNzaW5nIHdpbGwgbm93IHN0b3AuXG4gICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG5cbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShhbGxhbnN3ZXJzKTtcblxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgfSk7XG5cblxuXG5cbiAgICAgICAgfSk7XG5cblxuXG5cblxuICAgIH1cblxuXG4gICAgZGF0YSgpIHtcblxuICAgICAgICBsZXQgZXhlID0gdGhpcy5leGVjO1xuICAgICAgICBsZXQgdGltZXpvbmUgPSB0aGlzLnRpbWV6b25lO1xuXG4gICAgICAgIGxldCBhZGRyZXNzZXNvcHRpb25zID0gdGhpcy5hZGRyZXNzZXM7XG5cbiAgICAgICAgbGV0IHByZXBhcmVkX2FkZHJlc3NlcyA9IHByZXBhcmVfYWRkcmVzcyhhZGRyZXNzZXNvcHRpb25zKTtcblxuICAgICAgICBsZXQgdGhhdCA9IHRoaXM7XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPElBUElbXT4oZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xuXG4gICAgICAgICAgICBsZXQgY2hlY2ttb2RlbCA9IFtdO1xuXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFkZHJlc3Nlc29wdGlvbnMubGVuZ3RoOyBpKyspIHtcblxuICAgICAgICAgICAgICAgIGlmICghYWRkcmVzc2Vzb3B0aW9uc1tpXS5zZXJpYWwgfHwgYWRkcmVzc2Vzb3B0aW9uc1tpXS5zZXJpYWwgPT09IFwibm9uZVwiIHx8ICFhZGRyZXNzZXNvcHRpb25zW2ldLnBuIHx8IGFkZHJlc3Nlc29wdGlvbnNbaV0ucG4gPT09IFwibm9uZVwiIHx8ICFhZGRyZXNzZXNvcHRpb25zW2ldLmZpcm13YXJlIHx8IGFkZHJlc3Nlc29wdGlvbnNbaV0uZmlybXdhcmUgPT09IFwibm9uZVwiIHx8ICFhZGRyZXNzZXNvcHRpb25zW2ldLmRhdGVwcm9kIHx8IGFkZHJlc3Nlc29wdGlvbnNbaV0uZGF0ZXByb2QgPT09IFwibm9uZVwiKSB7XG4gICAgICAgICAgICAgICAgICAgIGNoZWNrbW9kZWwucHVzaChhZGRyZXNzZXNvcHRpb25zW2ldLnV1aWQpO1xuXG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgIGlmIChjaGVja21vZGVsLmxlbmd0aCA+IDApIHtcblxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiY2hlY2tpbmcgdmVyc2lvbnNcIik7XG5cbiAgICAgICAgICAgICAgICB0aGF0LmNoZWNrQWxsKGNoZWNrbW9kZWwpLnRoZW4oZnVuY3Rpb24gKGEpIHtcblxuXG4gICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYS5sZW5ndGg7IGkrKykge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYVtpXS5zZXJpYWwgJiYgYVtpXS5zZXJpYWwgIT09IFwibm9uZVwiICYmIGFbaV0ucG4gJiYgYVtpXS5wbiAhPT0gXCJub25lXCIgJiYgYVtpXS5maXJtd2FyZSAmJiBhW2ldLmZpcm13YXJlICE9PSBcIm5vbmVcIiAmJiBhW2ldLmRhdGVwcm9kICYmIGFbaV0uZGF0ZXByb2QgIT09IFwibm9uZVwiKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBhZGQgPSAwOyBhZGQgPCB0aGF0LmFkZHJlc3Nlcy5sZW5ndGg7IGFkZCsrKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoYXQuYWRkcmVzc2VzW2FkZF0udXVpZCA9PT0gYVtpXS51dWlkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGF0LmFkZHJlc3Nlc1thZGRdID0gYVtpXTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgZXhlYyhfX2Rpcm5hbWUgKyBcIi9hdXJvcmEuc2ggLWEgXFxcIlwiICsgcHJlcGFyZWRfYWRkcmVzc2VzICsgXCJcXFwiIC10IFxcXCJcIiArIHRpbWV6b25lICsgXCJcXFwiIC1lIFxcXCJcIiArIGV4ZSArIFwiXFxcIlwiKS50aGVuKGZ1bmN0aW9uIChkYXRhOiBzdHJpbmcpIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFwaWFuczogSUFQSVtdID0gSlNPTi5wYXJzZShkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXBpYW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgZiA9IDA7IGYgPCBhLmxlbmd0aDsgZisrKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFwaWFuc1tpXS51aWQgPT09IGFbZl0udXVpZCkge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYVtmXS5maXJtd2FyZSkgYXBpYW5zW2ldLmZpcm13YXJlID0gYVtmXS5maXJtd2FyZTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhW2ZdLmRhdGVwcm9kKSBhcGlhbnNbaV0uZGF0ZXByb2QgPSBhW2ZdLmRhdGVwcm9kO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFbZl0uc2VyaWFsKSBhcGlhbnNbaV0uc2VyaWFsID0gYVtmXS5zZXJpYWw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYVtmXS5hZGRyZXNzKSBhcGlhbnNbaV0uYWRkcmVzcyA9IGFbZl0uYWRkcmVzcztcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhW2ZdLnBuKSBhcGlhbnNbaV0ucG4gPSBhW2ZdLnBuO1xuXG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFwaWFuc1tpXS5tb2RlbCA9IFwiQXVyb3JhXCI7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcGlhbnNbaV0uYXBpVmVyc2lvbiA9IHRoYXQuYXBpVmVyc2lvbjtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoYXBpYW5zKTtcblxuICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuXG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgfSk7XG5cblxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgZXhlYyhfX2Rpcm5hbWUgKyBcIi9hdXJvcmEuc2ggLWEgXFxcIlwiICsgcHJlcGFyZWRfYWRkcmVzc2VzICsgXCJcXFwiIC10IFxcXCJcIiArIHRpbWV6b25lICsgXCJcXFwiIC1lIFxcXCJcIiArIGV4ZSArIFwiXFxcIlwiKS50aGVuKGZ1bmN0aW9uIChkYXRhOiBzdHJpbmcpIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFwaWFuczogSUFQSVtdID0gSlNPTi5wYXJzZShkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYXBpYW5zLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYXBpYW5zW2ldLm1vZGVsID0gXCJBdXJvcmFcIjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcGlhbnNbaV0uYXBpVmVyc2lvbiA9IHRoYXQuYXBpVmVyc2lvbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShhcGlhbnMpO1xuICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhlcnIpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgICAgICAgfSk7XG5cblxuICAgICAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgICAgIGV4ZWMoX19kaXJuYW1lICsgXCIvYXVyb3JhLnNoIC1hIFxcXCJcIiArIHByZXBhcmVkX2FkZHJlc3NlcyArIFwiXFxcIiAtdCBcXFwiXCIgKyB0aW1lem9uZSArIFwiXFxcIiAtZSBcXFwiXCIgKyBleGUgKyBcIlxcXCJcIikudGhlbihmdW5jdGlvbiAoZGF0YTogc3RyaW5nKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgbGV0IGFwaWFuczogSUFQSVtdID0gSlNPTi5wYXJzZShkYXRhKTtcbiAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBhcGlhbnMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGYgPSAwOyBmIDwgYWRkcmVzc2Vzb3B0aW9ucy5sZW5ndGg7IGYrKykge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFwaWFuc1tpXS51aWQgPT09IGFkZHJlc3Nlc29wdGlvbnNbZl0udXVpZCkge1xuXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhZGRyZXNzZXNvcHRpb25zW2ZdLmZpcm13YXJlKSBhcGlhbnNbaV0uZmlybXdhcmUgPSBhZGRyZXNzZXNvcHRpb25zW2ZdLmZpcm13YXJlO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWRkcmVzc2Vzb3B0aW9uc1tmXS5kYXRlcHJvZCkgYXBpYW5zW2ldLmRhdGVwcm9kID0gYWRkcmVzc2Vzb3B0aW9uc1tmXS5kYXRlcHJvZDtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFkZHJlc3Nlc29wdGlvbnNbZl0uc2VyaWFsKSBhcGlhbnNbaV0uc2VyaWFsID0gYWRkcmVzc2Vzb3B0aW9uc1tmXS5zZXJpYWw7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhZGRyZXNzZXNvcHRpb25zW2ZdLmFkZHJlc3MpIGFwaWFuc1tpXS5hZGRyZXNzID0gYWRkcmVzc2Vzb3B0aW9uc1tmXS5hZGRyZXNzO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYWRkcmVzc2Vzb3B0aW9uc1tmXS5wbikgYXBpYW5zW2ldLnBuID0gYWRkcmVzc2Vzb3B0aW9uc1tmXS5wbjtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcGlhbnNbaV0ubW9kZWwgPSBcIkF1cm9yYVwiO1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhcGlhbnNbaV0uYXBpVmVyc2lvbiA9IHRoYXQuYXBpVmVyc2lvbjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoYXBpYW5zKTtcblxuICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICB9XG5cbiAgICBjaGVjayh1dWlkOiBzdHJpbmcpIHsgLy8gZ2V0IG1vZGVsLCBmaXJtd2FyZSwgcHJvZHVjdGlvbiBkYXRlXG5cblxuICAgICAgICBpZiAoIXV1aWQpIHRocm93IEVycm9yKFwibm8gdWlkIHByb3ZpZGVkXCIpO1xuXG5cbiAgICAgICAgbGV0IGV4ZSA9IHRoaXMuZXhlYztcblxuICAgICAgICBsZXQgYWRkcmVzc2VzID0gdGhpcy5hZGRyZXNzZXM7XG5cblxuXG4gICAgICAgIGxldCBjaGVja2Fuc3dlciA9IDxJQWRkcmVzcz57IHV1aWQ6IHV1aWQgfTtcblxuICAgICAgICByZXR1cm4gbmV3IFByb21pc2U8SUFkZHJlc3M+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblxuXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGFkZHJlc3Nlcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgIGlmIChhZGRyZXNzZXNbaV0udXVpZCA9PT0gdXVpZCkge1xuICAgICAgICAgICAgICAgICAgICBjaGVja2Fuc3dlci5odWIgPSBhZGRyZXNzZXNbaV0uaHViO1xuICAgICAgICAgICAgICAgICAgICBjaGVja2Fuc3dlci5hZGRyZXNzID0gYWRkcmVzc2VzW2ldLmFkZHJlc3M7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG5cbiAgICAgICAgICAgIGxzdXNiZGV2KCkudGhlbihmdW5jdGlvbiAoZGV2aXMpIHtcblxuXG4gICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkZXZpcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZGV2aXNbaV0uaHViID09PSBjaGVja2Fuc3dlci5odWIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoZWNrYW5zd2VyLmRldiA9IGRldmlzW2ldLmRldjtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIGNoZWNraW5nKGNoZWNrYW5zd2VyLCBleGUpLnRoZW4oZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShhKTtcbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGNoZWNraW5nKGNoZWNrYW5zd2VyLCBleGUpLnRoZW4oZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlc29sdmUoYSk7XG4gICAgICAgICAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGNoZWNraW5nKGNoZWNrYW5zd2VyLCBleGUpLnRoZW4oZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGEpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSkuY2F0Y2goZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNoZWNraW5nKGNoZWNrYW5zd2VyLCBleGUpLnRoZW4oZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmVzb2x2ZShhKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coZXJyKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjaGVja2Fuc3dlci5zZXJpYWwgPSBcIm5vbmVcIjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2thbnN3ZXIuZmlybXdhcmUgPSBcIm5vbmVcIjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2thbnN3ZXIuZGF0ZXByb2QgPSBcIm5vbmVcIjtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2hlY2thbnN3ZXIucG4gPSBcIm5vbmVcIjtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGNoZWNrYW5zd2VyKTtcblxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0pO1xuXG5cbiAgICAgICAgICAgIH0pLmNhdGNoKGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKFwiZXJycnJycjJcIik7XG5cbiAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcblxuICAgICAgICAgICAgfSk7XG5cblxuICAgICAgICB9KTtcblxuICAgIH1cblxuXG4gICAgY2hlY2tBbGwoYWRkcz86IHN0cmluZ1tdKSB7XG5cbiAgICAgICAgbGV0IGFkZHJlc3NlczogSUFkZHJlc3NbXSA9IFtdO1xuICAgICAgICBsZXQgdGhpc2FkZHJlc3NlcyA9IHRoaXMuYWRkcmVzc2VzO1xuICAgICAgICBpZiAoYWRkcykge1xuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzYWRkcmVzc2VzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgZm9yIChsZXQgYSA9IDA7IGEgPCBhZGRzLmxlbmd0aDsgYSsrKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXNhZGRyZXNzZXNbaV0udXVpZCA9PT0gYWRkc1thXSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYWRkcmVzc2VzLnB1c2godGhpc2FkZHJlc3Nlc1tpXSk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGFkZHJlc3NlcyA9IHRoaXNhZGRyZXNzZXM7XG4gICAgICAgIH1cblxuXG5cbiAgICAgICAgbGV0IHRoYXQgPSB0aGlzO1xuXG4gICAgICAgIGxldCBhbGxhbnN3ZXJzOiBJQWRkcmVzc1tdID0gW107XG5cbiAgICAgICAgcmV0dXJuIG5ldyBQcm9taXNlPElBZGRyZXNzW10+KGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcblxuXG4gICAgICAgICAgICBhc3luYy5lYWNoKGFkZHJlc3NlcywgZnVuY3Rpb24gKGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuXG4gICAgICAgICAgICAgICAgdGhhdC5jaGVjayhpdGVyYXRvci51dWlkKS50aGVuKGZ1bmN0aW9uIChjaGthbnN3KSB7XG5cbiAgICAgICAgICAgICAgICAgICAgYWxsYW5zd2Vycy5wdXNoKGNoa2Fuc3cpO1xuXG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKCk7XG5cbiAgICAgICAgICAgICAgICB9KS5jYXRjaChmdW5jdGlvbiAoZXJyKSB7XG5cbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJlcnJcIiwgZXJyKTtcblxuICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXNhZGRyZXNzZXMubGVuZ3RoOyBpKyspIHtcblxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXNhZGRyZXNzZXNbaV0udXVpZCA9PT0gaXRlcmF0b3IudXVpZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGFsbGFuc3dlcnMucHVzaCh0aGlzYWRkcmVzc2VzW2ldKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuXG4gICAgICAgICAgICAgICAgfSk7XG5cbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIC8vIE9uZSBvZiB0aGUgaXRlcmF0aW9ucyBwcm9kdWNlZCBhbiBlcnJvci5cbiAgICAgICAgICAgICAgICAgICAgLy8gQWxsIHByb2Nlc3Npbmcgd2lsbCBub3cgc3RvcC5cbiAgICAgICAgICAgICAgICAgICAgcmVqZWN0KGVycik7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgICAgICAgICByZXNvbHZlKGFsbGFuc3dlcnMpO1xuXG4gICAgICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICB9KTtcblxuXG5cblxuICAgICAgICB9KTtcblxuXG4gICAgfVxuXG5cbiAgICByZWNvbmZpZ3VyZShvcHQ6IHsgYWRkcmVzc2VzPzogSUFkZHJlc3NbXSwgdGltZXpvbmU/OiBzdHJpbmcsIGV4ZWM/OiBzdHJpbmcgfSkge1xuICAgICAgICBpZiAob3B0KSB7XG4gICAgICAgICAgICBpZiAob3B0LmFkZHJlc3NlcykgdGhpcy5hZGRyZXNzZXMgPSBvcHQuYWRkcmVzc2VzO1xuICAgICAgICAgICAgaWYgKG9wdC50aW1lem9uZSkgdGhpcy50aW1lem9uZSA9IG9wdC50aW1lem9uZTtcbiAgICAgICAgICAgIGlmIChvcHQuZXhlYykgdGhpcy5leGVjID0gb3B0LmV4ZWM7XG4gICAgICAgIH1cbiAgICB9XG59XG5cbiJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
