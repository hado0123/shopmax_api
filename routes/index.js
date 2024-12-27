const express = require('express')
const router = express.Router()
const { isLoggedIn } = require('./middlewares')
const { v4: uuidv4 } = require('uuid')
const { Domain } = require('../models')

// 도메인 등록 localhost:8000/domain
router.post('/domain', isLoggedIn, async (req, res, next) => {
   try {
      await Domain.create({
         userId: req.user.id,
         host: req.body.host,
         clientSecret: uuidv4(),
      })

      res.json({
         success: true,
         message: '도메인 등록 완료',
      })
   } catch (err) {
      console.error(err)
      next(err)
   }
})

module.exports = router
