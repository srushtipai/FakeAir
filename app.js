require('dotenv').load();
const { Client } = require('pg');
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const flash = require('connect-flash');

const ssl = (process.env.NODE_ENV === 'production');

const app = express();
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 60000 },
}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(flash());
app.set('view engine', 'ejs');
app.use(express.static(`${__dirname}/public`));

app.use((req, res, next) => {
  res.locals.currentUser = req.user;
  res.locals.error = req.flash('error');
  res.locals.success = req.flash('success');
  next();
});

app.get('/', (req, res) => {
  res.render('landing');
});

app.get('/admin', (req, res) => {
  if (req.session.userid !== process.env.ADMINU || req.session.password !== process.env.ADMINP) {
    res.redirect('/login');
  } else {
    let airportcodes;
    const client = new Client({
      connectionString: process.env.DATABASE_URL,
      ssl,
    });
    client.connect();
    let query = 'SELECT iata FROM airport';
    client.query(query, (err, result) => {
      if (err) {
        console.log(err.stack); // eslint-disable-line no-console
      } else {
        airportcodes = result.rows;
      }
      query = 'SELECT iata FROM airline';
      client.query(query, (err1, result1) => {
        if (err1) {
          console.log(err.stack); // eslint-disable-line no-console
        } else {
          res.render('admin', { airportcodes, airlinecodes: result1.rows });
        }
        client.end();
      });
    });
  }
});

app.post('/admin', (req, res) => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl,
  });
  client.connect();
  const data = req.body;
  if (data) {
    if (data.airport) {
      const airp = data.airport; // object destructuring not yet supported by node
      const query = 'INSERT INTO airport VALUES ($1, $2, $3, $4, $5, $6, $7)';
      const values = [
        airp.iata,
        airp.country,
        airp.state,
        airp.city,
        airp.name,
        airp.longitude,
        airp.latitude,
      ];
      client.query(query, values, (err) => {
        if (err) {
          req.flash('error', 'Error: Could not add to database.');
          res.redirect('/admin');
          console.log(err.stack); // eslint-disable-line no-console
        } else {
          req.flash('success', 'Successfully added to Database!');
          res.redirect('/admin');
        }
        client.end();
      });
    }

    if (data.airline) {
      const airl = data.airline; // object destructuring not yet supported by node
      const query = 'INSERT INTO airline VALUES ($1, $2, $3)';
      const values = [
        airl.code,
        airl['name-airline'],
        airl['country-origin'],
      ];
      client.query(query, values, (err) => {
        if (err) {
          req.flash('error', 'Error: Could not add to database.');
          res.redirect('/admin');
          console.log(err.stack); // eslint-disable-line no-console
        } else {
          req.flash('success', 'Successfully added to Database!');
          res.redirect('/admin');
        }
        client.end();
      });
    }
  }
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', (req, res) => {
  req.session.userid = req.body.userid;
  req.session.password = req.body.password;
  res.redirect('/admin');
});

app.listen(process.env.PORT, process.env.IP, () => {
  console.log('The FakeAir Server Has Started!'); // eslint-disable-line no-console
});
