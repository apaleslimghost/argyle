const express = require('express')
const SSE = require('express-sse')
const bodyParser = require('body-parser')

const sse = new SSE([])

const app = express()

app.use(express.static('client'))
app.use('/common', express.static('common'))

app.get('/events', (req, res, next) => { res.flush = () => {}; next() }, sse.init)

app.post('/webhook', bodyParser.urlencoded(), (req, res) => {
	const { user_name, text, timestamp } = req.body
	sse.send({ user_name, text, timestamp })
	res.status(201).send()
})

app.listen(3030, () => console.log(`listening on http://localhost:3030`))
