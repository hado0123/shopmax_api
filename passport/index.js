const passport = require('passport')
const local = require('./localStrategy')
const User = require('../models/user')

module.exports = () => {
   //직렬화(serializeUser): 로그인 성공 후 사용자 정보를 세션에 저장
   passport.serializeUser((user, done) => {
      // user: 사용자 정보가 저장되어 있는 객체
      done(null, user.id) //사용자 id(pk값)를 세션에 저장(세션 용량 절약을 위해 id만 저장)
   })

   //역직렬화(deserializeUser): 클라이언트에게 request가 올때 마다 세션에 저장된 사용자 id를 바탕으로 사용자 정보를 조회
   passport.deserializeUser((id, done) => {
      //response 해주고 싶은 사용자 정보를 작성
      // select * from users where id = ?
      User.findOne({
         where: { id },
      }) //id는 직렬화에서 저장한user.id
         .then((user) => done(null, user)) // 가져온 사용자 객체 정보를 반환
         .catch((err) => done(err)) //에러 발생시 에러 반환
   })

   local() //localStrategy.js 파일의 함수를 실행해 Passport에 local을 추가
}
