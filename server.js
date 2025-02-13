const express=require("express")
const app=express()
app.use(express.json());
app.get("/",(req,res)=>{
    res.json({message:"Welcome to the backend"});
})
app.listen(7650)
require('./routes/processNetflix')