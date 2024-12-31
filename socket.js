const { Server } = require('socket.io')
const passport = require('passport')

module.exports = (server, sessionMiddleware) => {
   // Socket.IO 서버 생성
   const io = new Server(server, {
      /*
         소켓(Socket.IO)에서 별도로 CORS 설정. Socket.IO와 Express의 CORS 처리 방식이 다르기 때문. 
         Express에서 설정한 CORS는 일반 HTTP 요청에만 적용되며, 웹소켓(WebSocket) 통신에는 별도로 설정이 필요.
      */
      cors: {
         origin: process.env.FRONTEND_APP_URL, // 클라이언트의 URL을 허용
         methods: ['GET', 'POST'], // 허용된 HTTP 메서드, 다른 메서드(예: PUT, DELETE, PATCH)로 요청을 보내면 브라우저가 이를 차단. 예: 클라이언트가 의도치 않게 DELETE 요청을 보내 데이터가 삭제되는 상황을 방지.
         credentials: true, // 세션 사용을 위해 인증 정보(쿠키 등)를 허용
      },
   })

   // 소켓의 연결(connection 이벤트)이 발생하기 직전에 실행되는 미들웨어
   io.use((socket, next) => {
      // Express의 세션 미들웨어를 Socket.IO에서 사용할 수 있도록 설정
      sessionMiddleware(socket.request, {}, next)
   })

   // 소켓의 연결(connection 이벤트)이 발생하기 직전에 실행되는 미들웨어
   // Passport의 역직렬화 호출 추가
   io.use((socket, next) => {
      // socket.request.session.passport.user에 저장된 사용자 ID 확인
      if (socket.request.session?.passport?.user) {
         // Passport의 역직렬화 호출
         passport.deserializeUser(socket.request.session.passport.user, (err, user) => {
            if (err) return next(err) // 에러 발생 시 처리
            socket.request.user = user // 역직렬화된 사용자 정보를 Socket 요청 객체에 저장
            next() // 다음 미들웨어로 진행
         })
      } else {
         console.log('비인증 사용자 연결 시도') // 인증되지 않은 사용자 로그
         return socket.disconnect() // 인증되지 않은 사용자 연결 해제
      }
   })

   // Socket.IO 이벤트 처리
   io.on('connection', (socket) => {
      // 역직렬화된 사용자 정보 가져오기
      const user = socket.request.user

      console.log('사용자 연결됨:', user?.id) // 연결된 사용자의 ID 출력

      // socket.emit('test info', '테스트입니다') 그냥 전송

      // 클라이언트에서 'user info' 이벤트 요청 시 사용자 정보 전송
      socket.on('user info', (msg) => {
         //msg = 'requestUserInfo'
         if (msg) {
            socket.emit('user info', user) // 클라이언트로 사용자 정보 전송
         }
      })

      // 클라이언트에서 'chat message' 이벤트 발생 시 모든 클라이언트에 메시지 전송
      socket.on('chat message', (msg) => {
         // console.log(`메시지: ${msg}, 보낸 사용자: ${user?.name}`);
         io.emit('chat message', { user: user?.name, message: msg }) // 모든 클라이언트에게 메시지와 사용자 이름 전송
      })

      // 사용자가 연결 해제될 때 처리
      socket.on('disconnect', () => {
         console.log('사용자 연결 해제:', user?.id) // 연결 해제된 사용자의 ID 출력
      })
   })

   return io // Socket.IO 인스턴스 반환
}
