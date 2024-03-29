"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const os_1 = require("os");
const lsusbdev_1 = __importDefault(require("lsusbdev"));
const node_exec_promise_1 = require("node-exec-promise");
async function getAlarms(cmd, address, dev) {
    const data = await (0, node_exec_promise_1.exec)(cmd +
        " -a" +
        address +
        " -A -Y20 " +
        dev +
        " | cut -d: -f2- | sed 's/               //g'");
    let lines = data.stdout.split("\n");
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
    const data = await (0, node_exec_promise_1.exec)(cmd);
    // firmware
    let lines = data.stdout.split("\n");
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
        let apiVersion = this.apiVersion;
        let ala = {
            model: "Aurora",
            apiVersion: apiVersion,
            createdAt: new Date().getTime(),
        };
        const address = this.addresses.find((f) => f.uuid === uuid);
        if (!address)
            throw new Error("inverter not configured");
        checkanswer.hub = address.hub;
        checkanswer.address = address.address;
        if (address.dev)
            checkanswer.dev = address.dev;
        if (address.firmware)
            ala.firmware = address.firmware;
        if (address.dateprod)
            ala.dateprod = address.dateprod;
        if (address.serial)
            ala.serial = address.serial;
        if (address.address)
            ala.address = address.address;
        if (address.pn)
            ala.pn = address.pn;
        if (!checkanswer.dev) {
            const devis = await (0, lsusbdev_1.default)();
            checkanswer.dev = devis.find((f) => f.hub === checkanswer.hub)?.dev;
        }
        if (!checkanswer.dev)
            throw new Error("Error getting data from inverter");
        const alarms = await getAlarms(exe, checkanswer.address, checkanswer.dev);
        ala.alarms = alarms;
        return ala;
    }
    async alarms() {
        let allanswers = [];
        for (const iterator of this.addresses) {
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
        let apians;
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
                const a = await this.checkAll();
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
                const data = await (0, node_exec_promise_1.exec)(__dirname +
                    '/aurora.sh -a "' +
                    prepared_addresses +
                    '" -t "' +
                    timezone +
                    '" -e "' +
                    exe +
                    '"');
                apians = JSON.parse(data.stdout);
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
            }
            catch (err) {
                console.log(err);
                const data = await (0, node_exec_promise_1.exec)(__dirname +
                    '/aurora.sh -a "' +
                    prepared_addresses +
                    '" -t "' +
                    timezone +
                    '" -e "' +
                    exe +
                    '"');
                apians = JSON.parse(data.stdout);
                for (let i = 0; i < apians.length; i++) {
                    apians[i].model = "Aurora";
                    apians[i].apiVersion = this.apiVersion;
                }
            }
        }
        else {
            const data = await (0, node_exec_promise_1.exec)(__dirname +
                '/aurora.sh -a "' +
                prepared_addresses +
                '" -t "' +
                timezone +
                '" -e "' +
                exe +
                '"');
            apians = JSON.parse(data.stdout);
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
        }
        return apians;
    }
    async check(uuid) {
        // get model, firmware, production date
        if (!uuid)
            throw Error("no uid provided");
        let exe = this.exec;
        let checkanswer = { uuid: uuid };
        for (let i = 0; i < this.addresses.length; i++) {
            if (this.addresses[i].uuid === uuid) {
                checkanswer.hub = this.addresses[i].hub;
                checkanswer.address = this.addresses[i].address;
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
    async checkAll() {
        let allanswers = [];
        for (const iterator of this.addresses) {
            const chkansw = await this.check(iterator.uuid);
            if (!this.addresses.find((x) => x.uuid === iterator.uuid)) {
                this.addresses.push(chkansw);
            }
            allanswers.push(chkansw);
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