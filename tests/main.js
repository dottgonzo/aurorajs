var Aurora=require('../index.js'),
PouchDB=require('pouchdb'),
rm=require('rm-r'),
verb=require("verbo");

var linktestdb='testdb';

var aurorajs=new Aurora([{"uuid":"dkhlih","dev":"2-1.2","address":0},{"uuid":"kkjkww","dev":"2-1.3","address":0}],"Europe/Rome",linktestdb);

aurorajs.data().then(function(doc){
  if(doc){

    verb(doc,"debug","Pure");


  } else{
    verb("data problems","error","Aurorajs");

  }
}).catch(function(err){
  verb(err,"error","raw")
});

aurorajs.save().then(function(data){
  var db=new PouchDB(linktestdb);
  if(data){
    db.allDocs({include_docs:true}).then(function(docs){
      verb(docs,'info','Save');
      rm('./'+linktestdb)

    }).catch(function(err){
      verb(err,"error")
    })



  } else{
    verb("data problems","error","Aurorajs");

  }
}).catch(function(err){
  verb(err,"error","savetopouch")
});
