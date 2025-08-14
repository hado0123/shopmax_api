const Sequelize = require('sequelize')

module.exports = class Img extends Sequelize.Model {
   static init(sequelize) {
      return super.init(
         {
            //  원본 이미지 명
            oriImgName: {
               type: Sequelize.STRING(255),
               allowNull: false,
            },
            //이미지 경로
            imgUrl: {
               type: Sequelize.STRING(255),
               allowNull: false,
            },
            // 대표 이미지 여부
            repImgYn: {
               type: Sequelize.ENUM('Y', 'N'),
               allowNull: false,
            },
         },
         {
            sequelize,
            timestamps: true,
            underscored: false,
            modelName: 'Img',
            tableName: 'imgs',
            paranoid: false,
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
         }
      )
   }

   static associate(db) {
      Img.belongsTo(db.Item, { foreignKey: 'itemId', targetKey: 'id', onDelete: 'CASCADE' })
   }
}
