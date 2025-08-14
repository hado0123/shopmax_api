const express = require('express')
const bcrypt = require('bcrypt')
const passport = require('passport')
const User = require('../models/user')
const { isLoggedIn, isNotLoggedIn } = require('./middlewares')

const router = express.Router()

/**
 * @swagger
 * /auth/join:
 *   post:
 *     summary: 사용자 회원가입
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - name
 *               - address
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 description: 이메일
 *               name:
 *                 type: string
 *                 description: 이름
 *               address:
 *                 type: string
 *                 description: 주소
 *               password:
 *                 type: string
 *                 description: 비밀번호
 *     responses:
 *       201:
 *         description: 회원가입 성공
 *       409:
 *         description: 이미 존재하는 사용자
 *       500:
 *         description: 서버 오류
 */
router.post('/join', isNotLoggedIn, async (req, res, next) => {
   try {
      const { email, name, address, password } = req.body

      // 이메일로 기존 사용자 검색
      // select * from users where email = ? LIMIT 1;
      const exUser = await User.findOne({
         where: { email },
      })

      // 이미 사용자가 존재할 경우 409 상태코드와 메세지를 json 객체로 전달
      if (exUser) {
         const error = new Error('이미 존재하는 사용자입니다.')
         error.status = 409 // Conflict
         return next(error) // 에러 미들웨어로 이동
      }

      // 이메일 중복 확인을 통과시 새로운 사용자 계정 생성

      // 비밀번호 암호화
      const hash = await bcrypt.hash(password, 12) // 12: salt(해시 암호화를 진행시 추가되는 임의의 데이터 주로 10 ~ 12 정도의 값이 권장됨)

      // 새로운 사용자 생성
      const newUser = await User.create({
         email,
         name,
         password: hash,
         role: 'USER',
         address,
      })

      res.status(201).json({
         success: true,
         message: '사용자가 성공적으로 등록되었습니다.',
         user: {
            id: newUser.id,
            name: newUser.name,
            role: newUser.role,
         },
      })
   } catch (error) {
      // 에러발생시 미들웨어로 전달
      error.status = 500
      error.message = '회원가입 중 오류가 발생했습니다.'
      next(error)
   }
})

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: 사용자 로그인
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 description: 이메일
 *               password:
 *                 type: string
 *                 description: 비밀번호
 *     responses:
 *       200:
 *         description: 로그인 성공
 *       401:
 *         description: 인증 실패
 *       500:
 *         description: 서버 오류
 */
router.post('/login', isNotLoggedIn, async (req, res, next) => {
   passport.authenticate('local', (authError, user, info) => {
      if (authError) {
         // 로그인 인증 중 에러 발생시
         authError.status = 500
         authError.message = '인증 중 오류 발생'
         return next(authError) // 에러 미들웨어로 전달
      }

      if (!user) {
         // 비밀번호 불일치 or 사용자가 없을 경우 info.message를 사용해서 메세지 전달
         // 401: unauthorized, 로그인 과정에서 인증이 안된경우 사용
         const error = new Error(info.message || '로그인 실패')
         error.status = 401 // Unauthorized
         return next(error) // 에러 미들웨어로 전달
      }

      // 인증이 정상적으로 되고 사용자를 로그인 상태로 바꿈
      req.login(user, (loginError) => {
         if (loginError) {
            // 로그인 상태로 바꾸는 중 오류 발생시
            loginError.status = 500
            loginError.message = '로그인 중 오류 발생'
            return next(loginError)
         }

         // 로그인 성공시 user객체와 함께 response
         // status code를 주지 않으면 기본값은 200(성공)
         res.json({
            success: true,
            message: '로그인 성공',
            user: {
               id: user.id,
               name: user.name,
               role: user.role,
            },
         })
      })
   })(req, res, next)
})

/**
 * @swagger
 * /auth/logout:
 *   get:
 *     summary: 사용자 로그아웃
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: 로그아웃 성공
 *       500:
 *         description: 로그아웃 오류
 */
router.get('/logout', isLoggedIn, async (req, res, next) => {
   req.logout((logoutError) => {
      if (logoutError) {
         // 로그아웃 상태로 바꾸는 중 에러 발생시
         logoutError.status = 500
         logoutError.message = '로그아웃 중 오류 발생'
         return next(logoutError)
      }

      // 로그아웃 성공시 세션에 저장되어있던 사용자 id는 삭제된다
      // 로그아웃 성공시 response
      res.json({
         success: true,
         message: '로그아웃에 성공했습니다.',
      })
   })
})

/**
 * @swagger
 * /auth/status:
 *   get:
 *     summary: 로그인 상태 확인
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: 로그인 여부 및 사용자 정보
 *       500:
 *         description: 서버 오류
 */
router.get('/status', async (req, res, next) => {
   try {
      if (req.isAuthenticated()) {
         // 로그인이 되었을때
         // req.user는 passport의 역직렬화 설정에 의해 로그인 되었을때 로그인 한 user 정보를 가져온다
         res.status(200).json({
            isAuthenticated: true,
            user: {
               id: req.user.id,
               name: req.user.name,
               role: req.user.role,
               // email: req.user.email,
               // address: req.user.address,
            },
         })
      } else {
         // 로그인이 되지 않았을때
         res.status(200).json({
            isAuthenticated: false,
         })
      }
   } catch (error) {
      error.status = 500
      error.message = '로그인 상태확인 중 오류가 발생했습니다.'
      next(error)
   }
})

module.exports = router
