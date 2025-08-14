const Sequelize = require('sequelize')

module.exports = class Item extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            itemNm: {
               type: Sequelize.STRING(50),
               allowNull: false,
            },
            price: {
               type: Sequelize.INTEGER,
               allowNull: false,
            },
            stockNumber: {
               type: Sequelize.INTEGER,
               allowNull: false,
            },
            itemDetail: {
               type: Sequelize.TEXT,
               allowNull: true,
            },
            itemSellStatus: {
               type: Sequelize.ENUM('SELL', 'SOLD_OUT'),
               allowNull: false,
            },
         },
         {
            sequelize,
            timestamps: true,
            underscored: false,
            modelName: 'Item',
            tableName: 'items',
            paranoid: false,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
         }
      )
   }

   static associate(db) {
      Item.hasMany(db.Img, { foreignKey: 'itemId', sourceKey: 'id', onDelete: 'CASCADE' })

      // 1:n관계
      Item.hasMany(db.OrderItem, { foreignKey: 'itemId', sourceKey: 'id', onDelete: 'CASCADE' })
      // 교차테이블 관계 설정
      Item.belongsToMany(db.Order, { through: db.OrderItem, foreignKey: 'itemId', otherKey: 'orderId' })

      // 1:n관계 설정
      Item.hasMany(db.CartItem, { foreignKey: 'itemId', sourceKey: 'id', onDelete: 'CASCADE' })
      //교차테이블 관계 설정
      Item.belongsToMany(db.Cart, { through: db.CartItem, foreignKey: 'itemId', otherKey: 'cartId' })
   }
}
