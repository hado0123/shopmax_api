const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
// const cors = require('cors')
// const url = require('url')

// const { verifyToken, apiLimiter } = require('./middlewares')
const { verifyToken, isLoggedIn } = require('./middlewares')
const { Domain, User } = require('../models')

// 등록된 domain만 cors 허용
// router.use(async (req, res, next) => {
//    console.log('cors 시작!')
//    const domain = await Domain.findOne({
//       where: { host: url.parse(req.get('origin')).host },
//    })
//    if (domain) {
//       cors({
//          origin: req.get('origin'),
//          credentials: true,
//       })(req, res, next)
//    } else {
//       next()
//    }
// })

// 토큰 발급 localhost:3000/token/get
router.get('/get', isLoggedIn, async (req, res) => {
   // const { clientSecret } = req.body
   try {
      const domain = await Domain.findOne({
         where: { userId: req.user.id },
         include: {
            model: User,
            attribute: ['email', 'id'],
         },
      })
      if (!domain) {
         return res.status(401).json({
            code: 401,
            message: '등록되지 않은 도메인입니다. 먼저 도메인을 등록하세요',
         })
      }
      const token = jwt.sign(
         {
            id: domain.User.id,
            email: domain.User.email,
         },
         process.env.JWT_SECRET,
         {
            expiresIn: '7d', // 30분 = 30m, 1일 = 1d , 기간설정 안할시 평생 토큰 유지
            issuer: 'shopmaxadmin',
         }
      )
      return res.json({
         success: true,
         message: '토큰이 발급되었습니다',
         token,
      })
   } catch (error) {
      console.error(error)
      return res.status(500).json({
         success: false,
         message: '서버 에러',
      })
   }
})

router.get('/test', verifyToken, (req, res) => {
   res.json(req.decoded)
})

// router.post('/token', apiLimiter, async (req, res) => {
//    const { clientSecret } = req.body
//    try {
//       const domain = await Domain.findOne({
//          where: { clientSecret },
//          include: {
//             model: User,
//             attribute: ['nick', 'id'],
//          },
//       })
//       if (!domain) {
//          return res.status(401).json({
//             code: 401,
//             message: '등록되지 않은 도메인입니다. 먼저 도메인을 등록하세요',
//          })
//       }
//       const token = jwt.sign(
//          {
//             id: domain.User.id,
//             nick: domain.User.nick,
//          },
//          process.env.JWT_SECRET,
//          {
//             expiresIn: '30m', // 30분
//             issuer: 'nodebird',
//          }
//       )
//       return res.json({
//          success: true,
//          message: '토큰이 발급되었습니다',
//          token,
//       })
//    } catch (error) {
//       console.error(error)
//       return res.status(500).json({
//          success: false,
//          message: '서버 에러',
//       })
//    }
// })
module.exports = router
