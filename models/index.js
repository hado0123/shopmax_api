const Sequelize = require('sequelize')
const env = process.env.NODE_ENV || 'development'
const config = require('../config/config')[env]

const User = require('./user')
const Order = require('./order')
const Cart = require('./cart')
const Item = require('./item')
const Img = require('./img')
const OrderItem = require('./orderItem')
const CartItem = require('./cartItem')
const Domain = require('./domain')

const db = {}
const sequelize = new Sequelize(config.database, config.username, config.password, config)

db.sequelize = sequelize
db.User = User
db.Order = Order
db.Cart = Cart
db.Item = Item
db.Img = Img
db.OrderItem = OrderItem
db.CartItem = CartItem
db.Domain = Domain

User.init(sequelize)
Order.init(sequelize)
Cart.init(sequelize)
Item.init(sequelize)
Img.init(sequelize)
OrderItem.init(sequelize)
CartItem.init(sequelize)
Domain.init(sequelize)

User.associate(db)
Order.associate(db)
Cart.associate(db)
Item.associate(db)
Img.associate(db)
OrderItem.associate(db)
CartItem.associate(db)
Domain.associate(db)

module.exports = db
