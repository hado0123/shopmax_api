const Sequelize = require('sequelize')

module.exports = class User extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            email: {
               type: Sequelize.STRING(255),
               allowNull: false,
               unique: true,
            },
            name: {
               type: Sequelize.STRING(255),
               allowNull: false,
            },
            password: {
               type: Sequelize.STRING(255),
               allowNull: false,
            },
            role: {
               type: Sequelize.ENUM('ADMIN', 'USER'), // 'ADMIN', 'USER' 만 값으로 허용
               allowNull: false,
               defaultValue: 'USER', // 기본 값은 'USER'로 설정
            },
            address: {
               type: Sequelize.STRING(255),
               allowNull: false,
            },
         },
         {
            sequelize,
            timestamps: true, //createdAt, updatedAt ..등 자동 생성
            underscored: false,
            modelName: 'User',
            tableName: 'users',
            paranoid: false, //deletedAt 사용 X
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
         }
      )
   }

   static associate(db) {
      User.hasMany(db.Domain, { foreignKey: 'userId', sourceKey: 'id', onDelete: 'CASCADE' })
      User.hasMany(db.Order, { foreignKey: 'userId', sourceKey: 'id', onDelete: 'CASCADE' })

      User.hasOne(db.Cart, { foreignKey: 'userId', sourceKey: 'id', onDelete: 'CASCADE' })
   }
}
