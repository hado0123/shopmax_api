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
      Order.hasMany(db.OrderItem, { foreignKey: 'orderId', sourceKey: 'id', onDelete: 'CASCADE' })
      Order.belongsToMany(db.Item, { through: db.OrderItem, foreignKey: 'orderId', otherKey: 'itemId' }) // 교차테이블 관계 설정(꼭 필요한건 아님, 다만 다대다 관계쉽게 조회 가능)
      /*
      예) 주문(Order)과 연결된 모든 상품(Item)을 가져오고 싶을 때:
      const order = await Order.findOne({
         where: { id: 1 },
         include: [Item], // Order와 연결된 모든 Item 가져오기
      });
  
      예) 상품(Item)과 연결된 모든 주문(Order)을 가져오고 싶을 때:
      const item = await Item.findOne({
         where: { id: 1 },
         include: [Order], // Item과 연결된 모든 Order 가져오기
      });
      */

      /*
      참조 대상이 삭제될 때 같이 삭제되도록 하려면, Sequelize에서는 onDelete: 'CASCADE' 옵션을 사용. 이 옵션은 참조하는 테이블의 데이터가 삭제되면, 참조당하는 테이블의 데이터도 자동으로 삭제되도록 설정.

      const { Order, OrderItem, Item, sequelize } = require('./models');

      (async () => {
      await sequelize.sync({ force: true });

      const order = await Order.create({ order_date: new Date(), order_status: 'ORDER' });
      const item = await Item.create({ item_nm: 'Sample Item', price: 100, stock_number: 10 });

      await OrderItem.create({
         order_price: 100,
         count: 1,
         order_id: order.id,
         item_id: item.id,
      });

      // Order 삭제 테스트
      await order.destroy();

      // OrderItem이 자동으로 삭제되었는지 확인
      const orderItems = await OrderItem.findAll();
      console.log(orderItems); // 빈 배열 출력 (OrderItem이 삭제됨)
      })();

      */
   }
}
