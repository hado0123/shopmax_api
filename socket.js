const { Server } = require('socket.io')
const passport = require('passport')

module.exports = (server, sessionMiddleware) => {
   const io = new Server(server, {
      cors: {
         origin: process.env.FRONTEND_APP_URL,
         methods: ['GET', 'POST'],
         credentials: true,
      },
   })

   // Socket.IO에서 Express 세션 미들웨어 사용
   io.use((socket, next) => {
      sessionMiddleware(socket.request, {}, next)
   })

   // Passport 역직렬화 호출 추가
   io.use((socket, next) => {
      if (socket.request.session?.passport?.user) {
         passport.deserializeUser(socket.request.session.passport.user, (err, user) => {
            if (err) return next(err)
            socket.request.user = user // 역직렬화된 사용자 정보 저장
            next()
         })
      } else {
         console.log('비인증 사용자 연결 시도')
         return socket.disconnect() // 인증되지 않은 사용자 연결 해제
      }
   })

   // Socket.IO 이벤트 처리
   io.on('connection', (socket) => {
      const user = socket.request.user // 역직렬화된 사용자 정보

      console.log('사용자 연결됨:', user?.id)

      socket.on('user info', (msg) => {
         if (msg) {
            socket.emit('user info', user)
         }
      })

      // 클라이언트로 사용자 정보 전송
      // socket.emit('user info', user) // 클라이언트에게 사용자 정보를 전송

      socket.on('chat message', (msg) => {
         // console.log(`메시지: ${msg}, 보낸 사용자: ${user?.name}`)
         io.emit('chat message', { user: user?.name, message: msg })
      })

      socket.on('disconnect', () => {
         console.log('사용자 연결 해제:', user?.id)
      })
   })

   return io
}
