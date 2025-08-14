const Sequelize = require('sequelize')

module.exports = class Order extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            orderDate: {
               type: Sequelize.DATE(6),
               allowNull: false,
            },
            orderStatus: {
               type: Sequelize.ENUM('ORDER', 'CANCEL'),
               allowNull: false,
            },
         },
         {
            sequelize,
            timestamps: true,
            underscored: false,
            modelName: 'Order',
            tableName: 'orders',
            paranoid: false,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
         }
      )
   }

   static associate(db) {
      Order.belongsTo(db.User, { foreignKey: 'userId', targetKey: 'id', onDelete: 'CASCADE' })

      // 1:n관계 설정
      Order.hasMany(db.OrderItem, { foreignKey: 'orderId', sourceKey: 'id', onDelete: 'CASCADE' })
      // 교차테이블 관계 지정
      Order.belongsToMany(db.Item, { through: db.OrderItem, foreignKey: 'orderId', otherKey: 'itemId' })
   }
}
