// socket.js
const { Server } = require('socket.io')

module.exports = (server) => {
   // 간단한 챗봇 응답 로직
   const chatbotResponses = {
      hello: '안녕하세요! 무엇을 도와드릴까요?',
      help: '다음 중 하나를 입력해 보세요: hello, bye, help',
      bye: '안녕히 가세요!',
   }

   const io = new Server(server, {
      cors: {
         origin: process.env.FRONTEND_APP_URL,
         methods: ['GET', 'POST'],
      },
   })

   // 클라이언트 연결 이벤트 처리
   io.on('connection', (socket) => {
      console.log('사용자 연결됨:', socket.id)

      // 클라이언트로부터 메시지 수신
      socket.on('chat message', (msg) => {
         console.log('메시지 받음:', msg)

         // 모든 클라이언트에게 메시지 전송
         //  io.emit('chat message', msg)

         // 챗봇 응답 생성
         const response = chatbotResponses[msg.toLowerCase()] || '죄송합니다, 이해하지 못했어요.'
         io.emit('chat message', `챗봇: ${response}`) // 챗봇 응답 보내기
      })

      // 클라이언트 연결 해제 이벤트
      socket.on('disconnect', () => {
         console.log('사용자 연결 해제됨:', socket.id)
      })
   })

   return io
}
