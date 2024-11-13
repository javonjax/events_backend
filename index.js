require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const Pool = require('./db');
const PORT = 3000;
const dataRoutes = require('./dataRoutes');
const accountRoutes = require('./accountRoutes');

app.use(express.json());
app.use(cors());
app.use('/api', dataRoutes);
app.use('/api', accountRoutes);

app.listen(PORT, () => {
  console.log(`Backend API listening at port ${PORT}`);
});
