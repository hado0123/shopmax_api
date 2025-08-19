const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
const { Domain } = require('../models')
const { isAdmin } = require('./middlewares')

// 토큰 발급 http://localhost:8000/token/get
router.get('/get', isAdmin, async (req, res, next) => {
   try {
      const origin = req.get('origin') // http 혹은 https 를 포함한 도메인 주소를 가져온다

      // jwt 토큰 생성
      const token = jwt.sign(
         {
            // 토큰에 포함할 사용자 정보
            id: req.user.id,
            email: req.user.email,
         },
         process.env.JWT_SECRET, // 토큰 서명에 사용할 암호화키
         {
            expiresIn: '365d', // 토큰 만료 시간 설정: 356일(예: '30m' = 30분, '1d' = 1일)
            issuer: 'shopmaxadmin', // 토큰 발급자 정보 설정(예: 애플리케이션 이름)
         }
      )

      await Domain.create({
         userId: req.user.id,
         host: origin,
         clientToken: token,
      })

      res.json({
         success: true,
         message: '토큰이 발급되었습니다.',
         token, // 발급받은 토큰
      })
   } catch (error) {
      error.status = 500
      error.message = '토큰 발급 중 에러가 발생했습니다.'
      next(error)
   }
})

// DB에 저장된 토큰 가져오기 localhost:8000/token/read
router.get('/read', isAdmin, async (req, res, next) => {
   try {
      const origin = req.get('origin')
      const userId = req.user.id

      // 사용자의 아이디와 호스트 주소가 일치하는 레코드 검색
      const domainData = await Domain.findOne({
         where: { userId, host: origin },
      })

      if (!domainData) {
         const error = new Error('토큰을 찾을 수 없습니다.')
         error.status = 404
         return next(error)
      }

      res.json({
         success: true,
         message: '토큰을 가져왔습니다.',
         token: domainData.clientToken, // DB에서 가져온 토큰
      })
   } catch (error) {
      error.status = 500
      error.message = '토큰을 가져오는 중 에러가 발생했습니다.'
      next(error)
   }
})

module.exports = router
