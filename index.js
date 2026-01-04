const express = require("express");
const cors = require("cors");
require ("dotenv").config();
const admin = require("firebase-admin");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT

// index.js
const decoded = Buffer.from(process.env.FB_SERVICE_KEY, "base64").toString("utf8");
const serviceAccount = JSON.parse(decoded);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const app = express();
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@mycluster.m1axkl4.mongodb.net/?appName=MyCluster`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri,  {
        serverApi: {
            version: ServerApiVersion.v1,
            strict: true,
            deprecationErrors: true,
        }
    }
);

app.get('/', (req, res)=>{
  res.send('PawMart is running')
});

const varifyFBToken = async(req, res, next)=>{
    const header = req.headers.authorization;
    if(!header){
        return res
            .status(401)
            .send({message: "Unauthorize access."})
    }
    const token = header.split(' ')[1];
    if(!token){
        return res
            .status(401)
            .send({message: "Unauthorize access.."})
    }
    try{
        const tokenDetails = await admin.auth().verifyIdToken(token)
        req.user_email = tokenDetails.email;
        next();
    } catch(err){
        console.log('...', err)
        return res
            .status(401)
            .send({message: "Unauthorize access..."})
    }
}

async function run() {
  try {
    // await client.connect();

    const pawMartDB = client.db("PawMartDB")
    const usersCollection = pawMartDB.collection("usersCollection")
    const listingsCollection = pawMartDB.collection("listingsCollection")
    const ordersCollection = pawMartDB.collection("ordersCollection")

    // USERS
    app.get("/users", async(req, res)=>{
        const result = await usersCollection.find().toArray()
        res.send(result)
    })
    app.post("/users", async(req, res)=>{
        const newUser = req.body
        const exist = await usersCollection.findOne({email: newUser.email})
        if(!exist){
            const result = await usersCollection.insertOne(newUser)
            res.send(result)
        }
        res.send({ message: "User already exist" });
    })
    app.patch("/users/:id", varifyFBToken, async(req, res)=>{
        const {id} = req.params;
        const updates = req.body;
        if (!updates || Object.keys(updates).length === 0) {
            return res.status(400).json({ error: "No fields to update" });
        }
        const query = {_id: new ObjectId(id)};
        const cursor = { $set: updates}
        const result = await usersCollection.updateOne(query, cursor)
        res.send(result)
    })
    app.delete("/users/:id", varifyFBToken, async(req, res)=>{
        const {id} = req.params;
        try{
            const query = {_id: new ObjectId(id)};
            const result = await usersCollection.deleteOne(query)
            res.send(result)
        }catch(err){
            console.log('..no User found..', err)
            res.send({message: "User not found"})
        }
    })
    // app.get("/users/profile/:email", async(req, res)=>{
    //     const email = req.params.email;
    //     const query = {email: email}
    //     const result = await usersCollection.findOne(query)
    //     res.send(result)
    // })

    // LISTING with CATEGORY Option
    app.get("/listings", async(req, res)=>{
        const category = req.query.category;
        const query={}
        if(category){
            query.category = category
        }
        const result = await listingsCollection.find(query).toArray()
        res.send(result)
    })
    app.get("/latest-listings", async(req, res)=>{
        const result= await listingsCollection.find().sort({created_at:-1}).limit(8).toArray()
        res.send(result)
    })
    app.post("/listings", varifyFBToken, async(req, res)=>{
        const query = req.body
        const date= new Date().toISOString()
        query.created_at= date
        const result = await listingsCollection.insertOne(query)
        res.send(result)
    })
    // MY-LIST
    app.get("/my-list",varifyFBToken, async(req, res)=>{
        const user_email = req.user_email 
        const result = await listingsCollection.find({email:user_email}).toArray()
        res.send(result)
    })
    // LISTING ITEM
    app.get("/listings/:id", async(req, res)=>{
        const {id} = req.params;
        const query = {_id: new ObjectId(id)};
        const result = await listingsCollection.findOne(query)
        res.send(result)
    })
    app.patch("/listings/:id",varifyFBToken, async(req, res)=>{
        const {id} = req.params;
        const updates = req.body;
        if (!updates || Object.keys(updates).length === 0) {
            return res.status(400).json({ error: "No fields to update" });
        }
        const query = {_id: new ObjectId(id)};
        const cursor = { $set: updates}
        const result = await listingsCollection.updateOne(query, cursor)
        res.send(result)
    })
    app.delete("/listings/:id",varifyFBToken, async(req, res)=>{
        const {id} = req.params;
        const query = {_id: new ObjectId(id)};
        const result = await listingsCollection.deleteOne(query)
        res.send(result)
    })

    // ORDERS
    app.get("/orders", varifyFBToken, async(req, res)=>{
        const user_email = req.user_email; 
        if(user_email){
            const result = await ordersCollection.find({buyer_email: user_email}).toArray();
            return res.send(result)
        }
    })
    app.post("/orders",varifyFBToken, async(req, res)=>{
        const newOrder = req.body;
        const result = await ordersCollection.insertOne(newOrder);
        res.send(result)
    })
    app.get("/orders/:id", async(req, res)=>{
        const {id} = req.params;
        const query = {_id: new ObjectId(id)}
        const result = await ordersCollection.findOne(query);
        res.send(result)
    })
    app.delete("/orders/:id", async(req, res)=>{
        const {id} = req.params;
        const query = {_id: new ObjectId(id)}
        const result = await ordersCollection.deleteOne(query);
        res.send(result)
    })

    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch(err) {
    // Ensures that the client will close when you finish/error
    // await client.close();
    console.log('mongo connection error', err)
  }
}

run().catch(console.dir);

app.listen(port, console.log(`PawMart Server is running on port ${port}`))