var Aurora=require('../index.js'),

verb=require("verbo");

var aurorajs=new Aurora([{"uuid":"dkhlih","dev":"1-1.5","address":0}],"Europe/Rome");
aurorajs.data().then(function(doc){
  if(doc){

    verb(JSON.stringify(doc),"debug","Pure");


  } else{
    verb("data problems","error","Aurorajs");

  }
}).catch(function(err){
  verb(err,"error","raw")
});
