var Aurora=require('../index.js'),



var aurorajs=new Aurora([{"uuid":"dkhlih","dev":"1-1.5","address":0}],"Europe/Rome");
aurorajs.data().then(function(doc){
  if(doc){
    console.log(doc);
  } else{
    console.log("data problems","error","Aurorajs");
  }
}).catch(function(err){
  verb(err,"error","raw")
});
