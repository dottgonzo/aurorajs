let exec = require("promised-exec");
import * as Promise from "bluebird";
import * as Os from "os";
import lsusbdev = require("lsusbdev");
import async = require("async");



function checking(checkanswer, cmd) {
    return new Promise<IAddress>(function(resolve, reject) {


        exec(cmd).then(function(data) { // firmware
            let lines = data.split("\n");
            for (let i = 0; i < lines.length; i++) {

                if (lines[i].split("erial Number:").length > 1) {
                    checkanswer.serial = lines[i].split("erial Number: ")[1];
                }

                if (lines[i].split("irmware:").length > 1) {
                    checkanswer.firmware = lines[i].split("irmware: ")[1];
                }

                if (lines[i].split("anufacturing Date:").length > 1) {
                    checkanswer.dateprod = lines[i].split("anufacturing Date: ")[1];
                }



            }

            if (checkanswer.serial && checkanswer.serial !== "" && checkanswer.firmware && checkanswer.firmware !== "" && checkanswer.dateprod && checkanswer.dateprod !== "") {
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
    address: number;

}



interface IAddress {
    uuid: string;
    dev?: string;
    address: number;
    hub?: string;
    firmware?: string;
    dateprod?: string;
    serial?: string;


}

class AJS {
    addresses: IAddress[];
    timezone: string;
    exec: string;
    constructor(addresses: IAddress[], timezone: string, exe?: string) {
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
    data() {
        let exe = this.exec;
        let timezone = this.timezone;

        let prepared_addresses = prepare_address(this.addresses);

        let that = this;

        return new Promise<IAPI[]>(function(resolve, reject) {

            if (!that.addresses[0].serial) {

                that.checkAll().then(function(a) {

                    that.addresses = a;

                    exec(__dirname + "/aurora.sh -a \"" + prepared_addresses + "\" -t \"" + timezone + "\" -e \"" + exe + "\"").then(function(data: string) {

                        let apians: IAPI[] = JSON.parse(data);
                        for (let i = 0; i < apians.length; i++) {
                            for (let f = 0; f < a.length; f++) {

                                if (apians[i].uid === a[f].uuid) {

                                    apians[i].firmware = a[f].firmware;
                                    apians[i].dateprod = a[f].dateprod;
                                    apians[i].serial = a[f].serial;
                                    apians[i].address = a[f].address;


                                }
                            }

                        }

                        resolve(apians);

                    }).catch(function(err) {
                        reject(err);
                    });


                }).catch(function() {

                    exec(__dirname + "/aurora.sh -a \"" + prepared_addresses + "\" -t \"" + timezone + "\" -e \"" + exe + "\"").then(function(data: string) {
                        resolve(JSON.parse(data));
                    }).catch(function(err) {
                        reject(err);
                    });

                });


            } else {

                let a = that.addresses;



                exec(__dirname + "/aurora.sh -a \"" + prepared_addresses + "\" -t \"" + timezone + "\" -e \"" + exe + "\"").then(function(data: string) {

                    let apians: IAPI[] = JSON.parse(data);
                    for (let i = 0; i < apians.length; i++) {
                        for (let f = 0; f < a.length; f++) {

                            if (apians[i].uid === a[f].uuid) {

                                apians[i].firmware = a[f].firmware;
                                apians[i].dateprod = a[f].dateprod;
                                apians[i].serial = a[f].serial;
                                apians[i].address = a[f].address;


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


                let cmd = exe + " -a " + checkanswer.address + " -Y 20 -n -f -g " + checkanswer.dev;

                checking(checkanswer, cmd).then(function(a) {
                    resolve(a);
                }).catch(function() {
                    checking(checkanswer, cmd).then(function(a) {
                        resolve(a);
                    }).catch(function() {
                        checking(checkanswer, cmd).then(function(a) {
                            resolve(a);
                        }).catch(function() {
                            checking(checkanswer, cmd).then(function(a) {
                                resolve(a);
                            }).catch(function(err) {
                                reject(err);
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


    checkAll() {

        let addresses = this.addresses;

        let that = this;

        let allanswers: IAddress[] = [];

        return new Promise<IAddress[]>(function(resolve, reject) {


            async.each(addresses, function(iterator, callback) {

                that.check(iterator.uuid).then(function(chkansw) {

                    allanswers.push(chkansw);

                    callback();

                }).catch(function() {
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
