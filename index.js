const express = require("express");
const cors = require("cors");
require ("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT

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

async function run() {
  try {
    await client.connect();

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
        const result= await listingsCollection.find().sort({created_at:-1}).limit(3).toArray()
        res.send(result)
    })
    app.post("/listings", async(req, res)=>{
        const query = req.body
        const date= new Date().toISOString()
        query.created_at= date
        const result = await listingsCollection.insertOne(query)
        res.send(result)
    })
    // MY-LIST
    app.get("/my-list", async(req, res)=>{
        const my_list = req.query.my_list
        const result = await listingsCollection.find({seller_email:my_list}).toArray()
        res.send(result)
    })
    // LISTING ITEM
    app.get("/listings/:id", async(req, res)=>{
        const {id} = req.params;
        const query = {_id: new ObjectId(id)};
        const result = await listingsCollection.findOne(query)
        res.send(result)
    })
    app.patch("/listings/:id", async(req, res)=>{
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
    app.delete("/listings/:id", async(req, res)=>{
        const {id} = req.params;
        const query = {_id: new ObjectId(id)};
        const result = await listingsCollection.deleteOne(query)
        res.send(result)
    })

    // ORDERS
    app.get("/orders", async(req, res)=>{
        const result = await ordersCollection.find().toArray();
        res.send(result)
    })
    app.post("/orders", async(req, res)=>{
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


    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}

run().catch(console.dir);

app.listen(port, console.log(`PawMart Server is running on port ${port}`))