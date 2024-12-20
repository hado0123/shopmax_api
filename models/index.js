const Sequelize = require('sequelize')
const env = process.env.NODE_ENV || 'development'
const config = require('../config/config')[env]

const User = require('./user')
const Order = require('./order')
const Cart = require('./cart')

const db = {}
const sequelize = new Sequelize(config.database, config.username, config.password, config)

db.sequelize = sequelize
db.User = User
db.Order = Order
db.Cart = Cart

User.init(sequelize)
Order.init(sequelize)
Cart.init(sequelize)

User.associate(db)
Order.associate(db)
Cart.associate(db)

module.exports = db
