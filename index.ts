let exec = require("promised-exec");
import * as Promise from "bluebird";
import * as Os from "os";
import lsusbdev = require("lsusbdev");
import async = require("async");



function getAlarms(cmd: string, address: number, dev: string) {
    return new Promise<Ialarm[]>(function(resolve, reject) {

        exec(cmd + " -a" + address + " -A -Y20 " + dev + " | cut -d: -f2- | sed 's/               //g'").then(function(data: string) {

            let lines = data.split("\n");
            let alarms = <Ialarm[]>[];
            for (let i = 0; i < lines.length; i++) {
                if (lines[i] !== "No Alarm" && lines[i].length > 3) {
                    alarms.push({ alarm: lines[i] });
                }
            }

            return alarms;

        }).catch(function(err) {
            console.log(err);
            reject(err);
        });
    });

}


function checking(checkanswer, exe) {

    let cmd = exe + " -a " + checkanswer.address + " -Y 20 -n -f -g -p " + checkanswer.dev;

    return new Promise<IAddress>(function(resolve, reject) {


        exec(cmd).then(function(data) { // firmware
            let lines = data.split("\n");
            for (let i = 0; i < lines.length; i++) {

                if (lines[i].split("erial Number:").length > 1) {
                    if (lines[i].split("erial Number: ")[1].length > 1) {

                        checkanswer.serial = lines[i].split("erial Number: ")[1];

                    } else {
                        checkanswer.serial = "none";
                    }
                }


                if (lines[i].split("art Number:").length > 1) {
                    if (lines[i].split("art Number: ")[1].length > 1) {

                        checkanswer.pn = lines[i].split("art Number: ")[1];

                    } else {
                        checkanswer.pn = "none";
                    }
                }



                if (lines[i].split("irmware:").length > 1) {
                    if (lines[i].split("irmware: ")[1].length > 1) {

                        checkanswer.firmware = lines[i].split("irmware: ")[1];

                    } else {
                        checkanswer.firmware = "none";
                    }
                }
                if (lines[i].split("anufacturing Date:").length > 1) {
                    if (lines[i].split("anufacturing Date: ")[1].length > 1) {
                        checkanswer.dateprod = lines[i].split("anufacturing Date: ")[1];
                    } else {
                        checkanswer.dateprod = "none";
                    }
                }

            }



            if (checkanswer.serial && checkanswer.firmware && checkanswer.dateprod) {
                resolve(checkanswer);

            } else {
                reject("malformed answer");
            }

            //   checkanswer.firmware = data;

        }).catch(function(err) {
            reject(err);
        });



    });

}



function prepare_address(addresses: IAddress[]) {
    let readdr = [];
    for (let i = 0; i < addresses.length; i++) {
        readdr[i] = { uuid: addresses[i].uuid, dev: addresses[i].hub, address: addresses[i].address };

    }
    return JSON.stringify(readdr);
}



interface Istring {
    voltage: number;
    current: number;
    power: number;
}

interface Ialarm {
    alarm: string;
}

interface IAlarm {

    alarms: Ialarm[];
    firmware: string;
    dateprod: string;
    serial: string;
    pn: string;
    address: number;
    model: string;
    apiVersion: string;
    createdAt: number;

}

interface IAPI {

    _id: string;
    uid: string;
    bootId: string;
    bootTime: number;
    active: boolean;
    updatedAt: number;
    date: string;
    strings: Istring[];
    grid: {
        voltage: number;
        current: number;
        power: number;
        hz: number;
    };
    DcAcCvrEff: number;
    invTemp: number;
    envTemp: number;
    dailyEnergy: number;
    weeklyEnergy: number;
    last7DaysEnergy: number;
    monthlyEnergy: number;
    yearlyEnergy: number;
    totalEnergy: number;
    partialEnergy: number;
    bulkV: number;
    bulkMV: number;
    bulkDC: number;
    isoRes: number;
    gridVDC: number;
    gridAvgV: number;
    gridDCHz: number;
    peakMax: number;
    peakDay: number;
    pin1W: number;
    pin2W: number;

    firmware: string;
    dateprod: string;
    serial: string;
    pn: string;
    address: number;
    model: string;
    apiVersion: string;
}



interface IAddress {
    uuid: string;
    dev?: string;
    address: number;
    hub?: string;
    firmware?: string;
    dateprod?: string;
    pn?: string;
    serial?: string;
    model?: string;
    apiVersion?: string;
}

class AJS {
    addresses: IAddress[];
    timezone: string;
    exec: string;
    apiVersion: string;
    constructor(addresses: IAddress[], timezone: string, exe?: string) {
        this.apiVersion = require(__dirname + "/package.json").version;
        this.addresses = addresses;
        this.timezone = timezone;
        let cmd: string;
        if (exe) {
            cmd = exe;
        } else {
            if (Os.arch() === "arm") {
                cmd = __dirname + "/bin/rasp2/aurora.bin";
            } else if (Os.arch() === "x64") {
                cmd = __dirname + "/bin/x64/aurora.bin";
            } else if (Os.arch() === "ia32") {
                cmd = __dirname + "/bin/ia32/aurora.bin";
            } else {
                cmd = "aurora";
            }
        }

        this.exec = cmd;
    }

    alarm(uuid: string) {
        let exe = this.exec;
        let timezone = this.timezone;
        let checkanswer = <IAddress>{ uuid: uuid };
        let addresses = this.addresses;
        let apiVersion = this.apiVersion;


        let ala = <IAlarm>{
            model: "Aurora",
            apiVersion: apiVersion,
            createdAt: new Date().getTime()
        };


        for (let i = 0; i < addresses.length; i++) {
            if (addresses[i].uuid === uuid) {
                checkanswer.hub = addresses[i].hub;
                checkanswer.address = addresses[i].address;
                if (addresses[i].dev) checkanswer.dev = addresses[i].dev;

                if (addresses[i].firmware) ala.firmware = addresses[i].firmware;
                if (addresses[i].dateprod) ala.dateprod = addresses[i].dateprod;
                if (addresses[i].serial) ala.serial = addresses[i].serial;
                if (addresses[i].address) ala.address = addresses[i].address;
                if (addresses[i].pn) ala.pn = addresses[i].pn;

            }
        }
        return new Promise<IAlarm>(function(resolve, reject) {
            if (!checkanswer.dev) {


                lsusbdev().then(function(devis) {


                    for (let i = 0; i < devis.length; i++) {
                        if (devis[i].hub === checkanswer.hub) {
                            checkanswer.dev = devis[i].dev;
                        }
                    }


                    getAlarms(exe, checkanswer.address, checkanswer.dev).then(function(alarms) {

                        ala.alarms = alarms;
                        resolve(ala);
                    }).catch(function(err) {
                        console.error("errrrrr2");
                        reject(err);
                    });


                }).catch(function(err) {
                    console.error("errrrrr2");

                    reject(err);

                });
            } else {

            }
        });
    }

    alarms(adds?: string[]) {

        let addresses: IAddress[] = [];
        let thisaddresses = this.addresses;
        if (adds) {
            for (let i = 0; i < thisaddresses.length; i++) {
                for (let a = 0; a < adds.length; a++) {

                    if (thisaddresses[i].uuid === adds[a]) {
                        addresses.push(thisaddresses[i]);
                    }

                }
            }
        } else {
            addresses = thisaddresses;
        }




        let that = this;

        let allanswers: IAlarm[] = [];

        return new Promise<IAlarm[]>(function(resolve, reject) {


            async.each(addresses, function(iterator, callback) {

                that.alarm(iterator.uuid).then(function(ala) {

                    allanswers.push(ala);

                    callback();

                }).catch(function(err) {

                    console.log("err", err);

                    callback();

                });

            }, function(err) {
                if (err) {
                    // One of the iterations produced an error.
                    // All processing will now stop.
                    reject(err);
                } else {

                    resolve(allanswers);

                }

            });




        });





    }


    data() {

        let exe = this.exec;
        let timezone = this.timezone;

        let addressesoptions = this.addresses;

        let prepared_addresses = prepare_address(addressesoptions);

        let that = this;

        return new Promise<IAPI[]>(function(resolve, reject) {

            let checkmodel = [];

            for (let i = 0; i < addressesoptions.length; i++) {

                if (!addressesoptions[i].serial || addressesoptions[i].serial === "none" || !addressesoptions[i].pn || addressesoptions[i].pn === "none" || !addressesoptions[i].firmware || addressesoptions[i].firmware === "none" || !addressesoptions[i].dateprod || addressesoptions[i].dateprod === "none") {
                    checkmodel.push(addressesoptions[i].uuid);

                }
            }


            if (checkmodel.length > 0) {

                console.log("checking versions");

                that.checkAll(checkmodel).then(function(a) {


                    for (let i = 0; i < a.length; i++) {

                        if (a[i].serial && a[i].serial !== "none" && a[i].pn && a[i].pn !== "none" && a[i].firmware && a[i].firmware !== "none" && a[i].dateprod && a[i].dateprod !== "none") {

                            for (let add = 0; add < that.addresses.length; add++) {

                                if (that.addresses[add].uuid === a[i].uuid) {
                                    that.addresses[add] = a[i];
                                }

                            }
                        }
                    }

                    exec(__dirname + "/aurora.sh -a \"" + prepared_addresses + "\" -t \"" + timezone + "\" -e \"" + exe + "\"").then(function(data: string) {

                        let apians: IAPI[] = JSON.parse(data);
                        for (let i = 0; i < apians.length; i++) {
                            for (let f = 0; f < a.length; f++) {

                                if (apians[i].uid === a[f].uuid) {

                                    if (a[f].firmware) apians[i].firmware = a[f].firmware;
                                    if (a[f].dateprod) apians[i].dateprod = a[f].dateprod;
                                    if (a[f].serial) apians[i].serial = a[f].serial;
                                    if (a[f].address) apians[i].address = a[f].address;
                                    if (a[f].pn) apians[i].pn = a[f].pn;


                                    apians[i].model = "Aurora";
                                    apians[i].apiVersion = that.apiVersion;

                                }
                            }

                        }

                        resolve(apians);

                    }).catch(function(err) {
                        console.log(err);

                        reject(err);
                    });


                }).catch(function(err) {
                    console.log(err);
                    exec(__dirname + "/aurora.sh -a \"" + prepared_addresses + "\" -t \"" + timezone + "\" -e \"" + exe + "\"").then(function(data: string) {

                        let apians: IAPI[] = JSON.parse(data);
                        for (let i = 0; i < apians.length; i++) {
                            apians[i].model = "Aurora";
                            apians[i].apiVersion = that.apiVersion;
                        }

                        resolve(apians);
                    }).catch(function(err) {
                        console.log(err);
                        reject(err);
                    });

                });


            } else {

                exec(__dirname + "/aurora.sh -a \"" + prepared_addresses + "\" -t \"" + timezone + "\" -e \"" + exe + "\"").then(function(data: string) {

                    let apians: IAPI[] = JSON.parse(data);
                    for (let i = 0; i < apians.length; i++) {
                        for (let f = 0; f < addressesoptions.length; f++) {

                            if (apians[i].uid === addressesoptions[f].uuid) {

                                if (addressesoptions[f].firmware) apians[i].firmware = addressesoptions[f].firmware;
                                if (addressesoptions[f].dateprod) apians[i].dateprod = addressesoptions[f].dateprod;
                                if (addressesoptions[f].serial) apians[i].serial = addressesoptions[f].serial;
                                if (addressesoptions[f].address) apians[i].address = addressesoptions[f].address;
                                if (addressesoptions[f].pn) apians[i].pn = addressesoptions[f].pn;

                                apians[i].model = "Aurora";
                                apians[i].apiVersion = that.apiVersion;
                            }
                        }

                    }

                    resolve(apians);

                }).catch(function(err) {
                    reject(err);
                });

            }
        });

    }

    check(uuid: string) { // get model, firmware, production date


        if (!uuid) throw Error("no uid provided");


        let exe = this.exec;

        let addresses = this.addresses;



        let checkanswer = <IAddress>{ uuid: uuid };

        return new Promise<IAddress>(function(resolve, reject) {


            for (let i = 0; i < addresses.length; i++) {
                if (addresses[i].uuid === uuid) {
                    checkanswer.hub = addresses[i].hub;
                    checkanswer.address = addresses[i].address;
                }
            }


            lsusbdev().then(function(devis) {


                for (let i = 0; i < devis.length; i++) {
                    if (devis[i].hub === checkanswer.hub) {
                        checkanswer.dev = devis[i].dev;
                    }
                }

                checking(checkanswer, exe).then(function(a) {
                    resolve(a);
                }).catch(function() {
                    checking(checkanswer, exe).then(function(a) {
                        resolve(a);
                    }).catch(function() {
                        checking(checkanswer, exe).then(function(a) {
                            resolve(a);
                        }).catch(function() {
                            checking(checkanswer, exe).then(function(a) {
                                resolve(a);
                            }).catch(function(err) {

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


            }).catch(function(err) {
                console.error("errrrrr2");

                reject(err);

            });


        });

    }


    checkAll(adds?: string[]) {

        let addresses: IAddress[] = [];
        let thisaddresses = this.addresses;
        if (adds) {
            for (let i = 0; i < thisaddresses.length; i++) {
                for (let a = 0; a < adds.length; a++) {

                    if (thisaddresses[i].uuid === adds[a]) {
                        addresses.push(thisaddresses[i]);
                    }

                }
            }
        } else {
            addresses = thisaddresses;
        }



        let that = this;

        let allanswers: IAddress[] = [];

        return new Promise<IAddress[]>(function(resolve, reject) {


            async.each(addresses, function(iterator, callback) {

                that.check(iterator.uuid).then(function(chkansw) {

                    allanswers.push(chkansw);

                    callback();

                }).catch(function(err) {

                    console.log("err", err);

                    for (let i = 0; i < thisaddresses.length; i++) {

                        if (thisaddresses[i].uuid === iterator.uuid) {
                            allanswers.push(thisaddresses[i]);
                        }
                    }
                    callback();

                });

            }, function(err) {
                if (err) {
                    // One of the iterations produced an error.
                    // All processing will now stop.
                    reject(err);
                } else {

                    resolve(allanswers);

                }

            });




        });


    }


    reconfigure(opt: { addresses?: IAddress[], timezone?: string, exec?: string }) {
        if (opt) {
            if (opt.addresses) this.addresses = opt.addresses;
            if (opt.timezone) this.timezone = opt.timezone;
            if (opt.exec) this.exec = opt.exec;
        }
    }
}
export = AJS
