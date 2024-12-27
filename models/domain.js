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
            paranoid: true,
            modelName: 'Domain',
            tableName: 'domains',
         }
      )
   }

   static associate(db) {
      db.Domain.belongsTo(db.User, { foreignKey: 'userId', targetKey: 'id', onDelete: 'CASCADE' })
   }
}
