var Aurora=require('../index.js'),
rm=require('rm-r'),
verb=require("verbo"),
PouchDB=require('pouchdb');

var linktestdb='testdb';
var db=new PouchDB(linktestdb);

var aurorajs=new Aurora([{"uuid":"dkhlih","dev":"2-1.2","address":0},{"uuid":"kkjkww","dev":"2-1.3","address":0}],"Europe/Rome",'testdb');
aurorajs.save().then(function(doc){
  if(doc){

  verb(JSON.stringify(doc),"debug","Pure");


  } else{
    verb("data problems","error","Aurorajs");

  }
}).catch(function(err){
  verb(err,"error","raw")
});
