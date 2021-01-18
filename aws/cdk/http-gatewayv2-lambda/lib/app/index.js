const proxy = require('express-http-proxy')
const express = require('express')
const app = express()
const port = 3000

app.use(proxy('httpbin.org'))

module.exports = app
// app.listen(port, () => {
//   console.log(`Example app listening at http://localhost:${port}`)
// })