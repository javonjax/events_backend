require('dotenv').config();
const express = require('express');
const router = express.Router();
const { pool } = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const checkIfExists = async (field, value) => {
  let query = {
    text: `SELECT * FROM users.users WHERE ${field} = $1;`,
    values: [value],
  };
  const result = await pool.query(query);
  return { exists: result.rowCount > 0, account: result.rows[0] };
};

/*
  Register a new account.
*/
router.post('/register', async (request, response) => {
  try {
    const { username, email, password } = request.body;

    // Ensure all params are present.
    console.log('Checking that all params are present.');
    if (!username || !password || !email) {
      const missingParamsError = new Error('Missing registration parameters.');
      missingParamsError.code = 400;
      throw missingParamsError;
    }

    // Check if a user exists under the given email.
    console.log('Checking an account is registered with the given email.');
    let query = {
      text: 'SELECT * FROM users.users WHERE email = $1;',
      values: [email],
    };
    const existsUnderEmail = await pool.query(query);
    if (existsUnderEmail.rowCount > 0) {
      const emailError = new Error(
        'An account is already registered with this email address.',
      );
      emailError.code = 400;
      throw emailError;
    }

    // Check if a use
    console.log('Checking an account is registered with the given username.');
    query = {
      text: 'SELECT * FROM users.users WHERE username = $1;',
      values: [username],
    };
    const existsUnderUsername = await pool.query(query);
    if (existsUnderUsername.rowCount > 0) {
      const usernameError = new Error(
        'An account is already registered with this username.',
      );
      usernameError.code = 400;
      throw usernameError;
    }

    // Encrypt password.
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Attempt to add the new user to the database.
    console.log('Attempting to register account.');
    query = {
      text: `INSERT INTO users.users (username, email, password_hash)
             VALUES ($1, $2, $3);`,
      values: [username, email, hashedPassword],
    };
    const registration = await pool.query(query);
    if (registration.rowCount === 0) {
      const registrationError = new Error(
        'Registration failed. Please try again.',
      );
      registrationError.code = 400;
      throw registrationError;
    }
    response.status(201).json({
      message: 'Account created successfully.',
    });
  } catch (error) {
    response
      .status(error.code || 500)
      .json({ message: error.message || 'Internal server error.' });
  }
});

/*
  Sign in with an account.
*/
router.post('/signin', async (request, response) => {
  try {
    const { email, password } = request.body;
    const user = await checkIfExists('email', email);
    if (!user.exists) {
      const userNotFoundError = new Error('Invalid email or password.');
      userNotFoundError.code = 401;
      throw userNotFoundError;
    }

    const validPassword = await bcrypt.compare(
      password,
      user.account.password_hash,
    );

    if (!validPassword) {
      const invalidPasswordError = new Error('Invalid email or password.');
      invalidPasswordError.code = 401;
      throw invalidPasswordError;
    }

    // Generate json web token
    const token = jwt.sign({id: user.account.id}, process.env.JWT_SECRET, 
                           {expiresIn: process.env.JWT_EXPIRES_IN});

    response.status(200).json({message: 'Sign in successful.', token: token});
  } catch (error) {
    response
      .status(error.code || 500)
      .json({ message: error.message || 'Internal server error.' });
  }
});

module.exports = router;
