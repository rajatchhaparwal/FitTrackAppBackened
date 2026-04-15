import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/db.js'; 
import User from './Models/UserSchemaModel.js'
import exercises from './Exercisedata/exercises.json' with {type:'json'}
import cors from  'cors';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5000;
app.use(express.json());
connectDB();
app.use(cors());

app.post('/api/login', async(req, res) => {
  try{
    const {username,phone} = req.body;
    const newUser  = new User({
      username,
      phone
    })
   await newUser.save();
   res.status(201).json({ message: "User saved successfully!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }     
})

app.get('/Users', async(req,res)=>{
  try{
    //query param like req.query.username
    const userExist = await User.findOne({username:User.username})
    console.log(userExist)
   if (!userExist) {
            await User.create({
                username: "rajat",
                phone: "+919876543",
                truecallerId: "tc_auth_token_xyz",
                profile: {
                    gender: "Male",
                    height: 175,
                    goal: "Muscle Gain"
                },
                statsLog: [{ weight: 70, bodyFat: 15 }]
            });
              return res.status(201).json(userExist);
        }

        // If user already exists
        res.status(200).json(userExist);

    } catch (err) {
        console.error(" Error:", err.message);
        res.status(500).json({ error: err.message });
    }
})

app.get('/Exercisedata',(req,res)=>{
  res.status(200).json(exercises)
})

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}`)
})
