const express = require('express')
const router = express.Router()
const jwt = require('jsonwebtoken')
// const url = require('url')
const { Domain } = require('../models')

const { verifyToken, isLoggedIn } = require('./middlewares')

// 토큰 발급 localhost:3000/token/get
router.get('/get', isLoggedIn, async (req, res) => {
   try {
      const origin = req.get('origin')
      const token = jwt.sign(
         {
            id: req.user.id,
            email: req.user.email,
         },
         process.env.JWT_SECRET,
         {
            expiresIn: '7d', // 30분 = 30m, 1일 = 1d , 기간설정 안할시 평생 토큰 유지
            issuer: 'shopmaxadmin',
         }
      )

      await Domain.create({
         userId: req.user.id,
         host: origin,
         clientToken: token,
      })

      return res.json({
         success: true,
         message: 'API Key가 발급되었습니다',
         token,
      })
   } catch (error) {
      console.error(error)
      return res.status(500).json({
         success: false,
         message: 'API Key 발급 중 에러가 발생했습니다.',
      })
   }
})

// 저장된 토큰 가져오기 localhost:3000/token/read
router.get('/read', isLoggedIn, async (req, res) => {
   try {
      const origin = req.get('origin') // 요청 도메인 가져오기
      const userId = req.user.id // 사용자 ID 가져오기

      // 데이터베이스에서 토큰 조회
      const domainData = await Domain.findOne({
         where: { userId, host: origin },
      })

      // 토큰이 없으면 에러 반환
      if (!domainData) {
         return res.status(404).json({
            success: false,
            message: 'API Key를 찾을 수 없습니다.',
         })
      }

      return res.json({
         success: true,
         message: 'API Key를 가져왔습니다.',
         token: domainData.clientToken,
      })
   } catch (error) {
      console.error(error)
      return res.status(500).json({
         success: false,
         message: 'API Key를 가져오는 중 에러가 발생했습니다.',
      })
   }
})

router.get('/test', verifyToken, (req, res) => {
   res.json(req.decoded)
})

module.exports = router
