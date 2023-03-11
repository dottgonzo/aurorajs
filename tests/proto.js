"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = __importDefault(require("../index"));
const aurorajs = new index_1.default([{ uuid: "dkhlih", hub: "1-1.3", address: 2 }], "Europe/Rome");
aurorajs
    .data()
    .then(function (doc) {
    if (doc) {
        console.log(doc);
    }
    else {
        console.log("data problems", "error", "Aurorajs");
    }
})
    .catch(function (err) {
    console.log(err, "error", "raw");
});
//# sourceMappingURL=proto.js.map