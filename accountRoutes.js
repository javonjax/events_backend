require('dotenv').config();
const express = require('express');
const router =express.Router();

/*
  Register a new account.
*/
router.post('/register', async (request, response) => {
    const obj = request.body;
    console.log(obj);
    response.json(obj);
});

module.exports = router;
