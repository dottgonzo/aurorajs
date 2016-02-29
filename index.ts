let exec = require("promised-exec");
import * as Promise from "bluebird";


function prepare_address(addresses: IAddress[]) {
    let readdr = [];
    for (var i = 0; i < addresses.length; i++) {
        readdr[i] = { uuid: addresses[i].uuid, dev: addresses[i].dev, address: addresses[i].address };

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
    grid: Istring;
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
}

interface IAddress {
    uuid: string;
    dev: string;
    address: number;
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
            cmd = "aurora";
        }

        this.exec = cmd;
    }
    data() {
        let exe = this.exec;
        let addresses = prepare_address(this.addresses);
        let timezone = this.timezone;
        return new Promise<IAPI[]>(function(resolve, reject) {
            exec(__dirname + "/aurora.sh -a \"" + addresses + "\" -t \"" + timezone + "\" -e \"" + exe + "\"").then(function(data: string) {
                resolve(JSON.parse(data));
            }).catch(function(err) {
                reject(err);
            });
        });
    }
    reconfigure(opt: { addresses?: IAddress[], timezone?: string, exec: string }) {
        if (opt) {
            if (opt.addresses) this.addresses = opt.addresses;
            if (opt.timezone) this.timezone = opt.timezone;
            if (opt.exec) this.exec = opt.exec;
        }
    }
}
export = AJS
