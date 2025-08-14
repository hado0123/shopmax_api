const Sequelize = require('sequelize')

module.exports = class Domain extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            host: {
               type: Sequelize.STRING(80),
               allowNull: false,
            },
            clientToken: {
               type: Sequelize.TEXT,
               allowNull: false,
            },
         },
         {
            sequelize,
            timestamps: true,
            underscored: false,
            modelName: 'Domain',
            tableName: 'domains',
            paranoid: true, // deletedAt 컬럼 사용: 소프트 삭제
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
         }
      )
   }

   static associate(db) {
      Domain.belongsTo(db.User, { foreignKey: 'userId', targetKey: 'id', onDelete: 'CASCADE' })
   }
}
