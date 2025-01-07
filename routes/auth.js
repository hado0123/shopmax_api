const express = require('express')
const passport = require('passport')
const bcrypt = require('bcrypt')
const { isLoggedIn, isNotLoggedIn } = require('./middlewares')
const User = require('../models/user')

const router = express.Router()

//회원가입 localhost:8000/auth/join
router.post('/join', isNotLoggedIn, async (req, res, next) => {
   const { email, name, address, password } = req.body
   try {
      //이메일로 기존 사용자 검색
      // select * from users where email = ?
      const exUser = await User.findOne({ where: { email } })

      if (exUser) {
         //이미 사용자가 존재할 경우 409 상태코드와 메세지를 json객체로 응답하면서 함수를 끝냄
         return res.status(409).json({
            success: false,
            message: '이미 존재하는 사용자입니다.',
         })
      }

      // 이메일 중복 확인을 통과시 새로운 사용자 계정 생성

      //비밀번호 암호화
      const hash = await bcrypt.hash(password, 12) // 12: salt(해시 암호화를 진행시 추가되는 임의의 데이터로 10~12 정도의 값이 권장)

      //새로운 사용자 생성
      const newUser = await User.create({
         email,
         name,
         password: hash,
         role: 'USER',
         address,
      })

      // 성공 응답 반환
      res.status(201).json({
         success: true,
         message: '사용자가 성공적으로 등록되었습니다.',
         user: {
            id: newUser.id,
            // email: newUser.email,
            name: newUser.name,
            role: newUser.role,
         },
      })
   } catch (error) {
      //try문 어딘가에서 에러가 발생하면 500상태 코드와 json 객체 응답
      console.error(error)
      res.status(500).json({
         success: false,
         message: '회원가입 중 오류가 발생했습니다.',
         error,
      })
   }
})

//로그인 localhost:8000/auth/login
router.post('/login', isNotLoggedIn, async (req, res, next) => {
   passport.authenticate('local', (authError, user, info) => {
      if (authError) {
         //로그인 인증 중 에러 발생시
         return res.status(500).json({ success: false, message: '인증 중 오류 발생', error: authError })
      }

      if (!user) {
         //비밀번호 불일치 또는 사용자가 없을 경우 info.message를 사용해서 메세지 전달
         return res.status(401).json({
            success: false,
            message: info.message || '로그인 실패',
         })
      }

      // 인증이 정상적으로 되고 사용자를 로그인 상태로 바꿈
      req.login(user, (loginError) => {
         if (loginError) {
            //로그인 상태로 바꾸는 중 오류 발생시
            return res.status(500).json({ success: false, message: '로그인 중 오류 발생', error: loginError })
         }

         //로그인 성공시 user객체와 함께 response
         //status code를 주지 않으면 기본값은 200(성공)
         res.json({
            success: true,
            message: '로그인 성공',
            user: {
               id: user.id,
               // email: user.email,
               name: user.name,
               role: user.role,
            },
         })
      })
   })(req, res, next)
})

//로그아웃 localhost:8000/auth/logout
router.get('/logout', isLoggedIn, async (req, res, next) => {
   //사용자를 로그아웃 상태로 바꿈
   req.logout((err) => {
      if (err) {
         //로그아웃 상태로 바꾸는 중 에러가 났을때
         console.log(err)

         return res.status(500).json({
            success: false,
            message: '로그아웃 중 오류가 발생했습니다.',
            error: err,
         })
      }

      //로그아웃 성공시 세션에 저장되어 있던 사용자 id를 삭제해주고 아래와 같은 결과를 response
      //status code를 주지 않으면 기본값은 200(성공)
      res.json({
         success: true,
         message: '로그아웃에 성공했습니다.',
      })
   })
})

//로그인 상태 확인 localhost:8000/auth/status
router.get('/status', async (req, res, next) => {
   if (req.isAuthenticated()) {
      //로그인이 되었을때
      // req.user는 passport의 역직렬화 설정에 의해 로그인 되었을때 로그인 한 user 정보를 가져올 수 있다
      res.json({
         isAuthenticated: true,
         user: {
            id: req.user.id,
            // email: req.user.email,
            name: req.user.name,
            role: req.user.role,
            // address: req.user.address,
         },
      })
   } else {
      //로그인이 되지 않았을때
      res.json({
         isAuthenticated: false,
      })
   }
})

module.exports = router
