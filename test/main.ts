import Aurora=require("../index");

let verb=require("verbo");



var aurorajs=new Aurora([{"uuid":"dkhlih","dev":"1-1.5","address":0}],"Europe/Rome");
aurorajs.data().then(function(doc){
  if(doc){

    verb(doc,"debug","Pure");


  } else{
    verb("data problems","error","Aurorajs");

  }
}).catch(function(err){
  verb(err,"error","raw");
});
