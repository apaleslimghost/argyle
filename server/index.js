const express = require('express')
const SSE = require('express-sse')
const bodyParser = require('body-parser')
const util = require('util')
const { WebClient } = require('@slack/web-api')

const sse = new SSE([])
const slack = new WebClient(process.env.SLACK_BOT_TOKEN)
const app = express()

app.use(express.static('client'))
app.use('/common', express.static('common'))

app.get('/events', (req, res, next) => { res.flush = () => {}; next() }, sse.init)

app.post('/webhook', bodyParser.json(), async (req, res) => {
	switch(req.body.type) {
		case `url_verification`: {
			const { challenge } = req.body
			res.send(challenge)
			break
		}

		case `event_callback`: {
			switch(req.body.event.type) {
				case `message`: {
					const { user } = await slack.users.info({ user: req.body.event.user })
					sse.send({ ...req.body.event, user })
					break
				}

				default: {
					console.log(req.body)
					res.status(401).send()
				}
			}
		}

		default: {
			console.log(req.body)
			res.status(201).send()
		}
	}
})

app.listen(3030, () => console.log(`listening on http://localhost:3030`))
