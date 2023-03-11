"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const os_1 = require("os");
const lsusbdev_1 = __importDefault(require("lsusbdev"));
const exec = require("promised-exec");
async function getAlarms(cmd, address, dev) {
    const data = await exec(cmd +
        " -a" +
        address +
        " -A -Y20 " +
        dev +
        " | cut -d: -f2- | sed 's/               //g'");
    let lines = data.split("\n");
    let alarms = [];
    for (let i = 0; i < lines.length; i++) {
        if (lines[i] !== "No Alarm" && lines[i].length > 3) {
            alarms.push({ alarm: lines[i] });
        }
    }
    return alarms;
}
async function checking(checkanswer, exe) {
    let cmd = exe +
        " -a " +
        checkanswer.address +
        " -Y 20 -n -f -g -p " +
        checkanswer.dev;
    const data = await exec(cmd);
    // firmware
    let lines = data.split("\n");
    for (let i = 0; i < lines.length; i++) {
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
        return checkanswer;
    }
    else {
        throw new Error("Error getting data from inverter");
    }
    //   checkanswer.firmware = data;
}
function prepare_address(addresses) {
    let readdr = [];
    for (let i = 0; i < addresses.length; i++) {
        readdr[i] = {
            uuid: addresses[i].uuid,
            dev: addresses[i].hub,
            address: addresses[i].address,
        };
    }
    return JSON.stringify(readdr);
}
class Aurora {
    addresses;
    timezone;
    exec;
    apiVersion;
    constructor(addresses, timezone, exe) {
        this.apiVersion = require(__dirname + "/package.json").version;
        this.addresses = addresses;
        this.timezone = timezone;
        let cmd;
        if (exe) {
            cmd = exe;
        }
        else {
            if ((0, os_1.arch)() === "arm") {
                cmd = __dirname + "/bin/rasp2/aurora.bin";
            }
            else if ((0, os_1.arch)() === "x64") {
                cmd = __dirname + "/bin/x64/aurora.bin";
            }
            else if ((0, os_1.arch)() === "ia32") {
                cmd = __dirname + "/bin/ia32/aurora.bin";
            }
            else {
                cmd = "aurora";
            }
        }
        this.exec = cmd;
    }
    async alarm(uuid) {
        let exe = this.exec;
        let timezone = this.timezone;
        let checkanswer = { uuid: uuid };
        let addresses = this.addresses;
        let apiVersion = this.apiVersion;
        let ala = {
            model: "Aurora",
            apiVersion: apiVersion,
            createdAt: new Date().getTime(),
        };
        for (let i = 0; i < addresses.length; i++) {
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
        if (!checkanswer.dev) {
            const devis = await (0, lsusbdev_1.default)();
            for (let i = 0; i < devis.length; i++) {
                if (devis[i].hub === checkanswer.hub) {
                    checkanswer.dev = devis[i].dev;
                }
            }
            const alarms = await getAlarms(exe, checkanswer.address, checkanswer.dev);
            ala.alarms = alarms;
            return ala;
        }
        else {
            throw new Error("no dev found for " + checkanswer.address);
        }
    }
    async alarms(adds) {
        let addresses = [];
        let thisaddresses = this.addresses;
        if (adds) {
            for (let i = 0; i < thisaddresses.length; i++) {
                for (let a = 0; a < adds.length; a++) {
                    if (thisaddresses[i].uuid === adds[a]) {
                        addresses.push(thisaddresses[i]);
                    }
                }
            }
        }
        else {
            addresses = thisaddresses;
        }
        let allanswers = [];
        for (const iterator of addresses) {
            const ala = await this.alarm(iterator.uuid);
            allanswers.push(ala);
        }
        return allanswers;
    }
    async data() {
        let exe = this.exec;
        let timezone = this.timezone;
        let addressesoptions = this.addresses;
        let prepared_addresses = prepare_address(addressesoptions);
        let checkmodel = [];
        for (let i = 0; i < addressesoptions.length; i++) {
            if (!addressesoptions[i].serial ||
                addressesoptions[i].serial === "none" ||
                !addressesoptions[i].pn ||
                addressesoptions[i].pn === "none" ||
                !addressesoptions[i].firmware ||
                addressesoptions[i].firmware === "none" ||
                !addressesoptions[i].dateprod ||
                addressesoptions[i].dateprod === "none") {
                checkmodel.push(addressesoptions[i].uuid);
            }
        }
        if (checkmodel.length > 0) {
            console.log("checking versions");
            try {
                const a = await this.checkAll(checkmodel);
                for (let i = 0; i < a.length; i++) {
                    if (a[i].serial &&
                        a[i].serial !== "none" &&
                        a[i].pn &&
                        a[i].pn !== "none" &&
                        a[i].firmware &&
                        a[i].firmware !== "none" &&
                        a[i].dateprod &&
                        a[i].dateprod !== "none") {
                        for (let add = 0; add < this.addresses.length; add++) {
                            if (this.addresses[add].uuid === a[i].uuid) {
                                this.addresses[add] = a[i];
                            }
                        }
                    }
                }
                const data = await exec(__dirname +
                    '/aurora.sh -a "' +
                    prepared_addresses +
                    '" -t "' +
                    timezone +
                    '" -e "' +
                    exe +
                    '"');
                let apians = JSON.parse(data);
                for (let i = 0; i < apians.length; i++) {
                    for (let f = 0; f < a.length; f++) {
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
                            apians[i].apiVersion = this.apiVersion;
                        }
                    }
                }
                return apians;
            }
            catch (err) {
                console.log(err);
                const data = await exec(__dirname +
                    '/aurora.sh -a "' +
                    prepared_addresses +
                    '" -t "' +
                    timezone +
                    '" -e "' +
                    exe +
                    '"');
                let apians = JSON.parse(data);
                for (let i = 0; i < apians.length; i++) {
                    apians[i].model = "Aurora";
                    apians[i].apiVersion = this.apiVersion;
                }
                return apians;
            }
        }
        else {
            const data = await exec(__dirname +
                '/aurora.sh -a "' +
                prepared_addresses +
                '" -t "' +
                timezone +
                '" -e "' +
                exe +
                '"');
            let apians = JSON.parse(data);
            for (let i = 0; i < apians.length; i++) {
                for (let f = 0; f < addressesoptions.length; f++) {
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
                        apians[i].apiVersion = this.apiVersion;
                    }
                }
            }
            return apians;
        }
    }
    async check(uuid) {
        // get model, firmware, production date
        if (!uuid)
            throw Error("no uid provided");
        let exe = this.exec;
        let addresses = this.addresses;
        let checkanswer = { uuid: uuid };
        for (let i = 0; i < addresses.length; i++) {
            if (addresses[i].uuid === uuid) {
                checkanswer.hub = addresses[i].hub;
                checkanswer.address = addresses[i].address;
            }
        }
        const devis = await (0, lsusbdev_1.default)();
        for (let i = 0; i < devis.length; i++) {
            if (devis[i].hub === checkanswer.hub) {
                checkanswer.dev = devis[i].dev;
            }
        }
        try {
            const chk = await checking(checkanswer, exe);
            return chk;
        }
        catch (err) {
            console.log(err);
            try {
                const chk = await checking(checkanswer, exe);
                return chk;
            }
            catch (err) {
                try {
                    const chk = await checking(checkanswer, exe);
                    return chk;
                }
                catch (err) {
                    try {
                        const chk = await checking(checkanswer, exe);
                        return chk;
                    }
                    catch (err) {
                        try {
                            const chk = await checking(checkanswer, exe);
                            return chk;
                        }
                        catch (err) {
                            console.log(err);
                            checkanswer.serial = "none";
                            checkanswer.firmware = "none";
                            checkanswer.dateprod = "none";
                            checkanswer.pn = "none";
                            return checkanswer;
                        }
                    }
                }
            }
        }
    }
    async checkAll(adds) {
        let addresses = [];
        let thisaddresses = this.addresses;
        if (adds) {
            for (let i = 0; i < thisaddresses.length; i++) {
                for (let a = 0; a < adds.length; a++) {
                    if (thisaddresses[i].uuid === adds[a]) {
                        addresses.push(thisaddresses[i]);
                    }
                }
            }
        }
        else {
            addresses = thisaddresses;
        }
        let allanswers = [];
        for (const iterator of addresses) {
            try {
                const chkansw = await this.check(iterator.uuid);
                allanswers.push(chkansw);
            }
            catch (err) {
                console.log("err", err);
                for (let i = 0; i < thisaddresses.length; i++) {
                    if (thisaddresses[i].uuid === iterator.uuid) {
                        allanswers.push(thisaddresses[i]);
                    }
                }
            }
        }
        return allanswers;
    }
    reconfigure(opt) {
        if (opt) {
            if (opt.addresses)
                this.addresses = opt.addresses;
            if (opt.timezone)
                this.timezone = opt.timezone;
            if (opt.exec)
                this.exec = opt.exec;
        }
    }
}
exports.default = Aurora;
//# sourceMappingURL=index.js.map