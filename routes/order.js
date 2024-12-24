const express = require('express')
const router = express.Router()
const { sequelize } = require('../models')
const { Order, Item, User, OrderItem } = require('../models')
const { isLoggedIn } = require('./middlewares')

//주문 localhost:8000/order
router.post('/', isLoggedIn, async (req, res) => {
   const { items } = req.body
   // items: [{ itemId: 1, count: 2 }, { itemId: 2, count: 1 }]

   //주문 처리 중 에러 발생시 차감된 재고를 복구하지 않으면 데이터가 불일치 상태가 되므로 트랜잭션 처리
   const transaction = await sequelize.transaction() // 트랜잭션 시작

   try {
      // 회원 확인
      const user = await User.findByPk(req.user.id)
      if (!user) {
         throw new Error('회원이 존재하지 않습니다.')
      }

      // 주문 생성
      const order = await Order.create(
         {
            userId: user.id,
            orderDate: new Date(),
            orderStatus: 'ORDER',
         },
         { transaction } // Order.create, Item.findByPk, product.save, OrderItem.bulkCreate 등 모든 데이터 작업에 { transaction } 옵션을 추가하여 동일 트랜잭션 내에서 실행되도록 처리
      )

      let totalOrderPrice = 0

      // 주문 상품 처리
      const orderItemsData = await Promise.all(
         items.map(async (item) => {
            const product = await Item.findByPk(item.itemId, { transaction })
            if (!product) {
               throw new Error(`상품 ID ${item.itemId}가 존재하지 않습니다.`)
            }

            if (product.stockNumber < item.count) {
               throw new Error(`상품 ID ${item.itemId}의 재고가 부족합니다.`)
            }

            // 재고 차감 후 저장
            product.stockNumber -= item.count
            await product.save({ transaction })

            // 주문 총 상품 가격
            const orderItemPrice = product.price * item.count
            totalOrderPrice += orderItemPrice

            return {
               orderId: order.id,
               itemId: product.id,
               orderPrice: orderItemPrice,
               count: item.count,
            }
         })
      )

      // OrderItem 테이블에 데이터 삽입
      await OrderItem.bulkCreate(orderItemsData, { transaction })

      // 트랜잭션 커밋 (완료)
      await transaction.commit()

      res.status(201).json({
         message: '주문이 성공적으로 생성되었습니다.',
         orderId: order.id,
         totalPrice: totalOrderPrice,
      })
   } catch (error) {
      // 트랜잭션 롤백 (실패 시 복구)
      await transaction.rollback()
      console.error(error)
      res.status(500).json({ success: false, message: '주문 중 오류가 발생했습니다.', error })
   }
})

// 주문 목록(페이징) localhost:8000/order/list
router.get('/list', isLoggedIn, async (req, res) => {
   const { page = 1, limit = 10 } = req.query // 페이지와 제한 개수 기본값 설정

   try {
      const offset = (page - 1) * limit

      const orders = await Order.findAndCountAll({
         limit: parseInt(limit),
         offset: parseInt(offset),
         include: [
            {
               model: User,
               attributes: ['id', 'name', 'email'],
            },
            {
               model: OrderItem,
               include: [
                  {
                     model: Item,
                     attributes: ['id', 'itemNm', 'price'],
                  },
               ],
            },
         ],
         order: [['orderDate', 'DESC']],
      })

      res.status(200).json({
         totalOrders: orders.count,
         totalPages: Math.ceil(orders.count / limit),
         currentPage: parseInt(page),
         orders: orders.rows,
      })
   } catch (error) {
      console.error(error)
      res.status(500).json({ error: '서버 오류가 발생했습니다.' })
   }
})

// 주문 취소 localhost:8000/order/cancel/:id
router.post('/cancel/:id', isLoggedIn, async (req, res) => {
   const { orderId } = req.body

   try {
      // 주문 확인
      const order = await Order.findByPk(orderId, {
         include: [{ model: OrderItem, include: [Item] }],
      })

      if (!order) {
         return res.status(404).json({ error: '주문이 존재하지 않습니다.' })
      }

      if (order.orderState === 'CANCEL') {
         return res.status(400).json({ error: '이미 취소된 주문입니다.' })
      }

      // 재고 복구
      for (const orderItem of order.OrderItem) {
         const product = orderItem.Item
         product.stockNumber += orderItem.count
         await product.save()
      }

      // 주문 상태 변경
      order.orderState = 'CANCEL'
      await order.save()

      res.status(200).json({ message: '주문이 성공적으로 취소되었습니다.' })
   } catch (error) {
      console.error(error)
      res.status(500).json({ error: '서버 오류가 발생했습니다.' })
   }
})

// 주문 삭제 localhost:8000/order/delete/:id
router.delete('/delete/:id', isLoggedIn, async (req, res) => {
   const { orderId } = req.body

   try {
      // 주문 확인
      const order = await Order.findByPk(orderId, {
         include: [{ model: OrderItem }],
      })

      if (!order) {
         return res.status(404).json({ error: '주문이 존재하지 않습니다.' })
      }

      // 연관된 OrderItem 삭제
      await OrderItem.destroy({ where: { orderId: order.id } })

      // 주문 삭제
      await Order.destroy({ where: { id: order.id } })

      res.status(200).json({ message: '주문이 성공적으로 삭제되었습니다.' })
   } catch (error) {
      console.error(error)
      res.status(500).json({ error: '서버 오류가 발생했습니다.' })
   }
})

module.exports = router
