const express = require('express');
const cors = require('cors'); 
const routes = require('./routes');
require('dotenv/config');

const app = express();

app.use((req, res, next) => {
    res.header("Access-Control-Allow-Credentials", "true" );
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, OPTIONS, PATCH");
    res.header("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version");
    app.use(cors());
    next();
});

const port = process.env.PORT || 3333;
const host = process.env.DATABASE_URL;

app.use(express.json());

app.use(routes);

app.listen(port, () => {
    console.log(`Server running...`, port)
});