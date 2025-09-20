// boot-strappers: load variables 
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

// init express server
const app = express()
app.use(cors())
app.use(express.json())

const pool = new Pool({ConnectionString: process.env.DATABASE_URL})

// routes for the api


// start our backend
app.listen(5000, () => {console.log("ϟϟϟServer started on port 5000...ϟϟϟ")})