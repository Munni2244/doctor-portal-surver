const express = require('express')
const app = express()
const port =process.env.PORT || 5000
const admin = require("firebase-admin");
const cors = require('cors')

const { MongoClient } = require('mongodb');
require('dotenv').config()

const serviceAccount =JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.crn6x.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

///verifycation
async function verifycationToken(req, res, next) {
  console.log(req.headers.authorization);
  if(req.headers?.authorization?.startsWith('Bearer ')){
    const token = req.headers.authorization.split(' ')[1];

  try{
    const decoderUser= await admin.auth().verifyIdToken(token);
    req.decoderEmail= decoderUser.email;
  }
  catch{

  }

  }
  next();
}

async function run() {
    try {
      await client.connect();
      const database = client.db("doctors-portal");
      const databaseCollection = database.collection("appointments");
      const usersCollection = database.collection("allUsers");
///post 
app.post('/appointments', async(req, res)=>{
  const doc= req.body;
  const result = await databaseCollection.insertOne(doc);
  res.send(result)

})

//post user
app.post('/users', async(req,res)=>{
  const user=req.body;
  const result= await usersCollection.insertOne(user);
  res.send(result);
  
})

//put user
app.put('/users', async(req,res)=>{
  const user= req.body;
  const filter = { email: user.email};
  const options = { upsert: true };
  const updateDoc = {
    $set: user,
  };
  const result = await usersCollection.updateOne(filter, updateDoc, options);
  res.send(result)
})

///get admin
app.get('/users/:email', async(req,res)=>{
  const email= req.params.email;
  const  query= {email: email};
  const user= await usersCollection.findOne(query);
  let isAdmin= false;
  if(user?.role){
    isAdmin=true;
  }
console.log(isAdmin);
  res.send({admin: isAdmin})
})

//make admin
app.put('/users/admin', verifycationToken, async (req,res)=>{
  const user=req.body;
  console.log('decoder', req.decoderEmail);
  const requester= req.decoderEmail;
  if(requester){
    const requesterAccount= await usersCollection.findOne({email:requester});

    if(requesterAccount.role === 'admin'){
      const filter= {email: user.email};
  const updateDoc={
    $set:{role:'admin'}
  };
  const result = await usersCollection.updateOne(filter, updateDoc);
 
  res.send(result);
    }
  }
  else{
    res.status(401).json({message: 'you do not have access'})
  }
})

//get users email booking
app.get('/appointments', verifycationToken, async(req, res)=>{
  const email= req.query.email;
  const date=new req.query.date;
  const query= {email: email, date:date};
  const cursor = await databaseCollection.find(query).toArray();
  console.log(cursor);
  res.send(cursor);

})

    } 
    
    finally {
    //   await client.close();
    }
  }
  run().catch(console.dir);


  app.get('/', (req, res) => {
    res.send('Hello doctor World!')
  })

  app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
  })