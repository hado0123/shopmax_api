const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { Op } = require('sequelize')
const { Item, Img } = require('../models')
const { isAdmin, verifyToken } = require('./middlewares')
const router = express.Router()

// uploads 폴더가 없을 경우 새로 생성
try {
   fs.readdirSync('uploads') //해당 폴더가 있는지 확인
} catch (error) {
   console.log('uploads 폴더가 없어 uploads 폴더를 생성합니다.')
   fs.mkdirSync('uploads') //폴더 생성
}

// 이미지 업로드를 위한 multer 설정
const upload = multer({
   // 저장할 위치와 파일명 지정
   storage: multer.diskStorage({
      destination(req, file, cb) {
         cb(null, 'uploads/') // uploads폴더에 저장
      },
      filename(req, file, cb) {
         const decodedFileName = decodeURIComponent(file.originalname) //파일명 디코딩(한글 파일명 깨짐 방지) => 제주도.jpg
         const ext = path.extname(decodedFileName) //확장자 추출
         const basename = path.basename(decodedFileName, ext) //확장자 제거한 파일명 추출

         // 파일명 설정: 기존이름 + 업로드 날짜시간 + 확장자
         // dog.jpg
         // ex) dog + 1231342432443 + .jpg
         cb(null, basename + Date.now() + ext)
      },
   }),
   // 파일의 크기 제한
   limits: { fileSize: 5 * 1024 * 1024 }, // 5MB로 제한
})

//상품 등록 localhost:8000/item
router.post('/', verifyToken, isAdmin, upload.array('img'), async (req, res) => {
   try {
      // 업로드된 파일 확인
      if (!req.files || req.files.length === 0) {
         return res.status(400).json({ success: false, message: '파일 업로드에 실패했습니다.' })
      }

      // 상품 생성
      const { itemNm, price, stockNumber, itemDetail, itemSellStatus } = req.body
      const item = await Item.create({
         itemNm,
         price,
         stockNumber,
         itemDetail,
         itemSellStatus,
      })

      // 이미지 저장
      const images = req.files.map((file) => ({
         oriImgName: file.originalname,
         imgUrl: `/${file.filename}`,
         repImgYn: 'N', // 기본적으로 'N' 설정
         itemId: item.id, // 생성된 상품 ID 연결
      }))

      // 첫 번째 이미지는 대표 이미지로 설정
      if (images.length > 0) {
         images[0].repImgYn = 'Y'
      }

      // 이미지 생성
      await Img.bulkCreate(images)

      res.status(201).json({
         success: true,
         message: '상품과 이미지가 성공적으로 등록되었습니다.',
         item,
         images,
      })
   } catch (error) {
      console.error(error)
      res.status(500).json({ success: false, message: '상품 등록 중 오류가 발생했습니다.', error })
   }
})

//상품 수정 localhost:8000/item/:id
router.put('/:id', verifyToken, isAdmin, upload.array('img'), async (req, res) => {
   try {
      const { id } = req.params
      const { itemNm, price, stockNumber, itemDetail, itemSellStatus } = req.body

      // 상품이 존재하는지 확인
      const item = await Item.findByPk(id)
      if (!item) {
         return res.status(404).json({ success: false, message: '상품을 찾을 수 없습니다.' })
      }

      // 상품 정보 수정
      await item.update({
         itemNm,
         price,
         stockNumber,
         itemDetail,
         itemSellStatus,
      })

      // 이미지 수정
      if (req.files && req.files.length > 0) {
         // 기존 이미지 삭제
         await Img.destroy({ where: { itemId: id } })

         // 새 이미지 추가
         const images = req.files.map((file) => ({
            oriImgName: file.originalname,
            imgUrl: `/${file.filename}`,
            repImgYn: 'N', // 기본적으로 'N' 설정
            itemId: id, // 수정된 상품 ID 연결
         }))

         // 첫 번째 이미지는 대표 이미지로 설정
         if (images.length > 0) {
            images[0].repImgYn = 'Y'
         }

         await Img.bulkCreate(images)
      }

      res.json({
         success: true,
         message: '상품과 이미지가 성공적으로 수정되었습니다.',
      })
   } catch (error) {
      console.error(error)
      res.status(500).json({ success: false, message: '상품 수정 중 오류가 발생했습니다.', error })
   }
})

//상품 삭제 localhost:8000/item/:id
router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
   try {
      const { id } = req.params

      // 상품이 존재하는지 확인
      const item = await Item.findByPk(id)
      if (!item) {
         return res.status(404).json({ success: false, message: '상품을 찾을 수 없습니다.' })
      }

      // 상품 삭제 (연관된 이미지도 삭제됨 - CASCADE 설정)
      await item.destroy()

      res.json({
         success: true,
         message: '상품과 관련 이미지가 성공적으로 삭제되었습니다.',
      })
   } catch (error) {
      console.error(error)
      res.status(500).json({ success: false, message: '상품 삭제 중 오류가 발생했습니다.', error })
   }
})

//특정 상품 불러오기(id로 상품 조회) localhost:8000/item/:id
router.get('/:id', verifyToken, async (req, res) => {
   try {
      const { id } = req.params

      // 상품 조회
      const item = await Item.findOne({
         where: { id }, // 특정 상품 ID로 조회
         include: [
            {
               model: Img, // 연관된 이미지 포함
               attributes: ['id', 'oriImgName', 'imgUrl', 'repImgYn'], // 필요한 속성만 선택
            },
         ],
      })

      if (!item) {
         return res.status(404).json({
            success: false,
            message: '해당 상품을 찾을 수 없습니다.',
         })
      }

      res.json({
         success: true,
         message: '상품 조회 성공',
         item,
      })
   } catch (error) {
      console.error(error)
      res.status(500).json({
         success: false,
         message: '상품 조회 중 오류가 발생했습니다.',
         error,
      })
   }
})

//전체 상품 불러오기(페이징 기능) localhost:8000/item?page=1&limit=3
router.get('/', verifyToken, async (req, res) => {
   try {
      const page = parseInt(req.query.page, 10) || 1
      const limit = parseInt(req.query.limit, 10) || 5
      const offset = (page - 1) * limit
      const searchTerm = req.query.searchTerm || ''
      const searchCategory = req.query.searchCategory || 'itemNm'
      const sellCategory = req.query.sellCategory // 'SELL' 또는 'SOLD_OUT'만 존재

      /*
      앞에 ...(스프레드 연산자)가 붙은 이유는 조건적으로 객체의 속성을 추가하기 위해서.

      1. 조건 && 객체
          => searchTerm이 존재하면 객체를 반환
          => searchTerm이 빈문자열이면 false 또는 "" (falsy 값 자체)를 반환

      2. 스프레드 연산자 (...)
         스프레드 연산자는 "", false, 0, null, undefined(falsy 값) 무시
         조건이 참일 때 반환된 객체를 상위 객체에 펼쳐서 추가

     => 결론: 스프레드 연산자는 빈문자열을 무시하기 때문에 searchTerm이 빈문자열이면 
              whereClause에 searchTerm 객체는 추가되지 않음
      */

      // 조건부 where 절을 구성하기 위한 객체
      const whereClause = {
         // searchTerm이 존재하면, 해당 검색어(searchTerm)가 포함된 검색 범주(searchCategory)를 조건으로 추가
         ...(searchTerm && {
            [searchCategory]: {
               [Op.like]: `%${searchTerm}%`, // SQL LIKE 연산자를 사용하여 검색어와 일치하는 항목 검색
            },
         }),
         // sellCategory가 존재하면, itemSellStatus가 해당 판매 상태(sellCategory)와 일치하는 항목을 조건으로 추가
         ...(sellCategory && {
            itemSellStatus: sellCategory,
         }),
      }

      const count = await Item.count({
         where: whereClause,
      })

      const items = await Item.findAll({
         where: whereClause,
         limit,
         offset,
         order: [['createdAt', 'DESC']],
         include: [
            {
               model: Img,
               attributes: ['id', 'oriImgName', 'imgUrl', 'repImgYn'],
            },
         ],
      })

      res.json({
         success: true,
         message: '상품 목록 조회 성공',
         items,
         pagination: {
            totalItems: count,
            totalPages: Math.ceil(count / limit),
            currentPage: page,
            limit,
         },
      })
   } catch (error) {
      console.error(error)
      res.status(500).json({
         success: false,
         message: '상품 목록 조회 중 오류가 발생했습니다.',
         error,
      })
   }
})

module.exports = router
