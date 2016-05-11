var Aurora=require('../index.js');



var aurorajs=new Aurora([{"uuid":"dkhlih","hub":"1-1.3","address":2}],"Europe/Rome");
aurorajs.checkAll().then(function(doc){
  if(doc){
    console.log(doc);
  } else{
    console.log("data problems","error","Aurorajs");
  }
}).catch(function(err){
  console.log(err,"error","raw")
});
