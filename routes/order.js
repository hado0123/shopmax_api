const express = require('express')
const router = express.Router()
const { sequelize } = require('../models')
const { Order, Item, User, OrderItem, Img } = require('../models')
const { isLoggedIn, verifyToken } = require('./middlewares')
const { Op } = require('sequelize')

//주문 localhost:8000/order
router.post('/', verifyToken, isLoggedIn, async (req, res) => {
   const { items } = req.body
   // items: [{ itemId: 1, count: 2 }, { itemId: 2, count: 1 }]

   /* ★트랜잭션 처리: 주문 처리 중 에러 발생시 차감된 재고를 복구하지 않으면 데이터가
   불일치 상태가 되므로 트랜잭션 처리 */

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

      /*
         Promise.all(...): 비동기 작업들을 병렬실행(여러작업을 동시 실행)을 통해 성능을 최적화 한다.
         
         각 비동기 작업 async (item) => { .. } 을 병렬로 실행한다.
         아래와 같이 for문을 이용해 처리하는 것은 성능상 효율적이지 X
         다만, 단순하게 findByPk만 한다면 아래와 같이 처리해도 괜찮음
         하지만 상품확인, 재고차감, 재고 update 와 같은 여러가지 일을 처리할 경우
         비동기 + 병렬 처리 방식을 추천

         for(const item of items) {
            const product = await Item.findByPk(item.itemId, { transaction })
            ...
            ...
         }
      */
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
router.get('/list', verifyToken, isLoggedIn, async (req, res) => {
   try {
      const page = parseInt(req.query.page, 10) || 1
      const limit = parseInt(req.query.limit, 10) || 5
      const offset = (page - 1) * limit
      const startDate = req.query.startDate // YYYY-MM-DD 형태
      const endDate = req.query.endDate
      const endDateTime = `${endDate} 23:59:59` // 년월일만 받을 시 시분초는 00:00:00로 오므로 시간 변경

      const count = await Order.count({
         where: {
            userId: req.user.id,
            ...(startDate && endDate ? { createdAt: { [Op.between]: [startDate, endDateTime] } } : {}),
         },
      })

      // 로그인한 사람의 주문 상품 목록 가져오기
      const orders = await Order.findAll({
         where: {
            userId: req.user.id,
            ...(startDate && endDate ? { createdAt: { [Op.between]: [startDate, endDateTime] } } : {}),
         },
         limit: parseInt(limit),
         offset: parseInt(offset),
         include: [
            {
               model: Item,
               attributes: ['id', 'itemNm', 'price'], // 필요한 데이터만 선택
               // 교차테이블 데이터
               through: {
                  attributes: ['count', 'orderPrice'], // OrderItem 테이블에서 필요한 컬럼 선택
               },
               include: [
                  {
                     model: Img,
                     attributes: ['imgUrl'],
                     where: { repImgYn: 'Y' },
                  },
               ],
            },
         ],
         order: [['orderDate', 'DESC']],
      })

      res.status(200).json({
         success: true,
         message: '주문 목록 조회 성공',
         orders,
         pagination: {
            totalOrders: count,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            limit,
         },
      })
   } catch (error) {
      console.error(error)
      res.status(500).json({ error: '주문 내역 조회 중 발생했습니다.' })
   }
})

// 주문 취소 localhost:8000/order/cancel/:id
router.post('/cancel/:id', verifyToken, isLoggedIn, async (req, res) => {
   const { id } = req.params

   try {
      // 주문 확인
      const order = await Order.findByPk(id, {
         include: [{ model: OrderItem, include: [{ model: Item }] }],
      })

      if (!order) {
         return res.status(404).json({ error: '주문이 존재하지 않습니다.' })
      }

      if (order.orderStatus === 'CANCEL') {
         return res.status(400).json({ error: '이미 취소된 주문입니다.' })
      }

      // 재고 복구
      for (const orderItem of order.OrderItems) {
         const product = orderItem.Item
         product.stockNumber += orderItem.count
         await product.save()
      }

      // 주문 상태 변경
      order.orderStatus = 'CANCEL'
      await order.save()

      res.status(200).json({ message: '주문이 성공적으로 취소되었습니다.' })
   } catch (error) {
      console.error(error)
      res.status(500).json({ error: '서버 오류가 발생했습니다.' })
   }
})

// 주문 삭제 localhost:8000/order/delete/:id
router.delete('/delete/:id', verifyToken, isLoggedIn, async (req, res) => {
   const { id } = req.params

   try {
      // 주문 확인
      const order = await Order.findByPk(id, {
         include: [{ model: OrderItem }],
      })

      if (!order) {
         return res.status(404).json({ error: '주문이 존재하지 않습니다.' })
      }

      // 주문 삭제(연관된 OrderItem도 삭제됨 - CASCADE 설정)
      await Order.destroy({ where: { id: order.id } })

      res.status(200).json({ message: '주문이 성공적으로 삭제되었습니다.' })
   } catch (error) {
      console.error(error)
      res.status(500).json({ error: '서버 오류가 발생했습니다.' })
   }
})

// 교차테이블 테스트
router.get('/test', async (req, res) => {
   const order = await Order.findOne({
      where: { id: 9 },
      include: [{ model: Item }], // Order와 연결된 모든 Item 가져오기
   })

   res.json({
      success: true,
      order,
   })
})

module.exports = router
