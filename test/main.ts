import Aurora from "../index";

let aurorajs = new Aurora(
  [{ uuid: "dkhlih", hub: "1-1.5", address: 0 }],
  "Europe/Rome"
);
aurorajs
  .data()
  .then(function (doc) {
    if (doc) {
      console.info(doc);
    } else {
      console.error("data problems");
    }
  })
  .catch(function (err) {
    console.error(err, "error", "raw");
  });
