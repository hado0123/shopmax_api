const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { Op, fn, col } = require('sequelize')
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

/**
 * @swagger
 * /item:
 *   post:
 *     summary: 상품 등록
 *     tags: [Item]
 *     consumes:
 *       - multipart/form-data
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               itemNm:
 *                 type: string
 *                 description: 상품명
 *               price:
 *                 type: number
 *                 description: 가격
 *               stockNumber:
 *                 type: integer
 *                 description: 재고
 *               itemDetail:
 *                 type: string
 *                 description: 상품 상세 설명
 *               itemSellStatus:
 *                 type: string
 *                 description: 판매상태(SELL, SOLD_OUT)
 *               img:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: 업로드 이미지 파일 목록(최대 5개)
 *     responses:
 *       201:
 *         description: 상품 등록 성공
 *       400:
 *         description: 파일 업로드 실패
 *       500:
 *         description: 서버 오류
 */
router.post('/', isAdmin, upload.array('img'), async (req, res, next) => {
   try {
      // 업로드된 파일 확인
      if (!req.files) {
         const error = new Error('파일 업로드에 실패했습니다.')
         error.status = 400
         return next(error)
      }

      // 상품(item) insert
      const { itemNm, price, stockNumber, itemDetail, itemSellStatus } = req.body

      const item = await Item.create({
         itemNm,
         price,
         stockNumber,
         itemDetail,
         itemSellStatus,
      })

      // 이미지(img) insert
      /*
         req.files = [file1, file2, file3 ...]

         file1 = {
            originalname: 'dog.png',
            filename: 'dog113232232.png'
            ...
         }
       */
      // imgs 테이블에 insert할 객체 생성
      const images = req.files.map((file) => ({
         oriImgName: file.originalname, // 원본 이미지명
         imgUrl: `/${file.filename}`, //이미지 경로
         repImgYn: 'N', // 기본적으로 'N' 설정
         itemId: item.id, // 생성된 상품 ID 연결
      }))

      // 첫 번째 이미지는 대표 이미지로 설정
      if (images.length > 0) images[0].repImgYn = 'Y'

      // 이미지 여러개 insert
      await Img.bulkCreate(images)

      res.status(201).json({
         success: true,
         message: '상품이 성공적으로 등록되었습니다.',
         item,
         images,
      })
   } catch (error) {
      error.status = 500
      error.message = '상품 등록 중 오류가 발생했습니다.'
      next(error)
   }
})

/**
 * @swagger
 * /item:
 *   get:
 *     summary: 전체 상품 목록 조회 (검색 및 페이징 가능)
 *     tags: [Item]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: 페이지 번호
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: 페이지당 항목 수
 *       - in: query
 *         name: searchTerm
 *         schema:
 *           type: string
 *         description: 검색어
 *       - in: query
 *         name: searchCategory
 *         schema:
 *           type: string
 *         description: 검색 범주 (itemNm, itemDetail)
 *       - in: query
 *         name: sellCategory
 *         schema:
 *           type: string
 *         description: 판매 상태 (SELL, SOLD_OUT)
 *     responses:
 *       200:
 *         description: 상품 목록 조회 성공
 *       500:
 *         description: 서버 오류
 */
router.get('/', async (req, res, next) => {
   try {
      const page = parseInt(req.query.page, 10) || 1
      const limit = parseInt(req.query.limit, 10) || 5
      const offset = (page - 1) * limit

      // 판매상태, 상품명, 상품설명 값 가져오기
      const searchTerm = req.query.searchTerm || '' // 사용자가 입력한 검색어
      const searchCategory = req.query.searchCategory || 'itemNm' // 상품명 or 상품설명으로 검색
      const sellCategory = req.query.sellCategory // 판매상태('SELL' 또는 'SOLD_OUT'만 존재)

      /*
         스프레드 연산자(...)를 사용하는 이유는 조건적으로 객체를 추가하기 위해서
         스프레드 연산자는 "", false, 0, null, undefined 와 같은 falsy값들은 무시하고 
         값이 true 일때만 반환된 객체를 추가
      */
      // 조건부 where 절을 만드는 객체
      const whereClause = {
         // searchTerm이 존재하면 해당 검색어(searchTerm)가 포함된 검색 범주(searchCategory)를 조건으로 추가 => itemDetail like '%가방%'; 혹은 itemNm like '%가방%';
         ...(searchTerm && {
            [searchCategory]: {
               [Op.like]: `%${searchTerm}%`,
            },
         }),
         //sellCategory가 존재하면 itemSellStatus가 해당 판매 상태와 일치하는 항목을 조건으로 추가 => itemSellStatus = 'SOLD_OUT' 혹은 itemSellStatus = 'SELL'
         ...(sellCategory && {
            itemSellStatus: sellCategory,
         }),
      }

      // localhost:8000/item?page=1&limit=3&sellCategory=SOLD_OUT&searchTerm=가방&searchCategory=itemDetail => 품절된 상품 중에서 상품설명 '가방'으로 검색

      /*
         whereClause = {
         itemDetail: {
            [Op.like]: '%가방%'
         },
         {itemSellStatus: 'SOLD_OUT'}
         }
      */

      // 전체 상품 갯수
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
      error.status = 500
      error.message = '전체 상품 리스트를 불러오는 중 오류가 발생했습니다.'
      next(error)
   }
})

/**
 * @swagger
 * /item/{id}:
 *   delete:
 *     summary: 상품 삭제
 *     tags: [Item]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 상품 ID
 *     responses:
 *       200:
 *         description: 상품 삭제 성공
 *       404:
 *         description: 상품을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.delete('/:id', isAdmin, async (req, res, next) => {
   try {
      const id = req.params.id // 상품 id

      // 상품이 존재하는지 확인
      const item = await Item.findByPk(id) // pk 키로 검색

      // 상품이 존재하지 않으면
      if (!item) {
         const error = new Error('상품을 찾을 수 없습니다.')
         error.status = 404
         return next(error)
      }

      // 상품삭제 (연관된 이미지도 삭제된다 - CASCADE 설정)
      await item.destroy()

      res.json({
         success: true,
         message: '상품이 성공적으로 삭제되었습니다.',
      })
   } catch (error) {
      error.status = 500
      error.message = '상품 삭제 중 오류가 발생했습니다.'
      next(error)
   }
})

/**
 * @swagger
 * /item/{id}:
 *   get:
 *     summary: 특정 상품 조회
 *     tags: [Item]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 상품 ID
 *     responses:
 *       200:
 *         description: 상품 조회 성공
 *       404:
 *         description: 상품을 찾을 수 없음
 *       500:
 *         description: 서버 오류
 */
router.get('/:id', async (req, res, next) => {
   try {
      const id = req.params.id

      const item = await Item.findOne({
         where: { id }, // 특정 상품 id로 조회
         include: [
            {
               model: Img, // 연관된 이미지 포함
               attributes: ['id', 'oriImgName', 'imgUrl', 'repImgYn'], //특정 컬럼만 선택
            },
         ],
      })

      if (!item) {
         const error = new Error('해당 상품을 찾을 수 없습니다.')
         error.status = 404
         return next(error)
      }

      res.json({
         success: true,
         message: '상품 조회 성공',
         item,
      })
   } catch (error) {
      error.status = 500
      error.message = '상품을 불러오는 중 오류가 발생했습니다.'
      next(error)
   }
})

/**
 * @swagger
 * /item/{id}:
 *   put:
 *     summary: 상품 수정
 *     tags: [Item]
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: 상품 id
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               itemNm:
 *                 type: string
 *                 description: 상품명
 *               price:
 *                 type: number
 *                 description: 가격
 *               stockNumber:
 *                 type: integer
 *                 description: 재고
 *               itemDetail:
 *                 type: string
 *                 description: 상품 상세 설명
 *               itemSellStatus:
 *                 type: string
 *                 description: 판매상태(SELL, SOLD_OUT)
 *               img:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: 업로드 이미지 파일 목록(최대 5개)
 *     responses:
 *       201:
 *         description: 상품 등록 성공
 *       400:
 *         description: 파일 업로드 실패
 *       500:
 *         description: 서버 오류
 */
router.put('/:id', isAdmin, upload.array('img'), async (req, res, next) => {
   try {
      const id = req.params.id
      const { itemNm, price, stockNumber, itemDetail, itemSellStatus } = req.body

      // 상품이 존재하는지 확인
      const item = await Item.findByPk(id)

      if (!item) {
         const error = new Error('해당 상품을 찾을 수 없습니다.')
         error.status = 404
         return next(error)
      }

      await item.update({
         itemNm,
         price,
         stockNumber,
         itemDetail,
         itemSellStatus,
      })

      // 수정할 이미지가 존재하는 경우
      if (req.files && req.files.length > 0) {
         // 기존 이미지 삭제
         await Img.destroy({ where: { itemId: id } })

         // 새 이미지 추가
         const images = req.files.map((file) => ({
            oriImgName: file.originalname, // 원본 이미지명
            imgUrl: `/${file.filename}`, //이미지 경로
            repImgYn: 'N', // 기본적으로 'N' 설정
            itemId: item.id, // 생성된 상품 ID 연결
         }))

         // 첫 번째 이미지는 대표 이미지로 설정
         if (images.length > 0) images[0].repImgYn = 'Y'

         // 이미지 여러개 insert
         await Img.bulkCreate(images)
      }

      res.json({
         success: true,
         message: '상품과 이미지가 성공적으로 수정되었습니다.',
      })
   } catch (error) {
      error.status = 500
      error.message = '상품 수정 중 오류가 발생했습니다.'
      next(error)
   }
})

router.post('/recommend', async (req, res, next) => {
   try {
      const items = req.body
      const ids = items.map((x) => x.id)
      //  const recommendItems = await Item.findAll({ where: { id: ids } });
      const recommendItems = await Item.findAll({
         where: { id: { [Op.in]: ids } },
         include: [
            {
               model: Img,
               attributes: ['id', 'oriImgName', 'imgUrl', 'repImgYn'],
               where: { repImgYn: 'Y' },
            },
         ],
         order: [[fn('FIELD', col('Item.id'), ...ids), 'ASC']], // id 순서 그대로
         distinct: true, // 중복 로우 방지(조인 시)
      })

      res.json({
         success: true,
         message: '추천 상품 조회 성공',
         recommendItems,
      })
   } catch (error) {
      error.status = 500
      error.message = '추천 상품을 불러오는 중 오류가 발생했습니다.'
      next(error)
   }
})

module.exports = router
