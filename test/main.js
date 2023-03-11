"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = __importDefault(require("../index"));
let aurorajs = new index_1.default([{ uuid: "dkhlih", hub: "1-1.5", address: 0 }], "Europe/Rome");
aurorajs
    .data()
    .then(function (doc) {
    if (doc) {
        console.info(doc);
    }
    else {
        console.error("data problems");
    }
})
    .catch(function (err) {
    console.error(err, "error", "raw");
});
//# sourceMappingURL=main.js.map