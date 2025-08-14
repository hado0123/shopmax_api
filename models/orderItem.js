const Sequelize = require('sequelize')

module.exports = class OrderItem extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            orderPrice: {
               type: Sequelize.INTEGER,
               allowNull: false,
            },
            count: {
               type: Sequelize.INTEGER,
               allowNull: false,
            },
         },
         {
            sequelize,
            timestamps: true,
            underscored: false,
            modelName: 'OrderItem',
            tableName: 'orderItems',
            paranoid: false,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
         }
      )
   }

   static associate(db) {
      OrderItem.belongsTo(db.Order, { foreignKey: 'orderId', targetKey: 'id', onDelete: 'CASCADE' })
      OrderItem.belongsTo(db.Item, { foreignKey: 'itemId', targetKey: 'id', onDelete: 'CASCADE' })
   }
}
