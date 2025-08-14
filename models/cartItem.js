const Sequelize = require('sequelize')

module.exports = class CartItem extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            count: {
               type: Sequelize.INTEGER,
               allowNull: false,
            },
         },
         {
            sequelize,
            timestamps: true,
            underscored: false,
            modelName: 'CartItem',
            tableName: 'cartItems',
            paranoid: false,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
         }
      )
   }

   static associate(db) {
      //1:n관계 설정
      CartItem.belongsTo(db.Item, { foreignKey: 'itemId', targetKey: 'id', onDelete: 'CASCADE' })
      CartItem.belongsTo(db.Cart, { foreignKey: 'cartId', targetKey: 'id', onDelete: 'CASCADE' })
   }
}
