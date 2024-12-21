const Sequelize = require('sequelize')

module.exports = class Cart extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {},
         {
            sequelize,
            timestamps: true,
            underscored: false,
            modelName: 'Cart',
            tableName: 'carts',
            paranoid: false,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
         }
      )
   }

   static associate(db) {
      Cart.belongsTo(db.User, { foreignKey: 'userId', targetKey: 'id', onDelete: 'CASCADE' })
      Cart.belongsToMany(db.Item, { through: db.CartItem, foreignKey: 'cartId', otherKey: 'itemId' }) // 교차테이블 관계 설정
   }
}
