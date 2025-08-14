const swaggerJSDoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')

const options = {
   definition: {
      openapi: '3.0.0', // Swagger(OpenAPI) 문서의 버전
      info: {
         title: 'Shopmax API',
         version: '1.0.0',
         description: 'Shopmax API 문서입니다.',
      },
      servers: [
         {
            url: process.env.APP_API_URL, // 실제 서버 주소
         },
      ],
   },
   apis: ['./routes/*.js'], // Swagger 주석이 달린 파일 경로
}

const swaggerSpec = swaggerJSDoc(options)

module.exports = {
   swaggerUi,
   swaggerSpec,
}
