const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { Item, Img } = require('../models')
const { isAdmin } = require('./middlewares')
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
router.post('/', isAdmin, upload.array('img'), async (req, res) => {
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
router.put('/:id', isAdmin, upload.array('img'), async (req, res) => {
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

      res.status(200).json({
         success: true,
         message: '상품과 이미지가 성공적으로 수정되었습니다.',
      })
   } catch (error) {
      console.error(error)
      res.status(500).json({ success: false, message: '상품 수정 중 오류가 발생했습니다.', error })
   }
})

//상품 삭제 localhost:8000/item/:id
router.delete('/:id', isAdmin, async (req, res) => {
   try {
      const { id } = req.params

      // 상품이 존재하는지 확인
      const item = await Item.findByPk(id)
      if (!item) {
         return res.status(404).json({ success: false, message: '상품을 찾을 수 없습니다.' })
      }

      // 상품 삭제 (연관된 이미지도 삭제됨 - CASCADE 설정)
      await item.destroy()

      res.status(200).json({
         success: true,
         message: '상품과 관련 이미지가 성공적으로 삭제되었습니다.',
      })
   } catch (error) {
      console.error(error)
      res.status(500).json({ success: false, message: '상품 삭제 중 오류가 발생했습니다.', error })
   }
})

//특정 상품 불러오기(id로 상품 조회) localhost:8000/item/:id
router.get('/:id', async (req, res) => {
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

      res.status(200).json({
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
router.get('/', async (req, res) => {
   try {
      // 요청으로부터 page와 limit 값을 가져오기 (기본값 설정)
      const page = parseInt(req.query.page, 10) || 1 // 기본 페이지: 1
      const limit = parseInt(req.query.limit, 10) || 10 // 기본 한 페이지에 표시할 항목 수: 10
      const offset = (page - 1) * limit // 시작 위치 계산

      const count = await Item.count()

      // 상품과 연관된 이미지 포함하여 페이징 처리
      const items = await Item.findAll({
         limit, // 한 번에 가져올 상품 수
         offset, // 시작 위치
         order: [['createdAt', 'DESC']], // 최신 상품이 먼저 나오도록 정렬
         include: [
            {
               model: Img,
               attributes: ['id', 'oriImgName', 'imgUrl', 'repImgYn'], // 이미지 속성 선택
            },
         ],
      })

      // 응답 데이터 생성
      res.status(200).json({
         success: true,
         message: '상품 목록 조회 성공',
         items,
         pagination: {
            totalItems: count, // 총 상품 수
            totalPages: Math.ceil(count / limit), // 총 페이지 수
            currentPage: page, // 현재 페이지
            limit, // 페이지당 상품 수
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
