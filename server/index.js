const express = require('express')
const SSE = require('express-sse')

const sse = new SSE([Date.now()])

const app = express()

app.use(express.static('client'))
app.use('/common', express.static('common'))

app.get('/events', (req, res, next) => { res.flush = () => {}; next() }, sse.init)

setInterval(() => {
	sse.send(Date.now())
}, 1000)

app.listen(3030, () => console.log(`listening on http://localhost:3030`))
