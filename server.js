const express = require('express')
const passport = require('passport')
const bodyParser = require('body-parser')
const session = require('express-session')
const _ = require('lodash')
const mongoose = require('mongoose')
const morgan = require('morgan')
const connectMongo = require('connect-mongo')
const User = require('./models/user')
const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/local'

const app = express()

app.use(morgan(process.env.NODE_ENV === 'prod' ? 'combined' : 'dev'))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
const MongoSessionStore = connectMongo(session)
app.use(session({
  secret: process.env.SESSION_SECRET || 'b77cb93f19d72207a8b2442949257128',
  resave: false,
  saveUninitialized: true,
  store: new MongoSessionStore({
    url: mongoUrl
  })
}))
app.use(passport.initialize())
app.use(passport.session())

passport.use(User.createStrategy())
passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser())

if (process.env.NODE_ENV === 'prod') {
  app.use(require('helmet')())
}

mongoose.connect(mongoUrl, err => {
  if (err) {
    console.error('failed to connect to mongo', err)
    process.exit(-1)
  } else {
    console.log('successfully connected to mongo at', mongoUrl)
  }
})

app.get('/version', (req, res) => {
  res.json({
    NODE_ENV: process.env.NODE_ENV,
    version: process.env.npm_package_version
  })
})

const api = express.Router()

const urlBase = '' // we do not use this

const userFields = [
  'username',
  'objectId',
  'createdAt',
  'updatedAt',
  'phone',
  'emailVerified',
  'mobilePhoneVerified'
]

function safeReturnUser (req, user = req.user, sessionToken = req.sessionToken) {
  const val = _.chain(user).pick(userFields)
  if (sessionToken) {
    val.set('sessionToken', sessionToken)
  }
  return val.value()
}

api.route('/login')
  .get(passport.authenticate('local'), (req, res) => {
    res.json(safeReturnUser(req))
  })

api.route('/users')
  .post((req, res, next) => {
    const { username, password, phone, email } = req.body
    User.register(new User({
      username,
      password,
      phone,
      email
    }), password, (err, user) => {
      if (err) {
        res.status(400).send(err.message)
      } else {
        res.set('Location', `${urlBase}/1.1/users/${user.objectId}`)
          .status(201)
          .json(safeReturnUser(req, user))
      }
    })
  })

api.route('/users/me')
  .get((req, res) => {
    res.json(safeReturnUser(req))
  })

api.route('/users/:userId([0-9a-fA-F]{24}$)')
  .get((req, res, next) => {
    const { userId } = req.params
    User.findById(userId, (err, user) => {
      if (err) {
        res.status(400).send(err.message)
      } else if (user) {
        res.json(safeReturnUser(req, user, null))
      } else {
        res.sendStatus(404)
      }
    })
  })

app.use('/1.1', api)

app.listen(3000, '0.0.0.0', err => {
  if (err) {
    console.error('error happened', err)
    process.exit(-1)
  } else {
    console.log('started and listening at', '0.0.0.0:3000')
  }
})
