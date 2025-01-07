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
      // JWT(Json Web Token)를 생성
      const token = jwt.sign(
         {
            id: req.user.id, // 토큰에 포함할 사용자 ID(나중에 토큰을 통해 가져올수 있음)
            email: req.user.email, // 토큰에 포함할 사용자 이메일(나중에 토큰을 통해 가져올수 있음)
         },
         process.env.JWT_SECRET, // 토큰 서명에 사용할 비밀 키 (환경 변수에서 불러옴)
         {
            expiresIn: '1y', // 토큰 만료 시간 설정: 7일 동안 유효 (예: '30m' = 30분, '1d' = 1일, '1y' = 1년)
            issuer: 'shopmaxadmin', // 토큰 발급자 정보를 설정 (예: 애플리케이션 이름)
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
